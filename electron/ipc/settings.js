const db = require('../database')
const { dialog, app } = require('electron')
const fs = require('fs')
const path = require('path')

let currentUser = null

function getActiveLicense() {
  try {
    const licPath = path.join(app.getPath('userData'), 'medisoft_license.dat')
    if (fs.existsSync(licPath)) {
      const rec = JSON.parse(fs.readFileSync(licPath, 'utf8'))
      return typeof rec.token === 'string' ? JSON.parse(rec.token) : rec.token
    }
  } catch (e) {}
  return null
}

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
    try {
      if (!data.username || !data.username.trim()) {
        return { success: false, message: 'Username is required.' }
      }
      if (!data.password || !data.password.trim()) {
        return { success: false, message: 'Password is required for new users.' }
      }

      const role = (data.role || 'cashier').toLowerCase()

      // Enforce Plan Limits for Cashier Creation
      if (role === 'cashier') {
        const lic = getActiveLicense()
        const plan = (lic?.plan || 'basic').toLowerCase()
        const isBasic = plan.includes('basic') || plan.includes('starter') || plan.includes('single')
        if (isBasic) {
          return {
            success: false,
            message: 'Your current plan (Basic / Starter) does not allow creating cashier users. Please upgrade to Store Pro.'
          }
        }

        const countRow = db.prepare("SELECT COUNT(*) as count FROM users WHERE LOWER(role) = 'cashier' AND is_active = 1").get()
        const activeCashiers = countRow ? countRow.count : 0
        const maxCashiers = plan.includes('enterprise') ? 9 : 2

        if (activeCashiers >= maxCashiers) {
          return {
            success: false,
            message: `Plan Limit Reached: Store Pro permits a maximum of ${maxCashiers} Cashier accounts (${activeCashiers} currently active). Upgrade to Enterprise to add more counters.`
          }
        }
      }

      // Check for duplicate username
      const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(data.username.trim())
      if (existing) {
        return { success: false, message: `Username "${data.username.trim()}" is already taken. Please choose another.` }
      }

      const r = db.prepare(`INSERT INTO users (username,password,full_name,role,branch_id,rights) VALUES (?,?,?,?,?,?)`)
        .run(data.username.trim(), data.password, data.full_name || data.username.trim(), data.role || 'cashier',
             data.branch_id || 1, JSON.stringify(data.rights || {}))

      if (db.logActivity) {
        db.logActivity('USER_CREATED', `New user "${data.username.trim()}" (${data.role || 'cashier'}) created by admin`, { role: 'admin' })
      }

      return { id: r.lastInsertRowid, success: true }
    } catch (err) {
      return { success: false, message: err.message }
    }
  })

  ipcMain.handle('settings:changeCredentials', (_, data) => {
    try {
      const { userId, currentPassword, newUsername, newPassword, newFullName } = data || {}
      const targetId = userId || currentUser?.id
      if (!targetId) {
        return { success: false, message: 'User not identified.' }
      }

      const user = db.prepare('SELECT * FROM users WHERE id=?').get(targetId)
      if (!user) {
        return { success: false, message: 'User not found.' }
      }

      if (currentPassword && user.password !== currentPassword) {
        return { success: false, message: 'Current password does not match.' }
      }

      if (newUsername && newUsername.trim() !== user.username) {
        const existing = db.prepare('SELECT id FROM users WHERE username=? AND id!=?').get(newUsername.trim(), targetId)
        if (existing) {
          return { success: false, message: 'Username is already in use. Please choose another.' }
        }
      }

      const updatedUsername = newUsername && newUsername.trim() ? newUsername.trim() : user.username
      const updatedPassword = newPassword && newPassword.trim() ? newPassword.trim() : user.password
      const updatedFullName = newFullName && newFullName.trim() ? newFullName.trim() : user.full_name

      db.prepare('UPDATE users SET username=?, password=?, full_name=? WHERE id=?')
        .run(updatedUsername, updatedPassword, updatedFullName, targetId)

      if (currentUser && currentUser.id === targetId) {
        currentUser.username = updatedUsername
        currentUser.full_name = updatedFullName
        currentUser.password = updatedPassword
      }

      return {
        success: true,
        message: 'Credentials updated successfully!',
        user: { id: targetId, username: updatedUsername, full_name: updatedFullName, role: user.role }
      }
    } catch (e) {
      return { success: false, message: e.message }
    }
  })

  ipcMain.handle('settings:updateUser', (_, data) => {
    try {
      const existingUser = db.prepare('SELECT * FROM users WHERE id=?').get(data.id)
      if (!existingUser) return { success: false, message: 'User not found.' }

      const role = (data.role || 'cashier').toLowerCase()
      // If promoting or changing role to cashier, check plan limit
      if (role === 'cashier' && existingUser.role.toLowerCase() !== 'cashier') {
        const lic = getActiveLicense()
        const plan = (lic?.plan || 'basic').toLowerCase()
        const isBasic = plan.includes('basic') || plan.includes('starter') || plan.includes('single')
        if (isBasic) {
          return { success: false, message: 'Your current plan does not allow cashier roles. Upgrade to Store Pro.' }
        }
        const countRow = db.prepare("SELECT COUNT(*) as count FROM users WHERE LOWER(role) = 'cashier' AND is_active = 1").get()
        const activeCashiers = countRow ? countRow.count : 0
        const maxCashiers = plan.includes('enterprise') ? 9 : 2
        if (activeCashiers >= maxCashiers) {
          return { success: false, message: `Plan Limit Reached: Store Pro permits a maximum of ${maxCashiers} Cashier accounts.` }
        }
      }

      if (data.username && data.username.trim() !== existingUser.username) {
        const dup = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?').get(data.username.trim(), data.id)
        if (dup) return { success: false, message: `Username "${data.username.trim()}" is already taken.` }
      }

      if (data.password) {
        db.prepare(`UPDATE users SET username=?,password=?,full_name=?,role=?,branch_id=?,rights=?,is_active=? WHERE id=?`)
          .run(data.username.trim(), data.password, data.full_name, data.role||'cashier',
               data.branch_id||1, JSON.stringify(data.rights||{}), data.is_active??1, data.id)
      } else {
        db.prepare(`UPDATE users SET username=?,full_name=?,role=?,branch_id=?,rights=?,is_active=? WHERE id=?`)
          .run(data.username.trim(), data.full_name, data.role||'cashier',
               data.branch_id||1, JSON.stringify(data.rights||{}), data.is_active??1, data.id)
      }

      if (db.logActivity) {
        db.logActivity('USER_UPDATED', `User "${data.username.trim()}" updated`, { role: 'admin' })
      }

      return { success: true }
    } catch (err) {
      return { success: false, message: err.message }
    }
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

    // Synchronize company info into invoice_settings table
    try {
      db.prepare(`
        UPDATE invoice_settings 
        SET store_name = ?, 
            address = COALESCE(?, address), 
            phone = COALESCE(?, phone), 
            updated_at = datetime('now', 'localtime') 
        WHERE id = 1
      `).run(data.name, data.address || null, data.phone || null)
    } catch (e) {}

    if (db.logActivity) {
      db.logActivity('SETTINGS_UPDATED', `Company settings updated: "${data.name}" (Phone: ${data.phone || 'N/A'})`, { role: 'admin' })
    }

    return { success: true }
  })

  // ─── INVOICE / THERMAL RECEIPT SETTINGS ──────────────────────────────
  ipcMain.handle('settings:getInvoiceSettings', () => {
    try {
      // Ensure table exists
      db.exec(`
        CREATE TABLE IF NOT EXISTS invoice_settings (
          id INTEGER PRIMARY KEY DEFAULT 1,
          store_name TEXT DEFAULT 'Harmain Medical Store',
          tagline TEXT DEFAULT '',
          address TEXT DEFAULT 'Opposite Nadra Kiosk Main Bazar Raiwind',
          phone TEXT DEFAULT '03228684603',
          paper_width TEXT DEFAULT '80mm',
          header_font_size REAL DEFAULT 19,
          address_font_size REAL DEFAULT 13.5,
          meta_font_size REAL DEFAULT 12.5,
          item_font_size REAL DEFAULT 12.5,
          total_font_size REAL DEFAULT 13,
          net_total_font_size REAL DEFAULT 16,
          footer_font_size REAL DEFAULT 10,
          footer_terms TEXT DEFAULT 'LOOSE ITEMS, VACCINES, INHALERS AND FRIDGE ITEMS WILL NOT BE RETURNED.',
          thank_you_msg TEXT DEFAULT 'Thank You For Your Visit!',
          show_discount_col INTEGER DEFAULT 0,
          show_customer_name INTEGER DEFAULT 1,
          updated_at TEXT DEFAULT (datetime('now', 'localtime'))
        );
        INSERT OR IGNORE INTO invoice_settings (id, store_name, address, phone)
        VALUES (1, 'Harmain Medical Store', 'Opposite Nadra Kiosik Main Bazar Raiwind', '03228684603');
      `)

      // Ensure bold columns exist
      const boldCols = [
        'header_bold', 'tagline_bold', 'address_bold', 'phone_bold',
        'meta_bold', 'table_header_bold', 'item_bold', 'total_bold',
        'net_total_bold', 'footer_terms_bold', 'thank_you_bold'
      ]
      for (const col of boldCols) {
        try {
          db.prepare(`ALTER TABLE invoice_settings ADD COLUMN ${col} INTEGER DEFAULT 0`).run()
        } catch (e) {}
      }

      const row = db.prepare('SELECT * FROM invoice_settings WHERE id = 1').get()
      if (row) {
        return {
          ...row,
          header_font_size: Number(row.header_font_size) || 19,
          address_font_size: Number(row.address_font_size) || 13.5,
          meta_font_size: Number(row.meta_font_size) || 12.5,
          item_font_size: Number(row.item_font_size) || 12.5,
          total_font_size: Number(row.total_font_size) || 13,
          net_total_font_size: Number(row.net_total_font_size) || 16,
          footer_font_size: Number(row.footer_font_size) || 10,
          header_bold: row.header_bold ? 1 : 0,
          tagline_bold: row.tagline_bold ? 1 : 0,
          address_bold: row.address_bold ? 1 : 0,
          phone_bold: row.phone_bold ? 1 : 0,
          meta_bold: row.meta_bold ? 1 : 0,
          table_header_bold: row.table_header_bold ? 1 : 0,
          item_bold: row.item_bold ? 1 : 0,
          total_bold: row.total_bold ? 1 : 0,
          net_total_bold: row.net_total_bold ? 1 : 0,
          footer_terms_bold: row.footer_terms_bold ? 1 : 0,
          thank_you_bold: row.thank_you_bold ? 1 : 0
        }
      }

      const comp = db.prepare('SELECT * FROM company WHERE id = 1').get()
      return {
        id: 1,
        store_name: comp?.name || 'Harmain Medical Store',
        tagline: '',
        address: comp?.address || 'Opposite Nadra Kiosik Main Bazar Raiwind',
        phone: comp?.phone || '03228684603',
        paper_width: '80mm',
        header_font_size: 19,
        address_font_size: 13.5,
        meta_font_size: 12.5,
        item_font_size: 12.5,
        total_font_size: 13,
        net_total_font_size: 16,
        footer_font_size: 10,
        footer_terms: 'LOOSE ITEMS, VACCINES, INHALERS AND FRIDGE ITEMS WILL NOT BE RETURNED.',
        thank_you_msg: 'Thank You For Your Visit!',
        show_discount_col: 0,
        show_customer_name: 1,
        header_bold: 0,
        tagline_bold: 0,
        address_bold: 0,
        phone_bold: 0,
        meta_bold: 0,
        table_header_bold: 0,
        item_bold: 0,
        total_bold: 0,
        net_total_bold: 1,
        footer_terms_bold: 0,
        thank_you_bold: 0
      }
    } catch (err) {
      console.error('[Settings] getInvoiceSettings error:', err)
      return null
    }
  })

  ipcMain.handle('settings:saveInvoiceSettings', (_, data) => {
    try {
      // Ensure bold columns exist
      const boldCols = [
        'header_bold', 'tagline_bold', 'address_bold', 'phone_bold',
        'meta_bold', 'table_header_bold', 'item_bold', 'total_bold',
        'net_total_bold', 'footer_terms_bold', 'thank_you_bold'
      ]
      for (const col of boldCols) {
        try {
          db.prepare(`ALTER TABLE invoice_settings ADD COLUMN ${col} INTEGER DEFAULT 0`).run()
        } catch (e) {}
      }

      db.prepare(`
        INSERT INTO invoice_settings (
          id, store_name, tagline, address, phone, paper_width,
          header_font_size, address_font_size, meta_font_size, item_font_size, total_font_size, net_total_font_size, footer_font_size,
          footer_terms, thank_you_msg, show_discount_col, show_customer_name,
          header_bold, tagline_bold, address_bold, phone_bold, meta_bold, table_header_bold,
          item_bold, total_bold, net_total_bold, footer_terms_bold, thank_you_bold,
          updated_at
        ) VALUES (
          1, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          datetime('now', 'localtime')
        )
        ON CONFLICT(id) DO UPDATE SET
          store_name = excluded.store_name,
          tagline = excluded.tagline,
          address = excluded.address,
          phone = excluded.phone,
          paper_width = excluded.paper_width,
          header_font_size = excluded.header_font_size,
          address_font_size = excluded.address_font_size,
          meta_font_size = excluded.meta_font_size,
          item_font_size = excluded.item_font_size,
          total_font_size = excluded.total_font_size,
          net_total_font_size = excluded.net_total_font_size,
          footer_font_size = excluded.footer_font_size,
          footer_terms = excluded.footer_terms,
          thank_you_msg = excluded.thank_you_msg,
          show_discount_col = excluded.show_discount_col,
          show_customer_name = excluded.show_customer_name,
          header_bold = excluded.header_bold,
          tagline_bold = excluded.tagline_bold,
          address_bold = excluded.address_bold,
          phone_bold = excluded.phone_bold,
          meta_bold = excluded.meta_bold,
          table_header_bold = excluded.table_header_bold,
          item_bold = excluded.item_bold,
          total_bold = excluded.total_bold,
          net_total_bold = excluded.net_total_bold,
          footer_terms_bold = excluded.footer_terms_bold,
          thank_you_bold = excluded.thank_you_bold,
          updated_at = datetime('now', 'localtime')
      `).run(
        data.store_name || 'Harmain Medical Store',
        data.tagline || '',
        data.address || '',
        data.phone || '',
        data.paper_width || '80mm',
        Number(data.header_font_size) || 19,
        Number(data.address_font_size) || 13.5,
        Number(data.meta_font_size) || 12.5,
        Number(data.item_font_size) || 12.5,
        Number(data.total_font_size) || 13,
        Number(data.net_total_font_size) || 16,
        Number(data.footer_font_size) || 10,
        data.footer_terms ?? 'LOOSE ITEMS, VACCINES, INHALERS AND FRIDGE ITEMS WILL NOT BE RETURNED.',
        data.thank_you_msg ?? 'Thank You For Your Visit!',
        data.show_discount_col ? 1 : 0,
        data.show_customer_name ? 1 : 0,
        data.header_bold ? 1 : 0,
        data.tagline_bold ? 1 : 0,
        data.address_bold ? 1 : 0,
        data.phone_bold ? 1 : 0,
        data.meta_bold ? 1 : 0,
        data.table_header_bold ? 1 : 0,
        data.item_bold ? 1 : 0,
        data.total_bold ? 1 : 0,
        data.net_total_bold ? 1 : 0,
        data.footer_terms_bold ? 1 : 0,
        data.thank_you_bold ? 1 : 0
      )

      // Keep company table name, address, phone in sync
      if (data.store_name) {
        db.prepare(`UPDATE company SET name=?, address=?, phone=?, updated_at=datetime('now') WHERE id=1`)
          .run(data.store_name, data.address || '', data.phone || '')
      }

      if (db.logActivity) {
        db.logActivity('SETTINGS_UPDATED', `Invoice settings updated: "${data.store_name}" (Paper width: ${data.paper_width || '80mm'})`, { role: 'admin' })
      }

      return { success: true }
    } catch (err) {
      console.error('[Settings] saveInvoiceSettings error:', err)
      return { success: false, error: err.message }
    }
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
