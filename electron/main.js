const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const { autoUpdater } = require('electron-updater')

const isDev = process.env.NODE_ENV === 'development'

let mainWindow

// ─── VERSION COMPARISON ──────────────────────────────────────────────────────
/**
 * Compare two semver versions
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1, v2) {
  const parts1 = v1.replace(/^v/, '').split('.').map(Number)
  const parts2 = v2.replace(/^v/, '').split('.').map(Number)
  
  for (let i = 0; i < 3; i++) {
    const p1 = parts1[i] || 0
    const p2 = parts2[i] || 0
    if (p1 > p2) return 1
    if (p1 < p2) return -1
  }
  return 0
}

// ─── AUTO UPDATER CONFIG ────────────────────────────────────────────────────
function setupAutoUpdater() {
  if (isDev) return // Don't check updates in dev mode

  // Disable auto download — we'll ask user first
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowDowngrade = false // Don't show updates for older versions
  autoUpdater.allowPrerelease = false // Only stable releases

  // Check for updates every 30 minutes
  setInterval(() => { autoUpdater.checkForUpdates() }, 30 * 60 * 1000)

  // Also check on startup (after 10 seconds to ensure app is fully loaded)
  setTimeout(() => { 
    console.log('[Updater] Checking for updates... Current version:', app.getVersion())
    autoUpdater.checkForUpdates() 
  }, 10000)

  // ── Events ──

  autoUpdater.on('checking-for-update', () => {
    sendToWindow('update:status', { status: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    const currentVersion = app.getVersion()
    
    // Compare versions properly
    console.log(`[Updater] Current version: ${currentVersion}`)
    console.log(`[Updater] Available version: ${info.version}`)
    
    // Skip if we're already on this version or newer
    if (compareVersions(currentVersion, info.version) >= 0) {
      console.log('[Updater] Already on latest version, skipping')
      sendToWindow('update:status', { status: 'up-to-date' })
      return
    }

    sendToWindow('update:available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    })

    // Show native dialog asking user
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available — MediSoft Pro',
      message: `New version ${info.version} is available!`,
      detail: `Current: v${currentVersion}\nNew: v${info.version}\n\nDownload now?`,
      buttons: ['Download Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.downloadUpdate()
        sendToWindow('update:status', { status: 'downloading', version: info.version })
      }
    })
  })

  autoUpdater.on('update-not-available', (info) => {
    console.log('[Updater] No update available. Current version:', app.getVersion())
    sendToWindow('update:status', { status: 'up-to-date' })
  })

  autoUpdater.on('download-progress', (progress) => {
    sendToWindow('update:progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
      speed: progress.bytesPerSecond,
    })
    // Update taskbar progress
    if (mainWindow) mainWindow.setProgressBar(progress.percent / 100)
  })

  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) mainWindow.setProgressBar(-1)
    sendToWindow('update:downloaded', { version: info.version })

    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready — MediSoft Pro',
      message: `v${info.version} downloaded successfully!`,
      detail: 'The application will now restart to install the update.\n\nAll your data is safe and will be preserved.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    }).then(({ response }) => {
      if (response === 0) {
        // Force quit all windows first
        const allWindows = BrowserWindow.getAllWindows()
        allWindows.forEach(win => {
          if (win && !win.isDestroyed()) {
            win.removeAllListeners('close')
          }
        })
        
        // Set flag to force install
        autoUpdater.quitAndInstall(false, true)
      }
    })
  })

  autoUpdater.on('error', (err) => {
    sendToWindow('update:error', { message: err.message })
    if (mainWindow) mainWindow.setProgressBar(-1)
    console.error('[Updater] Error:', err.message)
  })
}

// IPC handlers for manual update check from UI
function setupUpdaterIPC() {
  ipcMain.handle('updater:check', () => {
    if (isDev) return { status: 'dev-mode' }
    autoUpdater.checkForUpdates()
    return { status: 'checking' }
  })

  ipcMain.handle('updater:download', () => {
    autoUpdater.downloadUpdate()
    return { status: 'downloading' }
  })

  ipcMain.handle('updater:install', () => {
    // Force quit and install with immediate restart
    const allWindows = BrowserWindow.getAllWindows()
    allWindows.forEach(win => {
      if (win && !win.isDestroyed()) {
        win.removeAllListeners('close')
      }
    })
    autoUpdater.quitAndInstall(false, true)
  })

  ipcMain.handle('updater:getVersion', () => ({
    current: app.getVersion(),
  }))
}

function sendToWindow(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
}

// ─── WINDOW ──────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      cache: !isDev, // Disable cache in development
    },
    show: false,
    title: 'MediSoft Pro',
  })

  if (isDev) {
    // Disable cache in development
    mainWindow.webContents.session.clearCache()
    mainWindow.loadURL('http://localhost:5173')
    // Open DevTools in bottom dock (not detached)
    mainWindow.webContents.openDevTools({ mode: 'bottom' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.maximize()
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

// ─── APP READY ───────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  // Log application version
  console.log('========================================')
  console.log(`[MediSoft] Starting MediSoft Pro v${app.getVersion()}`)
  console.log(`[MediSoft] Node: ${process.versions.node}`)
  console.log(`[MediSoft] Electron: ${process.versions.electron}`)
  console.log(`[MediSoft] Platform: ${process.platform}`)
  console.log('========================================')

  // Register all IPC handlers
  try {
    require('./ipc/sales')(ipcMain)
    require('./ipc/purchase')(ipcMain)
    require('./ipc/inventory')(ipcMain)
    require('./ipc/accounts')(ipcMain)
    require('./ipc/hrm')(ipcMain)
    require('./ipc/reports')(ipcMain)
    require('./ipc/settings')(ipcMain)
    require('./ipc/fix-pcs')(ipcMain)
    setupUpdaterIPC()
    console.log('[MediSoft] All IPC handlers registered.')
  } catch (err) {
    console.error('[MediSoft] IPC registration error:', err)
  }

  createWindow()
  // setupAutoUpdater() // Disabled: No update server running

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

process.on('uncaughtException', (err) => {
  console.error('[MediSoft] Uncaught exception:', err)
})
