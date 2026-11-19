import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkServerHealth, updateTerminalState } from '../lib/lanClient';
import { api } from '../lib/api';

export default function Activation({ onActivated }) {
  // 'choose' | 'server' | 'cashier'
  const [roleStep, setRoleStep] = useState('choose');
  const [hwid, setHwid] = useState('Detecting...');
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedHwid, setCopiedHwid] = useState(false);

  // Cashier Terminal fields
  const [serverIp, setServerIp] = useState('');
  const [serverPort, setServerPort] = useState(8088);
  const [counterName, setCounterName] = useState('Cash Counter 1');
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

  // 1. Activate as Server PC (Master Hub)
  const handleActivateServer = async (e) => {
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
        setSuccessMsg(result.message || 'License activated successfully! Setting up Master Server...');
        
        // Auto-configure terminal role as 'server'
        if (api?.terminal?.saveConfig) {
          await api.terminal.saveConfig({
            mode: 'server',
            serverPort: 8088,
            counterName: 'Main Server Counter',
            licenseKey: cleanKey
          }).catch(console.warn);
        }

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

  // 2. Test Ping & Pair Cashier Terminal
  const handleTestCashierLan = async () => {
    if (!serverIp.trim() || !cashierKey.trim()) return;
    setTestingLan(true);
    setLanStatus(null);
    try {
      const res = await checkServerHealth(
        serverIp.trim(),
        parseInt(serverPort) || 8088,
        cashierKey.trim(),
        counterName.trim()
      );
      setLanStatus(res);
    } catch (err) {
      setLanStatus({ ok: false, error: err.message });
    } finally {
      setTestingLan(false);
    }
  };

  // 3. Save Cashier Pairing & Go to Login
  const handleSaveCashier = async () => {
    if (!serverIp.trim() || !cashierKey.trim()) return;
    setSavingLan(true);
    try {
      const cleanKey = cashierKey.trim().toUpperCase();
      if (api?.terminal?.saveConfig) {
        await api.terminal.saveConfig({
          mode: 'cashier',
          serverIp: serverIp.trim(),
          serverPort: parseInt(serverPort) || 8088,
          counterName: counterName.trim() || 'Cash Counter',
          licenseKey: cleanKey
        });
      }

      updateTerminalState({
        mode: 'cashier',
        serverIp: serverIp.trim(),
        serverPort: parseInt(serverPort) || 8088,
        counterName: counterName.trim() || 'Cash Counter',
        licenseKey: cleanKey
      });

      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to save cashier configuration.');
    } finally {
      setSavingLan(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#002244] via-[#003c90] to-[#004d40] flex items-center justify-center p-4">
      <div className={`bg-white rounded-3xl shadow-2xl w-full ${roleStep === 'choose' ? 'max-w-2xl' : 'max-w-md'} p-8 border border-white/20 transition-all`}>
        
        {/* Header & Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#003c90] to-[#10b981] mb-3 shadow-lg shadow-blue-900/20">
            <span className="material-symbols-outlined text-white text-[32px]">verified_user</span>
          </div>
          <h1 className="text-[22px] font-bold text-[#0f172a]">
            MediSoft <span className="text-[#003c90]">Pro</span> Setup
          </h1>
          <p className="text-[12px] text-[#64748b] tracking-wider font-semibold mt-1 uppercase">
            Pharmacy Multi-Counter POS Network Engine
          </p>
        </div>

        {/* ── STEP 1: DUAL ROLE SELECTION ────────────────────────────────────── */}
        {roleStep === 'choose' && (
          <div className="space-y-4">
            <div className="text-center mb-5">
              <h2 className="text-[15px] font-bold text-slate-800">
                Choose this computer's role in your pharmacy:
              </h2>
              <p className="text-[12px] text-slate-500 mt-0.5">
                Each store has 1 Master Server PC. Cashier counters connect over local Wi-Fi.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 1: Main Server PC */}
              <div
                onClick={() => { setRoleStep('server'); setError(''); setSuccessMsg(''); }}
                className="p-5 rounded-2xl border-2 border-slate-200 hover:border-[#003c90] bg-white hover:bg-blue-50/30 cursor-pointer shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-[#003c90] flex items-center justify-center mb-3 group-hover:scale-105 transition-all">
                    <span className="material-symbols-outlined text-[28px]">dns</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-[15px] text-slate-900">Main Server PC</h3>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#003c90] uppercase">
                      Primary Hub
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-2">
                    Hosts the master pharmacy database. Cashier counters connect to this PC. Requires your official License Key.
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-5 w-full py-2.5 bg-[#003c90] text-white font-bold text-[12px] rounded-xl shadow-sm group-hover:bg-[#002d6b] transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Setup as Main Server</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>

              {/* Option 2: Cashier Counter */}
              <div
                onClick={() => { setRoleStep('cashier'); setError(''); setLanStatus(null); }}
                className="p-5 rounded-2xl border-2 border-slate-200 hover:border-emerald-600 bg-white hover:bg-emerald-50/30 cursor-pointer shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-all">
                    <span className="material-symbols-outlined text-[28px]">point_of_sale</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-[15px] text-slate-900">Cashier Counter</h3>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                      Secondary Terminal
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-2">
                    Connects to your Main Server PC over local Wi-Fi / Switch. Zero local database. Requires Server IP + Pairing Key.
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-5 w-full py-2.5 bg-emerald-600 text-white font-bold text-[12px] rounded-xl shadow-sm group-hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Connect as Cashier</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 text-center text-[11px] text-slate-500">
              Need assistance or ordered a new counter key? Visit <a href="https://pos.asiansol.com" target="_blank" rel="noreferrer" className="text-[#003c90] font-bold hover:underline">pos.asiansol.com</a>
            </div>
          </div>
        )}

        {/* ── STEP 2: SERVER PC SETUP ────────────────────────────────────────── */}
        {roleStep === 'server' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => { setRoleStep('choose'); setError(''); setSuccessMsg(''); }}
              className="text-[12px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-2 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Change Machine Role</span>
            </button>

            {/* HWID Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4 flex items-center justify-between">
              <div className="text-left">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  SERVER MACHINE HARDWARE ID (HWID)
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

            {/* Server Activation Form */}
            <form onSubmit={handleActivateServer} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#334155] mb-1.5 uppercase tracking-wide">
                  Enter Official Store License Key *
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
                  1 license key permits exactly 1 Master Server Hub per store.
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
                className="w-full py-3 bg-[#003c90] hover:bg-[#002d6b] text-white font-bold text-[14px] rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-[18px]">dns</span>
                )}
                {loading ? 'Activating Master Server Hub...' : '⚡ Activate Master Server PC'}
              </button>
            </form>
          </div>
        )}

        {/* ── STEP 3: CASHIER COUNTER SETUP ──────────────────────────────────── */}
        {roleStep === 'cashier' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => { setRoleStep('choose'); setError(''); setLanStatus(null); }}
              className="text-[12px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-2 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Change Machine Role</span>
            </button>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-900 leading-relaxed">
              <strong>Pairing with Pharmacy Server:</strong> Enter your Main Server PC's Local IP address and Store Pro Key to pair this cashier counter.
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  MAIN SERVER PC LOCAL IP ADDRESS *
                </label>
                <input
                  type="text"
                  value={serverIp}
                  onChange={e => setServerIp(e.target.value)}
                  placeholder="e.g. 192.168.1.47"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[13px] font-mono focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Check this IP on Server PC: Settings ➔ Terminals & Network
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    SERVER PORT
                  </label>
                  <input
                    type="number"
                    value={serverPort}
                    onChange={e => setServerPort(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[13px] font-mono focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    COUNTER NAME
                  </label>
                  <input
                    type="text"
                    value={counterName}
                    onChange={e => setCounterName(e.target.value)}
                    placeholder="e.g. Counter 1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[13px] focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  STORE PRO LICENSE KEY (PAIRING KEY) *
                </label>
                <input
                  type="text"
                  value={cashierKey}
                  onChange={e => setCashierKey(e.target.value.toUpperCase())}
                  placeholder="MSPRO-XXXX-XXXX-XXXX-XXXX"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-[13px] font-mono tracking-wider focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 uppercase"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Must match the exact Store Pro key activated on your Server PC.
                </p>
              </div>

              {/* Ping Test Status Banner */}
              {lanStatus && (
                <div className={`p-3 rounded-xl text-[12px] flex items-center gap-2 ${
                  lanStatus.ok
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  <span className="material-symbols-outlined text-[18px]">
                    {lanStatus.ok ? 'check_circle' : 'error'}
                  </span>
                  <div>
                    {lanStatus.ok ? (
                      <div>
                        <p className="font-bold">✓ Ping & Pairing Successful ({lanStatus.latency}ms)</p>
                        <p className="text-[11px] text-emerald-700">
                          Connected to: <strong>{lanStatus.serverName}</strong> ({lanStatus.storeName || 'Pharmacy Server'})
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-bold">Pairing Failed</p>
                        <p className="text-[11px] text-rose-700">{lanStatus.error}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleTestCashierLan}
                  disabled={testingLan || !serverIp.trim() || !cashierKey.trim()}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[12px] rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">network_check</span>
                  <span>{testingLan ? 'Testing Connection...' : '1. Test Ping & Pairing'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveCashier}
                  disabled={savingLan || !serverIp.trim() || !cashierKey.trim()}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[13px] rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  <span>{savingLan ? 'Saving Terminal...' : '2. Save & Connect Cashier'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
