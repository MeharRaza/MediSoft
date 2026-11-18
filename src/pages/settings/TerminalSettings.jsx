import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { checkServerHealth, updateTerminalState } from '../../lib/lanClient'
import { PageHeader, Card, Btn, Input, Badge, Modal } from '../../components/ui'

export default function TerminalSettings() {
  const [config, setConfig] = useState({
    mode: 'standalone', // 'standalone', 'server', 'cashier'
    serverIp: '127.0.0.1',
    serverPort: 8088,
    counterName: 'Main Counter',
    localIp: '127.0.0.1',
    isServerRunning: false
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [msg, setMsg] = useState(null)
  const [licenseInfo, setLicenseInfo] = useState(null)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)

  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    setLoading(true)
    try {
      const res = await api.terminal.getStatus()
      if (res) {
        setConfig(prev => ({
          ...prev,
          mode: res.mode || 'standalone',
          serverIp: res.serverIp || '127.0.0.1',
          serverPort: res.serverPort || 8088,
          counterName: res.counterName || 'Main Counter',
          localIp: res.localIp || '127.0.0.1',
          isServerRunning: res.isServerRunning || false
        }))
      }

      if (window.api?.license?.getStatus) {
        const lic = await window.api.license.getStatus()
        setLicenseInfo(lic?.license || null)
      }
    } catch (err) {
      console.warn('Failed to get terminal status:', err)
    } finally {
      setLoading(false)
    }
  }

  // Plan verification: Check if this machine's license supports Multi-Counter Hub
  const planName = licenseInfo?.plan || 'Basic'
  const isMultiCounterAllowed = !(
    planName.toLowerCase().includes('starter') ||
    planName.toLowerCase().includes('basic') ||
    planName.toLowerCase().includes('single')
  )

  const handleSelectMode = (mode) => {
    if (mode !== 'standalone' && !isMultiCounterAllowed) {
      setUpgradeModalOpen(true)
      return
    }
    setConfig(c => ({ ...c, mode }))
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    setMsg(null)

    const result = await checkServerHealth(config.serverIp, config.serverPort)
    setTesting(false)
    setTestResult(result)
  }

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    if (config.mode !== 'standalone' && !isMultiCounterAllowed) {
      setUpgradeModalOpen(true)
      return
    }

    setSaving(true)
    setMsg(null)

    try {
      const payload = {
        mode: config.mode,
        serverIp: config.serverIp.trim(),
        serverPort: parseInt(config.serverPort) || 8088,
        counterName: config.counterName.trim()
      }

      const res = await api.terminal.saveConfig(payload)
      if (res?.success) {
        updateTerminalState({
          mode: payload.mode,
          serverIp: payload.serverIp,
          serverPort: payload.serverPort,
          counterName: payload.counterName
        })
        setMsg({
          type: 'success',
          text: `Configuration saved successfully! Mode set to: ${payload.mode.toUpperCase()}`
        })
        loadStatus()
      } else {
        setMsg({ type: 'error', text: res?.error || 'Failed to save configuration.' })
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const modeBadge = (m) => {
    if (m === 'server') return <Badge label="SERVER HUB" type="success" />
    if (m === 'cashier') return <Badge label="CASHIER TERMINAL" type="info" />
    return <Badge label="STANDALONE (SINGLE PC)" type="neutral" />
  }

  return (
    <div className="flex flex-col h-full bg-[#f7f9fb]">
      <PageHeader
        title="Terminals & LAN Network"
        subtitle="Configure Multi-Counter Store Network (Server PC vs Cashier Terminals)"
        actions={
          <div className="flex items-center gap-2">
            <Btn variant="outline" onClick={loadStatus} disabled={loading}>
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              Refresh Status
            </Btn>
            <Btn variant="primary" onClick={handleSave} disabled={saving || loading}>
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-[16px]">save</span>
              )}
              Save & Apply
            </Btn>
          </div>
        }
      />

      <div className="p-6 space-y-6 flex-1 overflow-auto max-w-5xl mx-auto w-full">
        {/* Upgrade Banner for Basic / Starter users */}
        {!isMultiCounterAllowed && (
          <div className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 border border-blue-700">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-400/30">
                <span className="material-symbols-outlined text-[28px]">workspace_premium</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-[15px]">Active Plan: {planName} (Single PC)</h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-amber-950">
                    SINGLE COUNTER
                  </span>
                </div>
                <p className="text-[12px] text-blue-100 mt-1 leading-relaxed">
                  Want to connect 2 to 5 cashier terminals in your pharmacy with real-time stock sync? Upgrade to <strong>Store Pro</strong>.
                </p>
              </div>
            </div>
            <button
              onClick={() => setUpgradeModalOpen(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-900 font-bold text-[13px] rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-2 shrink-0 justify-center"
            >
              <span>Upgrade to Store Pro</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        )}

        {/* Status notification banner */}
        {msg && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-[13px] font-semibold ${
            msg.type === 'error'
              ? 'bg-red-50 text-[#ba1a1a] border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            <span className="material-symbols-outlined text-[18px]">
              {msg.type === 'error' ? 'error' : 'check_circle'}
            </span>
            <span>{msg.text}</span>
            <button className="ml-auto" onClick={() => setMsg(null)}>
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {/* Machine Info Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#003c90]">
              <span className="material-symbols-outlined text-[24px]">lan</span>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#737784] uppercase tracking-wider">This PC's Local IP</p>
              <p className="text-[16px] font-bold font-mono text-[#191c1e]">{config.localIp}</p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-[#006a6a]">
              <span className="material-symbols-outlined text-[24px]">devices</span>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#737784] uppercase tracking-wider">Current Operation Mode</p>
              <div className="mt-1">{modeBadge(config.mode)}</div>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              config.isServerRunning ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-[#737784]'
            }`}>
              <span className="material-symbols-outlined text-[24px]">
                {config.mode === 'server' ? 'dns' : config.mode === 'cashier' ? 'point_of_sale' : 'computer'}
              </span>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#737784] uppercase tracking-wider">Network Hub Status</p>
              <p className="text-[13px] font-semibold mt-0.5">
                {config.mode === 'server'
                  ? (config.isServerRunning ? '🟢 Hub Active (Listening)' : '🟡 Starting Hub...')
                  : config.mode === 'cashier'
                  ? '🔵 Terminal Client Mode'
                  : '⚪ Local Standalone Mode'}
              </p>
            </div>
          </Card>
        </div>

        {/* Mode Selector Cards */}
        <Card className="p-6">
          <h3 className="text-[15px] font-bold text-[#191c1e] mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#003c90] text-[20px]">tune</span>
            Select Machine Role in Store
          </h3>
          <p className="text-[12px] text-[#737784] mb-5">
            Choose whether this specific computer runs independently, hosts the pharmacy database for other counters, or connects as a cashier counter.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Standalone */}
            <div
              onClick={() => handleSelectMode('standalone')}
              className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                config.mode === 'standalone'
                  ? 'border-[#003c90] bg-blue-50/20 shadow-md'
                  : 'border-[#c3c6d5] hover:border-[#737784] bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="material-symbols-outlined text-[28px] text-[#003c90]">computer</span>
                <input
                  type="radio"
                  name="terminal_mode"
                  checked={config.mode === 'standalone'}
                  onChange={() => handleSelectMode('standalone')}
                  className="w-4 h-4 text-[#003c90]"
                />
              </div>
              <h4 className="text-[14px] font-bold text-[#191c1e] mb-1">Standalone Mode</h4>
              <span className="text-[10px] font-bold text-[#737784] uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                Default • Plan 1
              </span>
              <p className="text-[12px] text-[#434653] mt-3 leading-relaxed">
                Standard single-computer setup. Works 100% offline. Local database on this PC. No network ports opened.
              </p>
            </div>

            {/* 2. Server PC */}
            <div
              onClick={() => handleSelectMode('server')}
              className={`p-5 rounded-xl border-2 cursor-pointer transition-all relative overflow-hidden ${
                config.mode === 'server'
                  ? 'border-green-600 bg-green-50/20 shadow-md'
                  : 'border-[#c3c6d5] hover:border-[#737784] bg-white'
              }`}
            >
              {!isMultiCounterAllowed && (
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
                  <span className="material-symbols-outlined text-[12px]">lock</span>
                  Store Pro
                </div>
              )}
              <div className="flex items-center justify-between mb-3">
                <span className="material-symbols-outlined text-[28px] text-green-700">dns</span>
                {isMultiCounterAllowed ? (
                  <input
                    type="radio"
                    name="terminal_mode"
                    checked={config.mode === 'server'}
                    onChange={() => handleSelectMode('server')}
                    className="w-4 h-4 text-green-600"
                  />
                ) : (
                  <span className="material-symbols-outlined text-[18px] text-amber-600">lock</span>
                )}
              </div>
              <h4 className="text-[14px] font-bold text-[#191c1e] mb-1">Server PC (Main Counter)</h4>
              <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider bg-green-100 px-2 py-0.5 rounded">
                Master Hub • Plan 2
              </span>
              <p className="text-[12px] text-[#434653] mt-3 leading-relaxed">
                Holds the master pharmacy database. Cashier counters connect to this PC over local Wi-Fi / Switch router.
              </p>
              {!isMultiCounterAllowed && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setUpgradeModalOpen(true); }}
                  className="mt-3 text-[11px] font-bold text-[#003c90] hover:underline flex items-center gap-1"
                >
                  <span>Upgrade to unlock</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              )}
            </div>

            {/* 3. Cashier PC */}
            <div
              onClick={() => handleSelectMode('cashier')}
              className={`p-5 rounded-xl border-2 cursor-pointer transition-all relative overflow-hidden ${
                config.mode === 'cashier'
                  ? 'border-indigo-600 bg-indigo-50/20 shadow-md'
                  : 'border-[#c3c6d5] hover:border-[#737784] bg-white'
              }`}
            >
              {!isMultiCounterAllowed && (
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
                  <span className="material-symbols-outlined text-[12px]">lock</span>
                  Store Pro
                </div>
              )}
              <div className="flex items-center justify-between mb-3">
                <span className="material-symbols-outlined text-[28px] text-indigo-700">point_of_sale</span>
                {isMultiCounterAllowed ? (
                  <input
                    type="radio"
                    name="terminal_mode"
                    checked={config.mode === 'cashier'}
                    onChange={() => handleSelectMode('cashier')}
                    className="w-4 h-4 text-indigo-600"
                  />
                ) : (
                  <span className="material-symbols-outlined text-[18px] text-amber-600">lock</span>
                )}
              </div>
              <h4 className="text-[14px] font-bold text-[#191c1e] mb-1">Cashier PC (Counter Terminal)</h4>
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider bg-indigo-100 px-2 py-0.5 rounded">
                Terminal Client
              </span>
              <p className="text-[12px] text-[#434653] mt-3 leading-relaxed">
                Connects to the Server PC over LAN. No database file stored on this PC. Only fetches and creates bills on the Server.
              </p>
              {!isMultiCounterAllowed && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setUpgradeModalOpen(true); }}
                  className="mt-3 text-[11px] font-bold text-[#003c90] hover:underline flex items-center gap-1"
                >
                  <span>Upgrade to unlock</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* Detailed Configuration Section based on active mode */}
        {config.mode === 'server' && (
          <Card className="p-6 border-l-4 border-l-green-600">
            <h3 className="text-[15px] font-bold text-[#191c1e] mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-green-700 text-[20px]">hub</span>
              Server PC Hub Configuration
            </h3>
            <p className="text-[12px] text-[#737784] mb-4">
              Enter this IP address on the other Cashier PCs so they can connect to this Main Counter.
            </p>

            <div className="bg-green-50/60 border border-green-200 rounded-xl p-4 mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold text-green-800 uppercase tracking-wider">Share this Server Address with Cashiers</p>
                <p className="text-[20px] font-bold font-mono text-green-900 mt-0.5">
                  http://{config.localIp}:{config.serverPort}
                </p>
                <p className="text-[11px] text-green-700 mt-1">
                  Both PCs must be connected to the same Wi-Fi router or Ethernet switch (No Internet Needed).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 bg-green-600 text-white text-[12px] font-bold rounded-lg flex items-center gap-1.5 shadow-sm">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Hub Ready
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Server Port (Default: 8088)"
                type="number"
                value={config.serverPort}
                onChange={e => setConfig(c => ({ ...c, serverPort: e.target.value }))}
                placeholder="8088"
              />
              <Input
                label="Counter / Station Name"
                value={config.counterName}
                onChange={e => setConfig(c => ({ ...c, counterName: e.target.value }))}
                placeholder="Main Counter / Server"
              />
            </div>
          </Card>
        )}

        {config.mode === 'cashier' && (
          <Card className="p-6 border-l-4 border-l-indigo-600">
            <h3 className="text-[15px] font-bold text-[#191c1e] mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-700 text-[20px]">link</span>
              Cashier Terminal Connection Settings
            </h3>
            <p className="text-[12px] text-[#737784] mb-4">
              Enter the Server PC's IP address and test the connection.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-2">
                <Input
                  label="Server PC IP Address *"
                  value={config.serverIp}
                  onChange={e => setConfig(c => ({ ...c, serverIp: e.target.value }))}
                  placeholder="e.g. 192.168.1.15"
                  required
                />
              </div>
              <div>
                <Input
                  label="Port *"
                  type="number"
                  value={config.serverPort}
                  onChange={e => setConfig(c => ({ ...c, serverPort: e.target.value }))}
                  placeholder="8088"
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <Input
                label="Cashier Counter Name"
                value={config.counterName}
                onChange={e => setConfig(c => ({ ...c, counterName: e.target.value }))}
                placeholder="e.g. Counter 2 - Front Desk"
              />
            </div>

            {/* Test Connection Button & Result Box */}
            <div className="pt-2">
              <Btn
                variant="outline"
                onClick={handleTestConnection}
                disabled={testing || !config.serverIp.trim()}
                className="w-full md:w-auto"
              >
                {testing ? (
                  <span className="w-4 h-4 border-2 border-[#003c90]/30 border-t-[#003c90] rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-[16px]">wifi_tethering</span>
                )}
                {testing ? 'Testing LAN Connection...' : 'Test Connection to Server PC'}
              </Btn>

              {testResult && (
                <div className={`mt-4 p-4 rounded-xl border text-[13px] ${
                  testResult.ok
                    ? 'bg-green-50 border-green-200 text-green-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}>
                  {testResult.ok ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-bold text-green-800">
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        Successfully Connected to Server PC!
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 text-[12px]">
                        <div><span className="text-green-700 font-semibold">Store:</span> {testResult.storeName}</div>
                        <div><span className="text-green-700 font-semibold">Host:</span> {testResult.serverName}</div>
                        <div><span className="text-green-700 font-semibold">Latency:</span> <span className="font-mono font-bold text-green-800">{testResult.latency} ms ⚡</span></div>
                        <div><span className="text-green-700 font-semibold">Status:</span> Online</div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-bold text-red-800">
                        <span className="material-symbols-outlined text-[18px]">cancel</span>
                        Connection Failed
                      </div>
                      <p className="text-[12px] text-red-700 mt-1">{testResult.error}</p>
                      <p className="text-[11px] text-red-600 mt-2">
                        Troubleshooting: 1) Verify Server PC has MediSoft open in "Server PC" mode. 2) Ensure both PCs are connected to the same Wi-Fi / LAN router. 3) Check Windows Firewall permits port {config.serverPort}.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Upgrade to Store Pro Modal */}
      <Modal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        title="Upgrade to MediSoft Store Pro"
      >
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-[28px] text-[#003c90]">hub</span>
              <div>
                <h4 className="font-bold text-[15px] text-[#003c90]">Multi-Counter Store Pro Features</h4>
                <p className="text-[12px] text-[#434653]">Connect multiple computers in your pharmacy seamlessly.</p>
              </div>
            </div>
            <ul className="space-y-2 mt-4 text-[12px] text-[#191c1e]">
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-green-600 text-[18px]">check_circle</span>
                <span><strong>1 Main Server PC + Up to 3-5 Cashier Terminals</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-green-600 text-[18px]">check_circle</span>
                <span><strong>100% Offline LAN Sync</strong> — Works over local Wi-Fi / Switch router without internet.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-green-600 text-[18px]">check_circle</span>
                <span><strong>Real-time Live Stock Updates</strong> — Decrements instantly across all cashiers.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-green-600 text-[18px]">check_circle</span>
                <span><strong>Central Cashier Permissions</strong> — Restrict discounts, cost prices & reports.</span>
              </li>
            </ul>
          </div>

          <div className="p-3 bg-slate-50 border border-[#c3c6d5] rounded-xl flex items-center justify-between text-[12px]">
            <div>
              <p className="text-[#737784] font-semibold">Your Current Plan</p>
              <p className="font-bold text-[#191c1e] text-[13px]">{planName} (Single PC)</p>
            </div>
            <div className="text-right">
              <p className="text-[#737784] font-semibold">Support Contact</p>
              <p className="font-bold text-[#003c90]">0322-8684603 / AsianSol</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#c3c6d5]">
            <Btn variant="outline" onClick={() => setUpgradeModalOpen(false)}>
              Close
            </Btn>
            <Btn
              variant="primary"
              onClick={() => {
                alert('Please contact AsianSol support at 0322-8684603 or visit asiansol.com to upgrade your license to Store Pro.')
              }}
            >
              <span className="material-symbols-outlined text-[16px]">call</span>
              Contact AsianSol to Upgrade
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
