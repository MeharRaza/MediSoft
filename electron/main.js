const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

function logDebug(msg) {
  try {
    const logPath = path.join(app.getPath('userData'), 'main_debug.log')
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`)
  } catch (e) {}
}

logDebug('Main process script evaluated')

let autoUpdater = null
function getAutoUpdater() {
  if (!autoUpdater) {
    try {
      const eu = require('electron-updater')
      autoUpdater = eu.autoUpdater
    } catch (err) {
      console.warn('[Updater] Could not load electron-updater:', err.message)
    }
  }
  return autoUpdater
}

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

  const updater = getAutoUpdater()
  if (!updater) return

  // Disable auto download — we'll ask user first
  updater.autoDownload = false
  updater.autoInstallOnAppQuit = true
  updater.allowDowngrade = false // Don't show updates for older versions
  updater.allowPrerelease = false // Only stable releases

  // Check for updates every 30 minutes
  setInterval(() => { updater.checkForUpdates() }, 30 * 60 * 1000)

  // Also check on startup (after 10 seconds to ensure app is fully loaded)
  setTimeout(() => { 
    console.log('[Updater] Checking for updates... Current version:', app.getVersion())
    updater.checkForUpdates() 
  }, 10000)

  // ── Events ──

  updater.on('checking-for-update', () => {
    sendToWindow('update:status', { status: 'checking' })
  })

  updater.on('update-available', (info) => {
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
        updater.downloadUpdate()
        sendToWindow('update:status', { status: 'downloading', version: info.version })
      }
    })
  })

  updater.on('update-not-available', (info) => {
    console.log('[Updater] No update available. Current version:', app.getVersion())
    sendToWindow('update:status', { status: 'up-to-date' })
  })

  updater.on('download-progress', (progress) => {
    sendToWindow('update:progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
      speed: progress.bytesPerSecond,
    })
    // Update taskbar progress
    if (mainWindow) mainWindow.setProgressBar(progress.percent / 100)
  })

  updater.on('update-downloaded', (info) => {
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
        updater.quitAndInstall(false, true)
      }
    })
  })

  updater.on('error', (err) => {
    sendToWindow('update:error', { message: err.message })
    if (mainWindow) mainWindow.setProgressBar(-1)
    console.error('[Updater] Error:', err.message)
  })
}

// IPC handlers for manual update check from UI
function setupUpdaterIPC() {
  ipcMain.handle('updater:check', () => {
    if (isDev) return { status: 'dev-mode' }
    const updater = getAutoUpdater()
    if (updater) updater.checkForUpdates()
    return { status: 'checking' }
  })

  ipcMain.handle('updater:download', () => {
    const updater = getAutoUpdater()
    if (updater) updater.downloadUpdate()
    return { status: 'downloading' }
  })

  ipcMain.handle('updater:install', () => {
    const updater = getAutoUpdater()
    if (!updater) return
    // Force quit and install with immediate restart
    const allWindows = BrowserWindow.getAllWindows()
    allWindows.forEach(win => {
      if (win && !win.isDestroyed()) {
        win.removeAllListeners('close')
      }
    })
    updater.quitAndInstall(false, true)
  })

  ipcMain.handle('updater:getVersion', () => ({
    current: app.getVersion(),
  }))
  
  // No print handlers - using browser native print only
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

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    logDebug(`[Renderer] ${message} (${sourceId}:${line})`)
  })
  mainWindow.webContents.on('did-fail-load', (e, errorCode, errorDescription) => {
    logDebug(`did-fail-load: ${errorCode} - ${errorDescription}`)
  })
  mainWindow.webContents.on('render-process-gone', (e, details) => {
    logDebug(`render-process-gone: ${JSON.stringify(details)}`)
  })
  mainWindow.on('close', () => {
    logDebug('mainWindow close event fired')
  })

  mainWindow.once('ready-to-show', () => {
    logDebug('mainWindow ready-to-show fired')
    mainWindow.show()
    mainWindow.maximize()
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

// ─── APP READY ───────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  logDebug('app.whenReady fired')
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
    require('./ipc/expenses')(ipcMain)
    require('./ipc/settings')(ipcMain)
    require('./ipc/fix-pcs')(ipcMain)
    require('./ipc/license')(ipcMain, app)
    setupUpdaterIPC()
    logDebug('All IPC handlers registered successfully')
    console.log('[MediSoft] All IPC handlers registered.')
  } catch (err) {
    logDebug('IPC registration error: ' + (err.stack || err))
    console.error('[MediSoft] IPC registration error:', err)
  }

  try {
    createWindow()
    logDebug('createWindow called successfully')
  } catch (err) {
    logDebug('createWindow error: ' + (err.stack || err))
  }
  // setupAutoUpdater() // Disabled: No update server running

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}).catch(err => {
  logDebug('app.whenReady error: ' + (err.stack || err))
})

app.on('before-quit', (e) => {
  logDebug('app before-quit fired')
})
app.on('will-quit', (e) => {
  logDebug('app will-quit fired')
})
app.on('quit', (e, exitCode) => {
  logDebug('app quit fired with exit code ' + exitCode)
})

app.on('window-all-closed', () => {
  logDebug('window-all-closed fired')
  if (process.platform !== 'darwin') app.quit()
})

process.on('uncaughtException', (err) => {
  logDebug('uncaughtException: ' + (err.stack || err))
  console.error('[MediSoft] Uncaught exception:', err)
})
