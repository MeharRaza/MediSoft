// Local LAN Network Client for Cashier Terminals & Multi-Counter Sync
let terminalState = {
  mode: 'standalone', // 'standalone', 'server', or 'cashier'
  serverIp: '127.0.0.1',
  serverPort: 8088,
  localIp: '127.0.0.1',
  counterName: 'Main Counter',
  token: null,
  isInitialized: false
};

// Listeners for live broadcast events (stock, sales)
const eventListeners = new Set();
let sseConnection = null;

export async function initTerminal() {
  if (typeof window === 'undefined' || !window.api?.terminal) return terminalState;
  try {
    const status = await window.api.terminal.getStatus();
    const savedToken = localStorage.getItem('medisoft_lan_token');
    terminalState = {
      ...terminalState,
      ...status,
      token: savedToken || null,
      isInitialized: true
    };

    // If running in Cashier mode and we have a token, establish persistent live event stream
    if (terminalState.mode === 'cashier' && terminalState.token) {
      connectEventStream();
    }
  } catch (err) {
    console.warn('[LAN Client] Could not load terminal status:', err);
  }
  return terminalState;
}

export function getTerminalState() {
  return terminalState;
}

export function updateTerminalState(partial) {
  terminalState = { ...terminalState, ...partial };
  return terminalState;
}

export function setTerminalToken(token) {
  terminalState.token = token;
  if (token) {
    localStorage.setItem('medisoft_lan_token', token);
  } else {
    localStorage.removeItem('medisoft_lan_token');
  }
}

/**
 * Pings the server health endpoint and measures roundtrip latency.
 */
export async function checkServerHealth(ip = terminalState.serverIp, port = terminalState.serverPort) {
  const targetIp = (ip || '127.0.0.1').trim();
  const targetPort = port || 8088;
  const url = `http://${targetIp}:${targetPort}/api/lan/health`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);
  const startTime = performance.now();

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    const latency = Math.round(performance.now() - startTime);

    if (!res.ok) {
      return { ok: false, error: `Server returned HTTP ${res.status}` };
    }

    const data = await res.json();
    return {
      ok: true,
      latency,
      serverName: data.serverName,
      storeName: data.storeName,
      ip: data.ip,
      port: data.port,
      serverTime: data.serverTime
    };
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      ok: false,
      error: err.name === 'AbortError' ? 'Connection timed out (3s)' : (err.message || 'Unable to connect to Server')
    };
  }
}

/**
 * Authenticates a cashier terminal with the Server PC.
 */
export async function loginOverLan(username, password, ip = terminalState.serverIp, port = terminalState.serverPort) {
  const targetIp = (ip || '127.0.0.1').trim();
  const targetPort = port || 8088;
  const url = `http://${targetIp}:${targetPort}/api/lan/login`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const json = await res.json();
    if (!res.ok || !json.success) {
      return { success: false, message: json.message || 'Login failed' };
    }

    setTerminalToken(json.token);
    connectEventStream();
    return {
      success: true,
      user: json.user,
      storeName: json.storeName,
      token: json.token
    };
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      success: false,
      message: err.name === 'AbortError' ? 'Server timed out' : `Connection error: ${err.message}`
    };
  }
}

export function connectEventStream() {
  if (typeof window === 'undefined' || terminalState.mode !== 'cashier') return;
  if (sseConnection) {
    try { sseConnection.close(); } catch (e) {}
    sseConnection = null;
  }

  const sseUrl = `http://${terminalState.serverIp}:${terminalState.serverPort}/api/lan/events`;
  try {
    sseConnection = new EventSource(sseUrl);
    sseConnection.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        eventListeners.forEach(listener => {
          try { listener(payload); } catch (e) {}
        });
      } catch (e) {}
    };
    sseConnection.addEventListener('sale:created', (event) => {
      try {
        const payload = JSON.parse(event.data);
        eventListeners.forEach(listener => {
          try { listener({ type: 'sale:created', ...payload }); } catch (e) {}
        });
      } catch (e) {}
    });
    sseConnection.onerror = () => {
      // EventSource auto-reconnects in modern browsers
    };
  } catch (err) {
    console.warn('[LAN Client] EventSource connection failed:', err);
  }
}

export function disconnectEventStream() {
  if (sseConnection) {
    try { sseConnection.close(); } catch (e) {}
    sseConnection = null;
  }
}

export function onLanEvent(listener) {
  eventListeners.add(listener);
  return () => eventListeners.delete(listener);
}

/**
 * Universal RPC Invoker:
 * In Cashier mode -> Calls Server PC over local LAN HTTP.
 * In Standalone / Server mode -> Calls local handler directly.
 */
export async function rpcCall(channel, localHandler, ...args) {
  if (!terminalState.isInitialized && typeof window !== 'undefined' && window.api?.terminal) {
    await initTerminal();
  }

  if (terminalState.mode === 'cashier') {
    const url = `http://${terminalState.serverIp}:${terminalState.serverPort}/api/lan/rpc`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': terminalState.token ? `Bearer ${terminalState.token}` : ''
        },
        body: JSON.stringify({ channel, args })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || `LAN Server Error on ${channel}`);
      }
      return json.data;
    } catch (err) {
      console.error(`[LAN Client] RPC Failed for ${channel}:`, err.message);
      throw err;
    }
  }

  // Standalone / Server Mode: Execute local handler directly
  return localHandler(...args);
}
