import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { initTerminal, checkServerHealth, updateTerminalState } from '../lib/lanClient'
import { api } from '../lib/api'
import { Modal, Btn, Input } from '../components/ui'

export default function Login() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const [terminalInfo, setTerminalInfo] = useState(null)
  const [serverStatus, setServerStatus] = useState(null)
  const [netModalOpen, setNetModalOpen] = useState(false)
  const [serverIpInput, setServerIpInput] = useState('')
  const [serverPortInput, setServerPortInput] = useState(8088)
  const [savingNet, setSavingNet] = useState(false)

  const login = useAuthStore(s => s.login)
  const loading = useAuthStore(s => s.loading)
  const navigate = useNavigate()

  useEffect(() => {
    initTerminal().then(t => {
      setTerminalInfo(t)
      setServerIpInput(t.serverIp || '127.0.0.1')
      setServerPortInput(t.serverPort || 8088)

      if (t.mode === 'cashier') {
        checkServerHealth(t.serverIp, t.serverPort).then(res => {
          setServerStatus(res)
        })
      }
    })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const result = await login(username, password)
    if (result.success) {
      navigate('/dashboard')
    } else {
      setError(result.message || 'Login failed')
    }
  }

  const handleSaveNetworkConfig = async () => {
    setSavingNet(true)
    try {
      const res = await api.terminal.saveConfig({
        mode: 'cashier',
        serverIp: serverIpInput.trim(),
        serverPort: parseInt(serverPortInput) || 8088
      })
      if (res?.success) {
        updateTerminalState({
          mode: 'cashier',
          serverIp: serverIpInput.trim(),
          serverPort: parseInt(serverPortInput) || 8088
        })
        const ping = await checkServerHealth(serverIpInput.trim(), parseInt(serverPortInput) || 8088)
        setServerStatus(ping)
        setTerminalInfo(prev => ({
          ...prev,
          mode: 'cashier',
          serverIp: serverIpInput.trim(),
          serverPort: parseInt(serverPortInput) || 8088
        }))
        setNetModalOpen(false)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingNet(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003c90] to-[#006a6a] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 relative">
        {/* Network Mode Indicator at top right */}
        {terminalInfo && (
          <div className="absolute top-4 right-4">
            <button
              type="button"
              onClick={() => setNetModalOpen(true)}
              title="Terminal & Network Setup"
              className="p-1.5 rounded-lg text-[#737784] hover:text-[#003c90] hover:bg-blue-50 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">
                {terminalInfo.mode === 'cashier' ? 'router' : terminalInfo.mode === 'server' ? 'dns' : 'lan'}
              </span>
            </button>
          </div>
        )}

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#003c90] mb-3">
            <span className="material-symbols-outlined text-white text-[32px]">local_pharmacy</span>
          </div>
          <h1 className="text-[24px] font-bold text-[#003c90]" style={{ fontFamily: 'Hanken Grotesk' }}>
            MediSoft Pro
          </h1>
          <p className="text-[12px] text-[#737784] tracking-widest font-semibold mt-0.5">PHARMACY MANAGEMENT SYSTEM</p>

          {/* Cashier Mode Banner */}
          {terminalInfo?.mode === 'cashier' && (
            <div className={`mt-3 px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 ${
              serverStatus?.ok
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              <span className="material-symbols-outlined text-[14px]">
                {serverStatus?.ok ? 'check_circle' : 'warning'}
              </span>
              <span>
                {serverStatus?.ok
                  ? `Connected: ${terminalInfo.serverIp} (${serverStatus.latency}ms)`
                  : `Server Offline: ${terminalInfo.serverIp}`}
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-[#434653] mb-1.5 uppercase tracking-wide">Username</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#737784] text-[18px]">person</span>
              <input
                type="text" value={username} onChange={e => setUsername(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-[#c3c6d5] rounded-lg text-[14px] focus:border-[#003c90] focus:bg-blue-50/30 transition-all"
                placeholder="Enter username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#434653] mb-1.5 uppercase tracking-wide">Password</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#737784] text-[18px]">lock</span>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-[#c3c6d5] rounded-lg text-[14px] focus:border-[#003c90] focus:bg-blue-50/30 transition-all"
                placeholder="Enter password"
                required
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-[12px]">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-[#003c90] text-white font-bold text-[14px] rounded-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-[18px]">login</span>
            )}
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="flex items-center justify-between text-[11px] text-[#737784] mt-6 pt-4 border-t border-[#f0f2f5]">
          <span>Default: admin / admin123</span>
          <button
            type="button"
            onClick={() => setNetModalOpen(true)}
            className="text-[#003c90] hover:underline font-semibold flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">settings_ethernet</span>
            Network
          </button>
        </div>
      </div>

      {/* Quick Network Configuration Modal */}
      <Modal
        open={netModalOpen}
        onClose={() => setNetModalOpen(false)}
        title="Terminal Network Setup"
      >
        <div className="space-y-4">
          <p className="text-[12px] text-[#434653]">
            Configure whether this PC connects as a Cashier Terminal to a Central Server PC or operates independently.
          </p>

          <Input
            label="Server PC IP Address"
            value={serverIpInput}
            onChange={e => setServerIpInput(e.target.value)}
            placeholder="e.g. 192.168.1.15"
          />

          <Input
            label="Server Port"
            type="number"
            value={serverPortInput}
            onChange={e => setServerPortInput(e.target.value)}
            placeholder="8088"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-[#c3c6d5]">
            <Btn variant="outline" onClick={() => setNetModalOpen(false)}>
              Cancel
            </Btn>
            <Btn variant="primary" onClick={handleSaveNetworkConfig} disabled={savingNet}>
              {savingNet ? 'Saving...' : 'Save & Connect'}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
