const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const os = require('os');
const https = require('https');

// RSA-2048 Public Key embedded from licensing server (posapi.asiansol.com)
const RSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxT0I9hiUqfByZ4oSV4Tw
k/4mqR/bv+mWtmkk/W4vCp+tMffPq1eubPR1qX5tzd8117RYRIrOdVpbnL3EBqvw
O1wfoOZ9ELQbhOaFv86zeteGQWV9TNoo6NhbFU2DRR44abR/twGJOwfIafLYScgR
JT5yFjvjfvTn5oRRdnhu2JpYUgjDoCunS9vY1tBVcNNrwLlHQcsDhoa6XNC+ecF5
+q9VGG6SXc/nikKzTfkF9cfqUot6+Akj8JTaVxPOZok+R3yfnK9I9BEA0THcp5kl
2g7hoqLtzqlwx+Ls0b+XGBUf6g4QhwJKl9WXLlPvtqANjbhQlyJNqfuXp/xl3Wik
lQIDAQAB
-----END PUBLIC KEY-----`;

const API_BASE_URL = 'https://posapi.asiansol.com/api';

/**
 * Extracts unique hardware identifiers (Motherboard UUID + CPU ProcessorId)
 * and returns a standard SHA-256 16-character HWID.
 */
function getHardwareId() {
  let uuid = '';
  let cpu = '';

  try {
    uuid = execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_ComputerSystemProduct).UUID"', { timeout: 3000 })
      .toString().trim();
  } catch (e1) {
    try {
      uuid = execSync('wmic csproduct get uuid', { timeout: 3000 })
        .toString().replace(/UUID/i, '').trim();
    } catch (e2) {
      uuid = 'GENERIC-BOARD-ID';
    }
  }

  try {
    cpu = execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_Processor).ProcessorId"', { timeout: 3000 })
      .toString().trim();
  } catch (e1) {
    try {
      cpu = execSync('wmic cpu get processorid', { timeout: 3000 })
        .toString().replace(/ProcessorId/i, '').trim();
    } catch (e2) {
      cpu = os.cpus()[0]?.model || 'GENERIC-CPU';
    }
  }

  const raw = `${uuid.toUpperCase()}-${cpu.toUpperCase()}`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16).toUpperCase();
  return `${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}`;
}

/**
 * Verifies an RSA-2048 digital signature using the embedded public key.
 */
function verifySignature(dataString, signatureBase64) {
  try {
    const verifier = crypto.createVerify('SHA256');
    verifier.update(dataString);
    verifier.end();
    return verifier.verify(RSA_PUBLIC_KEY, signatureBase64, 'base64');
  } catch (err) {
    console.error('[License] Signature verification error:', err.message);
    return false;
  }
}

/**
 * Helper to make HTTPS POST requests in Node without extra dependencies.
 */
function postJson(url, data) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const body = JSON.stringify(data);

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'MediSoftPro-Desktop/1.4.8'
      },
      timeout: 15000
    };

    const req = https.request(options, (res) => {
      let rawData = '';
      res.on('data', chunk => rawData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(rawData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: { success: false, message: rawData } });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Connection timed out. Please check your internet connection.'));
    });

    req.on('error', (err) => {
      reject(new Error(`Network error: ${err.message}`));
    });

    req.write(body);
    req.end();
  });
}

module.exports = function registerLicenseIPC(ipcMain, app) {
  const licenseFilePath = path.join(app.getPath('userData'), 'medisoft_license.dat');

  /**
   * Reads and cryptographically verifies the offline license file.
   */
  function readAndVerifyLicense() {
    const currentHwid = getHardwareId();

    if (!fs.existsSync(licenseFilePath)) {
      return { isActivated: false, hwid: currentHwid };
    }

    try {
      const rawContent = fs.readFileSync(licenseFilePath, 'utf8');
      const licenseRecord = JSON.parse(rawContent);

      const { token, signature } = licenseRecord;
      if (!token || !signature) {
        return { isActivated: false, hwid: currentHwid, error: 'Malformed license file.' };
      }

      // 1. Verify RSA-2048 Digital Signature
      const isSignatureValid = verifySignature(token, signature);
      if (!isSignatureValid) {
        return { isActivated: false, hwid: currentHwid, error: 'License digital signature is INVALID or TAMPERED!' };
      }

      // 2. Parse token payload
      const payload = typeof token === 'string' ? JSON.parse(token) : token;

      // 3. Verify Hardware ID binding
      if (payload.hwid && payload.hwid !== currentHwid) {
        return {
          isActivated: false,
          hwid: currentHwid,
          error: `License hardware mismatch! Locked to ${payload.hwid}, this PC is ${currentHwid}.`
        };
      }

      // 4. Verify Expiration if present
      if (payload.expiresAt) {
        const exp = new Date(payload.expiresAt);
        if (exp < new Date()) {
          return { isActivated: false, hwid: currentHwid, error: 'This license key has expired.' };
        }
      }

      return {
        isActivated: true,
        hwid: currentHwid,
        license: {
          key: payload.key,
          orderId: payload.orderId,
          storeName: payload.store,
          customerName: payload.customer,
          plan: payload.plan,
          issuedAt: payload.issuedAt,
          expiresAt: payload.expiresAt || 'Lifetime'
        }
      };
    } catch (err) {
      console.error('[License] Read error:', err);
      return { isActivated: false, hwid: currentHwid, error: err.message };
    }
  }

  // ── IPC Handlers ──────────────────────────────────────────────────────────

  // Check offline activation status
  ipcMain.handle('license:getStatus', () => {
    return readAndVerifyLicense();
  });

  // Get machine HWID
  ipcMain.handle('license:getHwid', () => {
    return getHardwareId();
  });

  // Online Activation (Requires ~5-10 seconds internet)
  ipcMain.handle('license:activate', async (_, licenseKey) => {
    if (!licenseKey || !licenseKey.trim()) {
      return { success: false, message: 'Please enter a valid License Key.' };
    }

    const currentHwid = getHardwareId();
    const payload = {
      licenseKey: licenseKey.trim().toUpperCase(),
      hardwareId: currentHwid,
      machineName: os.hostname(),
      osVersion: `${os.type()} ${os.release()}`,
      appVersion: app.getVersion()
    };

    try {
      console.log(`[License] Activating key ${payload.licenseKey} for HWID ${currentHwid}...`);
      const response = await postJson(`${API_BASE_URL}/license/activate`, payload);

      if (response.status !== 200 || !response.data || !response.data.success) {
        return {
          success: false,
          message: response.data?.message || 'Activation failed. Please check your License Key and try again.'
        };
      }

      const { token, signature, storeName, customerName, plan } = response.data;

      // Cryptographically verify signature with embedded public key before saving!
      const isValid = verifySignature(token, signature);
      if (!isValid) {
        return {
          success: false,
          message: 'Server signature verification failed. Please contact AsianSol support.'
        };
      }

      // Save signed license file locally
      const licenseData = {
        token,
        signature,
        savedAt: new Date().toISOString()
      };

      fs.writeFileSync(licenseFilePath, JSON.stringify(licenseData, null, 2), 'utf8');
      console.log(`[License] ✓ Successfully activated and locked to HWID: ${currentHwid}`);

      return {
        success: true,
        message: `License successfully activated for "${storeName || customerName}"! 100% offline usage is now unlocked.`,
        license: {
          key: payload.licenseKey,
          storeName,
          customerName,
          plan,
          hwid: currentHwid
        }
      };
    } catch (err) {
      console.error('[License] Activation request error:', err);
      return {
        success: false,
        message: err.message || 'Unable to connect to licensing server. Please check internet connection.'
      };
    }
  });

  // Deactivate / Reset locally (e.g. for testing)
  ipcMain.handle('license:deactivate', () => {
    try {
      if (fs.existsSync(licenseFilePath)) {
        fs.unlinkSync(licenseFilePath);
      }
      return { success: true, message: 'License removed from this machine.' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  });
};

