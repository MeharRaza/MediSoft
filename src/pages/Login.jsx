import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function Login() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const login = useAuthStore(s => s.login)
  const loading = useAuthStore(s => s.loading)
  const navigate = useNavigate()

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003c90] to-[#006a6a] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#003c90] mb-4">
            <span className="material-symbols-outlined text-white text-[32px]">local_pharmacy</span>
          </div>
          <h1 className="text-[24px] font-bold text-[#003c90]" style={{ fontFamily: 'Hanken Grotesk' }}>
            MediSoft Pro
          </h1>
          <p className="text-[12px] text-[#737784] tracking-widest font-semibold mt-1">PHARMACY MANAGEMENT SYSTEM</p>
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

        <p className="text-center text-[11px] text-[#737784] mt-6">
          Default: admin / admin123
        </p>
      </div>
    </div>
  )
}
