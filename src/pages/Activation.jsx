import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkServerHealth, updateTerminalState } from '../lib/lanClient';
import { api } from '../lib/api';
import { Modal, Btn, Input } from '../components/ui';

export default function Activation({ onActivated }) {
  const [hwid, setHwid] = useState('Detecting...');
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedHwid, setCopiedHwid] = useState(false);

  // Cashier Terminal LAN Connect modal state
  const [cashierModalOpen, setCashierModalOpen] = useState(false);
  const [serverIp, setServerIp] = useState('');
  const [serverPort, setServerPort] = useState(8088);
  const [counterName, setCounterName] = useState('Counter 1');
  const [cashierKey, setCashierKey] = useState('');
  const [testingLan, setTestingLan] = useState(false);
  const [lanStatus, setLanStatus] = useState(null);
  const [savingLan, setSavingLan] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    // Fetch machine hardware ID
    if (window.api?.license?.getHwid) {
      window.api.license.getHwid().then(id => {
        setHwid(id);
      }).catch(() => {
        setHwid('UNKNOWN-HWID');
      });
    }
  }, []);

  const handleCopyHwid = () => {
    if (hwid && hwid !== 'Detecting...') {
      navigator.clipboard.writeText(hwid);
      setCopiedHwid(true);
      setTimeout(() => setCopiedHwid(false), 2500);
    }
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanKey = licenseKey.trim().toUpperCase();
    if (!cleanKey) {
      setError('Please enter your License Key.');
      return;
    }

    setLoading(true);
    try {
      if (!window.api?.license?.activate) {
        throw new Error('Desktop licensing bridge not found. Please restart the app.');
      }

      const result = await window.api.license.activate(cleanKey);

      if (result.success) {
        setSuccessMsg(result.message || 'License activated successfully!');
        if (onActivated) {
          onActivated(result.license);
        }
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 1800);
      } else {
        setError(result.message || 'Activation failed. Please check your License Key.');
      }
    } catch (err) {
      setError(err.message || 'Network error connecting to activation server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#002244] via-[#003c90] to-[#004d40] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 border border-white/20">
        
        {/* Header & Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#003c90] to-[#10b981] mb-3 shadow-lg shadow-blue-900/20">
            <span className="material-symbols-outlined text-white text-[32px]">verified_user</span>
          </div>
          <h1 className="text-[22px] font-bold text-[#0f172a]">
            MediSoft <span className="text-[#003c90]">Pro</span> Activation
          </h1>
          <p className="text-[12px] text-[#64748b] tracking-wider font-semibold mt-1 uppercase">
            Hardware-Locked Offline POS Engine
          </p>
        </div>

        {/* HWID Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-5 flex items-center justify-between">
          <div className="text-left">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              THIS MACHINE HARDWARE ID (HWID)
            </span>
            <code className="text-[14px] font-mono font-bold text-slate-800 tracking-wider">
              {hwid}
            </code>
          </div>
          <button
            type="button"
            onClick={handleCopyHwid}
            className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-700 text-[11px] font-semibold rounded-lg transition-all flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">
              {copiedHwid ? 'check' : 'content_copy'}
            </span>
            {copiedHwid ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Activation Form */}
        <form onSubmit={handleActivate} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-[#334155] mb-1.5 uppercase tracking-wide">
              Enter Your Official License Key *
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b] text-[18px]">
                vpn_key
              </span>
              <input
                type="text"
                value={licenseKey}
                onChange={e => setLicenseKey(e.target.value.toUpperCase())}
                className="w-full pl-9 pr-4 py-2.5 border border-[#cbd5e1] rounded-lg text-[14px] font-mono tracking-wider focus:border-[#003c90] focus:ring-2 focus:ring-blue-100 focus:bg-blue-50/20 transition-all uppercase placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400"
                placeholder="MSPRO-XXXX-XXXX-XXXX-XXXX"
                required
              />
            </div>
            <p className="text-[11px] text-[#64748b] mt-1">
              Enter the key approved by admin on pos.asiansol.com
            </p>
          </div>

          {/* Success Banner */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[12px] flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[12px] flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-rose-600">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !!successMsg}
            className="w-full py-3 bg-[#003c90] hover:bg-[#002d6b] text-white font-bold text-[14px] rounded-lg shadow-md hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-[18px]">bolt</span>
            )}
            {loading ? 'Verifying with AsianSol Server...' : '⚡ Activate License (10-Sec Internet)'}
          </button>
        </form>

        {/* Cashier Terminal Quick Connect Option */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-center">
            <p className="text-[11px] font-bold text-blue-900 mb-0.5">
              Setting up a 2nd Counter or Cashier Laptop?
            </p>
            <p className="text-[10px] text-blue-700 mb-2.5">
              Cashiers connect directly to your Main Server PC over LAN. No extra license key required.
            </p>
            <button
              type="button"
              onClick={() => { setCashierModalOpen(true); setLanStatus(null); }}
              className="w-full py-2 bg-white hover:bg-blue-50 text-[#003c90] border border-[#003c90] font-bold text-[12px] rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
              <span>Connect as Cashier Terminal</span>
            </button>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mt-5 pt-4 border-t border-slate-100 text-left space-y-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-emerald-600">offline_bolt</span>
            <span><strong>100% Offline Forever:</strong> Zero internet required after this one-time activation.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-blue-600">fingerprint</span>
            <span><strong>Hardware Bound:</strong> Cryptographically locked to your Motherboard & CPU.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-amber-600">verified</span>
            <span><strong>RSA-2048 Protected:</strong> Tamper-proof digital license signature.</span>
          </div>
        </div>

        {/* Footer Link */}
        <div className="mt-4 text-center text-[12px] text-slate-500">
          Don't have a license key?{' '}
          <a
            href="https://pos.asiansol.com"
            target="_blank"
            rel="noreferrer"
            className="text-[#003c90] font-bold hover:underline"
          >
            Order at pos.asiansol.com
          </a>
        </div>

      </div>

      {/* Cashier Terminal Modal */}
      {cashierModalOpen && (
        <Modal
          isOpen={cashierModalOpen}
          onClose={() => setCashierModalOpen(false)}
          title="Connect Cashier Counter to Server PC"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-[12px] text-slate-600">
              Enter your pharmacy Main Server PC's Local IP address to link this cashier counter over Wi-Fi / Switch.
            </p>

            <Input
              label="Main Server PC IP Address *"
              placeholder="e.g. 192.168.1.50"
              value={serverIp}
              onChange={e => setServerIp(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Port"
                type="number"
                value={serverPort}
                onChange={e => setServerPort(e.target.value)}
                required
              />
              <Input
                label="Counter Name"
                placeholder="Counter 1"
                value={counterName}
                onChange={e => setCounterName(e.target.value)}
              />
            </div>

            <Input
              label="Store Pro License Key (Pairing Key) *"
              placeholder="MSPRO-XXXX-XXXX-XXXX-XXXX"
              value={cashierKey}
              onChange={e => setCashierKey(e.target.value.toUpperCase())}
              className="font-mono uppercase tracking-wider"
              required
            />
            <p className="text-[10px] text-slate-500 -mt-2">
              Enter the exact Store Pro license key from your Server PC to pair this counter.
            </p>

            {lanStatus && (
              <div className={`p-2.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 ${
                lanStatus.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                <span className="material-symbols-outlined text-[16px]">
                  {lanStatus.ok ? 'check_circle' : 'cancel'}
                </span>
                <span>
                  {lanStatus.ok ? `Server Paired & Online! Ping: ${lanStatus.latency}ms (${lanStatus.storeName || 'Pharmacy'})` : `Error: ${lanStatus.error || 'Connection refused'}`}
                </span>
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-slate-200">
              <Btn
                type="button"
                variant="outline"
                className="flex-1"
                disabled={testingLan || !serverIp.trim() || !cashierKey.trim()}
                onClick={async () => {
                  setTestingLan(true);
                  setLanStatus(null);
                  const res = await checkServerHealth(serverIp.trim(), parseInt(serverPort) || 8088, cashierKey.trim());
                  setTestingLan(false);
                  setLanStatus(res);
                }}
              >
                {testingLan ? 'Testing...' : 'Test Ping & Pair'}
              </Btn>
              <Btn
                type="button"
                variant="primary"
                className="flex-1"
                disabled={savingLan || !serverIp.trim() || !cashierKey.trim()}
                onClick={async () => {
                  setSavingLan(true);
                  try {
                    const cfg = {
                      mode: 'cashier',
                      serverIp: serverIp.trim(),
                      serverPort: parseInt(serverPort) || 8088,
                      counterName: counterName.trim() || 'Counter 1',
                      licenseKey: cashierKey.trim().toUpperCase()
                    };
                    const res = await api.terminal.saveConfig(cfg);
                    if (res?.success) {
                      updateTerminalState(cfg);
                      if (onActivated) onActivated({ plan: 'Store Pro Cashier' });
                      navigate('/login', { replace: true });
                    } else {
                      alert('Failed to save config: ' + (res?.error || 'Unknown error'));
                    }
                  } catch (err) {
                    alert('Error saving config: ' + err.message);
                  } finally {
                    setSavingLan(false);
                  }
                }}
              >
                {savingLan ? 'Connecting...' : 'Save & Connect'}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
