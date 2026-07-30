const db = require('../database')
const { dialog, app } = require('electron')
const fs = require('fs')
const path = require('path')

let currentUser = null

module.exports = (ipcMain) => {

  ipcMain.handle('settings:login', (_, data) => {
    const user = db.prepare('SELECT * FROM users WHERE username=? AND password=? AND is_active=1')
      .get(data.username, data.password)
    if (!user) return { success: false, message: 'Invalid credentials' }
    currentUser = user
    return { success: true, user: { ...user, password: undefined } }
  })

  ipcMain.handle('settings:getCurrentUser', () => {
    if (!currentUser) return null
    return { ...currentUser, password: undefined }
  })

  ipcMain.handle('settings:logout', () => {
    currentUser = null
    return { success: true }
  })

  ipcMain.handle('settings:getUsers', () =>
    db.prepare('SELECT id,username,full_name,role,branch_id,rights,is_active,created_at FROM users ORDER BY full_name').all()
  )

  ipcMain.handle('settings:createUser', (_, data) => {
    const r = db.prepare(`INSERT INTO users (username,password,full_name,role,branch_id,rights) VALUES (?,?,?,?,?,?)`)
      .run(data.username, data.password, data.full_name, data.role||'cashier',
           data.branch_id||1, JSON.stringify(data.rights||{}))
    return { id: r.lastInsertRowid, success: true }
  })

  ipcMain.handle('settings:updateUser', (_, data) => {
    if (data.password) {
      db.prepare(`UPDATE users SET username=?,password=?,full_name=?,role=?,branch_id=?,rights=?,is_active=? WHERE id=?`)
        .run(data.username, data.password, data.full_name, data.role||'cashier',
             data.branch_id||1, JSON.stringify(data.rights||{}), data.is_active??1, data.id)
    } else {
      db.prepare(`UPDATE users SET username=?,full_name=?,role=?,branch_id=?,rights=?,is_active=? WHERE id=?`)
        .run(data.username, data.full_name, data.role||'cashier',
             data.branch_id||1, JSON.stringify(data.rights||{}), data.is_active??1, data.id)
    }
    return { success: true }
  })

  ipcMain.handle('settings:deleteUser', (_, id) => {
    db.prepare('UPDATE users SET is_active=0 WHERE id=?').run(id)
    return { success: true }
  })

  ipcMain.handle('settings:getBranches', () =>
    db.prepare('SELECT * FROM branches WHERE is_active=1 ORDER BY name').all()
  )

  ipcMain.handle('settings:createBranch', (_, data) => {
    const r = db.prepare(`INSERT INTO branches (name,address,phone) VALUES (?,?,?)`)
      .run(data.name, data.address||null, data.phone||null)
    return { id: r.lastInsertRowid, success: true }
  })

  ipcMain.handle('settings:updateBranch', (_, data) => {
    db.prepare(`UPDATE branches SET name=?,address=?,phone=? WHERE id=?`)
      .run(data.name, data.address||null, data.phone||null, data.id)
    return { success: true }
  })

  ipcMain.handle('settings:getCompanyInfo', () =>
    db.prepare('SELECT * FROM company WHERE id=1').get()
  )

  ipcMain.handle('settings:saveCompanyInfo', (_, data) => {
    db.prepare(`UPDATE company SET name=?,address=?,phone=?,email=?,ntn=?,currency=?,tax_rate=?,updated_at=datetime('now') WHERE id=1`)
      .run(data.name, data.address||null, data.phone||null, data.email||null,
           data.ntn||null, data.currency||'PKR', data.tax_rate||0)
    return { success: true }
  })

  // ─── BACKUP & RESTORE SYSTEM ──────────────────────────────────────────

  // Get database info
  ipcMain.handle('settings:getBackupInfo', () => {
    try {
      const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
      const dbDir = isDev
        ? path.join(__dirname, '../../data')
        : path.join(app.getPath('userData'), 'data')
      const dbPath = path.join(dbDir, 'medisoft.db')
      const backupDir = path.join(dbDir, 'backups')

      const dbSize = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0
      const backupCount = fs.existsSync(backupDir) 
        ? fs.readdirSync(backupDir).filter(f => f.endsWith('.db')).length 
        : 0

      return {
        databaseSize: dbSize,
        databasePath: dbPath,
        backupDirectory: backupDir,
        autoBackupCount: backupCount
      }
    } catch (err) {
      console.error('Get backup info failed:', err)
      return null
    }
  })

  // Create manual backup - user chooses location
  ipcMain.handle('settings:createManualBackup', async () => {
    try {
      const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
      const dbDir = isDev
        ? path.join(__dirname, '../../data')
        : path.join(app.getPath('userData'), 'data')
      const dbPath = path.join(dbDir, 'medisoft.db')

      if (!fs.existsSync(dbPath)) {
        return { success: false, message: 'Database file not found!' }
      }

      // Ask user where to save
      const { filePath, canceled } = await dialog.showSaveDialog({
        title: 'Save Database Backup',
        defaultPath: `medisoft_backup_${new Date().toISOString().slice(0,10)}.db`,
        filters: [{ name: 'Database Backup', extensions: ['db'] }],
        properties: ['createDirectory', 'showOverwriteConfirmation']
      })

      if (canceled || !filePath) {
        return { success: false, message: 'Backup canceled by user' }
      }

      // Checkpoint WAL to ensure all data is in main db file
      db.pragma('wal_checkpoint(FULL)')

      // Copy database file
      fs.copyFileSync(dbPath, filePath)

      const fileSize = fs.statSync(filePath).size
      
      return { 
        success: true, 
        message: `Backup created successfully!\n\nLocation: ${filePath}\nSize: ${(fileSize / 1024 / 1024).toFixed(2)} MB`,
        path: filePath,
        size: fileSize
      }
    } catch (err) {
      console.error('Manual backup failed:', err)
      return { success: false, message: `Backup failed: ${err.message}` }
    }
  })

  // Restore from backup
  ipcMain.handle('settings:restoreBackup', async () => {
    try {
      // Ask user to select backup file
      const { filePaths, canceled } = await dialog.showOpenDialog({
        title: 'Select Backup File to Restore',
        filters: [{ name: 'Database Backup', extensions: ['db'] }],
        properties: ['openFile']
      })

      if (canceled || !filePaths || filePaths.length === 0) {
        return { success: false, message: 'Restore canceled by user' }
      }

      const backupPath = filePaths[0]
      
      if (!fs.existsSync(backupPath)) {
        return { success: false, message: 'Backup file not found!' }
      }

      const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
      const dbDir = isDev
        ? path.join(__dirname, '../../data')
        : path.join(app.getPath('userData'), 'data')
      const dbPath = path.join(dbDir, 'medisoft.db')
      const backupDir = path.join(dbDir, 'backups')

      // Create safety backup first
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true })
      }
      
      const safetyBackup = path.join(backupDir, `pre_restore_backup_${Date.now()}.db`)
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, safetyBackup)
      }

      // Restore backup
      fs.copyFileSync(backupPath, dbPath)

      return { 
        success: true, 
        message: 'Database restored successfully!\n\nPlease restart the application for changes to take effect.\n\nA safety backup was created in the backups folder.',
        needsRestart: true,
        safetyBackupPath: safetyBackup
      }
    } catch (err) {
      console.error('Restore failed:', err)
      return { success: false, message: `Restore failed: ${err.message}` }
    }
  })

  // Open backup folder in explorer
  ipcMain.handle('settings:openBackupFolder', () => {
    try {
      const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
      const dbDir = isDev
        ? path.join(__dirname, '../../data')
        : path.join(app.getPath('userData'), 'data')
      const backupDir = path.join(dbDir, 'backups')

      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true })
      }

      const { shell } = require('electron')
      shell.openPath(backupDir)
      
      return { success: true }
    } catch (err) {
      console.error('Open folder failed:', err)
      return { success: false, message: err.message }
    }
  })
}
