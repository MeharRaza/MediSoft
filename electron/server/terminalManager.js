const fs = require('fs');
const path = require('path');
const lanServer = require('./lanServer');

let configFilePath = null;
let currentConfig = null;

const DEFAULT_CONFIG = {
  mode: 'standalone', // 'standalone' (default & backward-compatible), 'server', or 'cashier'
  serverPort: 8088,
  serverIp: '127.0.0.1',
  counterName: 'Main Counter',
  licenseKey: '', // Required on Cashier PC to authenticate with Server Hub
  pairingPin: '849201',
  pairedTerminals: []
};

function getConfigPath(app) {
  if (!configFilePath) {
    const userData = app.getPath('userData');
    configFilePath = path.join(userData, 'terminal_config.json');
  }
  return configFilePath;
}

function getActiveLicenseKey(app) {
  try {
    const licPath = path.join(app.getPath('userData'), 'medisoft_license.dat');
    if (fs.existsSync(licPath)) {
      const rec = JSON.parse(fs.readFileSync(licPath, 'utf8'));
      const token = typeof rec.token === 'string' ? JSON.parse(rec.token) : rec.token;
      return token?.key || null;
    }
  } catch (e) {}
  return null;
}

function loadConfig(app) {
  if (currentConfig) return currentConfig;
  const p = getConfigPath(app);
  if (fs.existsSync(p)) {
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      currentConfig = { ...DEFAULT_CONFIG, ...data };
      return currentConfig;
    } catch (err) {
      console.warn('[TerminalManager] Failed to read config, using default:', err.message);
    }
  }
  currentConfig = { ...DEFAULT_CONFIG };
  saveConfig(app, currentConfig);
  return currentConfig;
}

function saveConfig(app, newConfig) {
  const p = getConfigPath(app);
  try {
    currentConfig = { ...DEFAULT_CONFIG, ...newConfig };
    fs.writeFileSync(p, JSON.stringify(currentConfig, null, 2), 'utf8');
    return { success: true, config: currentConfig };
  } catch (err) {
    console.error('[TerminalManager] Failed to save config:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Register Terminal Management IPC handlers and initialize mode.
 */
function registerTerminalIPC(ipcMain, app, ipcHandlersMap = {}) {
  const cfg = loadConfig(app);
  const activeKey = getActiveLicenseKey(app);

  // Auto-start LAN server if configured in server mode
  if (cfg.mode === 'server') {
    lanServer.startLanServer({
      port: cfg.serverPort || 8088,
      licenseKey: activeKey,
      ipcHandlers: ipcHandlersMap
    });
  }

  // 1. Get Terminal Configuration & LAN Status
  ipcMain.handle('terminal:getStatus', () => {
    const config = loadConfig(app);
    const localIp = lanServer.getLocalIpAddress();
    const serverKey = getActiveLicenseKey(app);
    return {
      mode: config.mode,
      serverIp: config.serverIp,
      serverPort: config.serverPort,
      localIp,
      counterName: config.counterName,
      licenseKey: config.licenseKey || '',
      serverLicenseKey: serverKey,
      isServerRunning: config.mode === 'server'
    };
  });

  // 2. Save Configuration & Switch Mode
  ipcMain.handle('terminal:saveConfig', (_, newConfig) => {
    const res = saveConfig(app, newConfig);
    if (!res.success) return res;

    // Handle Server lifecycle
    if (newConfig.mode === 'server') {
      const serverKey = getActiveLicenseKey(app);
      lanServer.startLanServer({
        port: newConfig.serverPort || 8088,
        licenseKey: serverKey,
        ipcHandlers: ipcHandlersMap
      });
    } else {
      lanServer.stopLanServer();
    }

    return { success: true, config: currentConfig };
  });

  // 3. Get Machine Local IP
  ipcMain.handle('terminal:getLocalIp', () => {
    return lanServer.getLocalIpAddress();
  });
}

module.exports = {
  registerTerminalIPC,
  loadConfig,
  saveConfig
};
