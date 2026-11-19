const http = require('http');
const os = require('os');
const crypto = require('crypto');
const db = require('../database');

let serverInstance = null;
let sseClients = [];
let serverSecret = null;
let activeServerLicenseKey = null;
let pairedCashiers = new Map(); // terminalId -> { id, name, ip, pairedAt, lastSeen }
let maxCashiersAllowed = 2; // Plan 2 / Store Pro limit: Max 2 Cashier Terminals

/**
 * Returns the primary local IPv4 address of this machine on the local network.
 */
function getAllNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  const results = [];
  for (const name of Object.keys(interfaces)) {
    const isVirtual = /virtual|vmware|vbox|vethernet|hyper-v|loopback/i.test(name);
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (iface.address.startsWith('169.254.') || iface.address.startsWith('192.168.56.')) continue;
        const isWifi = /wi-?fi|wlan/i.test(name);
        const isEthernet = /ethernet|local area/i.test(name) && !isVirtual;
        results.push({
          name,
          address: iface.address,
          type: isWifi ? 'Wi-Fi' : isEthernet ? 'Ethernet LAN' : (isVirtual ? 'Virtual' : 'Network'),
          isVirtual,
          isWifi
        });
      }
    }
  }
  results.sort((a, b) => {
    if (a.isVirtual !== b.isVirtual) return a.isVirtual ? 1 : -1;
    if (a.isWifi !== b.isWifi) return a.isWifi ? -1 : 1;
    return 0;
  });
  return results;
}

function getLocalIpAddress() {
  const all = getAllNetworkInterfaces();
  return all[0] ? all[0].address : '127.0.0.1';
}

/**
 * Generates or retrieves HMAC secret for signing cashier session tokens.
 */
function getSecret() {
  if (!serverSecret) {
    serverSecret = crypto.randomBytes(32).toString('hex');
  }
  return serverSecret;
}

/**
 * Generates a signed session token for an authenticated user.
 */
function generateToken(user) {
  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    rights: user.rights,
    exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  };
  const dataStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', getSecret()).update(dataStr).digest('base64url');
  return `${dataStr}.${signature}`;
}

/**
 * Validates a session token.
 */
function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [dataStr, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', getSecret()).update(dataStr).digest('base64url');
  if (signature !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(dataStr, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

/**
 * Broadcasts an event to all connected cashier SSE clients.
 */
function broadcast(eventType, data) {
  if (sseClients.length === 0) return;
  const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.res.write(message);
    } catch (e) {}
  });
}

/**
 * Parse JSON body from request.
 */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Start the Local LAN Hub HTTP server.
 */
