const http = require('http');
const os = require('os');
const crypto = require('crypto');
const db = require('../database');

let serverInstance = null;
let sseClients = [];
let serverSecret = null;

/**
 * Returns the primary local IPv4 address of this machine on the local network.
 */
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
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
function startLanServer({ port = 8088, storeName = 'MediSoft Pharmacy', ipcHandlers = {} }) {
  if (serverInstance) {
    return { success: true, alreadyRunning: true, ip: getLocalIpAddress(), port };
  }

  serverInstance = http.createServer(async (req, res) => {
    // Enable CORS for LAN terminals
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    // 1. Health & Discovery Endpoint
    if (pathname === '/api/lan/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        serverName: os.hostname(),
        ip: getLocalIpAddress(),
        port,
        storeName,
        serverTime: new Date().toISOString()
      }));
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
          if (channel.startsWith('reports:') && !userRights['reports.financial']) {
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
        }

        // Execute IPC handler on server
        const fakeEvent = { sender: null };
        const result = await handler(fakeEvent, ...args);

        // If a sale or purchase occurred, trigger broadcast for stock updates
        if (channel === 'sales:createInvoice') {
          broadcast('sale:created', { invoice_no: result?.invoice_no, cashier: session?.username });
        } else if (channel === 'purchase:createPurchase' || channel === 'inventory:adjustStock') {
          broadcast('stock:updated', { channel });
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
    console.log('[LAN Server] Stopped.');
    return { success: true };
  }
  return { success: false, message: 'Server not running.' };
}

module.exports = {
  startLanServer,
  stopLanServer,
  broadcast,
  getLocalIpAddress
};