function startLanServer({ port = 8088, storeName = 'MediSoft Pharmacy', ipcHandlers = {}, licenseKey = null }) {
  if (serverInstance) {
    if (licenseKey) activeServerLicenseKey = licenseKey.trim().toUpperCase();
    return { success: true, alreadyRunning: true, ip: getLocalIpAddress(), port };
  }

  activeServerLicenseKey = licenseKey ? licenseKey.trim().toUpperCase() : null;

  serverInstance = http.createServer(async (req, res) => {
    // Enable CORS for LAN terminals
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-License-Key');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    // Terminal Authorization Check: Verify Store Pro License Key
    if (activeServerLicenseKey) {
      const incomingKey = (
        req.headers['x-license-key'] ||
        url.searchParams.get('key') ||
        ''
      ).trim().toUpperCase();

      if (incomingKey !== activeServerLicenseKey) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'UNAUTHORIZED_TERMINAL',
          message: 'Access Denied: Terminal is not paired with this pharmacy Server. Invalid or missing Store Pro License Key.'
        }));
        return;
      }
    }

    // 1. Health & Discovery Endpoint with Counter Limit Check
    if (pathname === '/api/lan/health' && req.method === 'GET') {
      const clientIp = req.socket.remoteAddress ? req.socket.remoteAddress.replace(/^.*:/, '') : '127.0.0.1';
      const terminalId = (req.headers['x-terminal-id'] || url.searchParams.get('id') || clientIp).trim();
      const terminalName = (req.headers['x-terminal-name'] || url.searchParams.get('name') || 'Cash Counter').trim();

      const isLoopback = clientIp === '127.0.0.1' || clientIp === 'localhost';

      if (!isLoopback) {
        if (!pairedCashiers.has(terminalId)) {
          if (pairedCashiers.size >= maxCashiersAllowed) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              status: 'error',
              error: 'COUNTER_LIMIT_REACHED',
              message: `Counter limit reached: Store Pro allows a maximum of ${maxCashiersAllowed} Cashier Terminals (3 counters total). Please unpair an old terminal or upgrade to Enterprise to connect more counters.`,
              maxAllowed: maxCashiersAllowed,
              activeCount: pairedCashiers.size
            }));
            return;
          }
          // Register newly paired cashier counter
          pairedCashiers.set(terminalId, {
            id: terminalId,
            name: terminalName,
            ip: clientIp,
            pairedAt: new Date().toISOString(),
            lastSeen: new Date().toISOString()
          });
          console.log(`[LanServer] ✓ Paired new cashier counter ${pairedCashiers.size}/${maxCashiersAllowed}: "${terminalName}" (${clientIp})`);
        } else {
          // Update last seen
          const existing = pairedCashiers.get(terminalId);
          existing.lastSeen = new Date().toISOString();
          if (terminalName) existing.name = terminalName;
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        serverName: os.hostname(),
        ip: getLocalIpAddress(),
        interfaces: getAllNetworkInterfaces(),
        port,
        storeName,
        serverTime: new Date().toISOString(),
        activeCashiers: pairedCashiers.size,
        maxCashiers: maxCashiersAllowed
      }));
      return;
    }

    // 1b. Terminals List Endpoint
    if (pathname === '/api/lan/terminals' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        terminals: Array.from(pairedCashiers.values()),
        maxAllowed: maxCashiersAllowed,
        count: pairedCashiers.size
      }));
      return;
    }

    // 1c. Unpair Terminal Endpoint
    if (pathname === '/api/lan/terminals/unpair' && req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        if (body.id && pairedCashiers.has(body.id)) {
          pairedCashiers.delete(body.id);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: `Terminal ${body.id} unpaired.` }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Terminal not found.' }));
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: e.message }));
      }
      return;
    }

    // 2. Real-time Server-Sent Events (SSE) Stream
    if (pathname === '/api/lan/events' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      res.write(`data: ${JSON.stringify({ type: 'connected', ip: getLocalIpAddress() })}\n\n`);

      const clientId = Date.now() + Math.random().toString(36).substring(2);
      const clientRecord = { id: clientId, res };
      sseClients.push(clientRecord);

      req.on('close', () => {
        sseClients = sseClients.filter(c => c.id !== clientId);
      });
      return;
    }

    // 3. Cashier Login Endpoint
    if (pathname === '/api/lan/login' && req.method === 'POST') {
      try {
        const { username, password } = await readJsonBody(req);
        if (!username || !password) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Username and password are required.' }));
          return;
        }

        const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
        if (!user || user.password !== password) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Invalid username or password.' }));
          return;
        }

        let parsedRights = {};
        try {
          parsedRights = user.rights ? (typeof user.rights === 'string' ? JSON.parse(user.rights) : user.rights) : {};
        } catch (e) {
          parsedRights = {};
        }

        const safeUser = {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          role: user.role,
          rights: parsedRights
        };

        const token = generateToken(safeUser);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          token,
          user: safeUser,
          storeName
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
      return;
    }

    // 4. Remote Procedure Call (RPC) Dispatcher
    if (pathname === '/api/lan/rpc' && req.method === 'POST') {
      try {
        const authHeader = req.headers['authorization'];
        const token = authHeader?.replace(/^Bearer\s+/i, '');
        const session = verifyToken(token);

        const { channel, args = [] } = await readJsonBody(req);
        if (!channel) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Missing RPC channel name.' }));
          return;
        }

        // Allow public read-only store info without token
        const publicChannels = ['settings:getCompanyInfo', 'settings:getInvoiceSettings'];
        if (!session && !publicChannels.includes(channel)) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Unauthorized or expired session.' }));
          return;
        }

        // Granular Permissions Check on Server side
        const userRights = session?.rights || {};
        const isAdmin = session?.role === 'admin' || Boolean(userRights.all);

        if (session && !isAdmin) {
          if (channel.startsWith('purchase:') && !userRights['inventory.purchases']) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Access denied: Purchase operations locked.' }));
            return;
          }
          if (channel === 'reports:getActivityLogs') {
            const hasLogAccess = Boolean(userRights['logs.access'] || userRights['logs.view_own'] || userRights['logs.view_all'] || userRights['reports.financial']);
            if (!hasLogAccess) {
              res.writeHead(403, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, message: 'Access denied: Activity logs locked.' }));
              return;
            }
            // If user only has logs.view_own and NOT logs.view_all, enforce own username filter
            if (!userRights['logs.view_all']) {
              args[0] = args[0] || {};
              args[0].username = session.username;
            }
          } else if (channel.startsWith('reports:') && !userRights['reports.financial']) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Access denied: Reports locked.' }));
            return;
          }
          if (channel.startsWith('settings:') && !channel.includes('login') && !channel.includes('logout') && !userRights['settings.access']) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Access denied: Settings locked.' }));
            return;
          }
        }

        const handler = ipcHandlers[channel];
        if (!handler) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: `Channel "${channel}" not found on server.` }));
          return;
        }

        // Attach user session to sale invoice creation
        if (session && channel === 'sales:createInvoice' && args[0]) {
          args[0].user_id = session.userId || args[0].user_id || 1;
          args[0].cashier_name = session.fullName || session.username || 'Cashier';
          args[0].counter_name = session.counterName || 'Cashier Counter';
        }

        // Execute IPC handler on server
        const fakeEvent = { sender: null };
        const result = await handler(fakeEvent, ...args);

        // If a sale or purchase occurred, trigger broadcast for stock updates
        if (channel === 'sales:createInvoice') {
          broadcast('sale:created', { invoice_no: result?.invoice_no, cashier: session?.username });
        } else if (channel === 'purchase:createPurchase' || channel === 'inventory:adjustStock') {
          broadcast('stock:updated', { channel });
        } else if (channel.startsWith('settings:save')) {
          broadcast('settings:updated', { channel });
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: result }));
      } catch (err) {
        console.error('[LanServer] RPC Error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Endpoint not found' }));
  });

  serverInstance.listen(port, '0.0.0.0', () => {
    console.log(`[LAN Server] 🚀 MediSoft LAN Hub listening at http://${getLocalIpAddress()}:${port}`);
  });

  serverInstance.on('error', (err) => {
    console.error('[LAN Server] Server error:', err.message);
  });

  return {
    success: true,
    ip: getLocalIpAddress(),
    port
  };
}

/**
 * Stop the Local LAN Hub.
 */
function stopLanServer() {
  if (serverInstance) {
    sseClients.forEach(c => {
      try { c.res.end(); } catch (e) {}
    });
    sseClients = [];
    serverInstance.close();
    serverInstance = null;
    activeServerLicenseKey = null;
    console.log('[LAN Server] Stopped.');
    return { success: true };
  }
  return { success: false, message: 'Server not running.' };
}

function getPairedTerminals() {
  return Array.from(pairedCashiers.values());
}

function unpairTerminal(id) {
  return pairedCashiers.delete(id);
}

function setMaxCashiers(count) {
  maxCashiersAllowed = count;
}

module.exports = {
  startLanServer,
  stopLanServer,
  broadcast,
  getLocalIpAddress,
  getAllNetworkInterfaces,
  getPairedTerminals,
  unpairTerminal,
  setMaxCashiers
};
