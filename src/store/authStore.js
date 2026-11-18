import { create } from 'zustand'
import { initTerminal, getTerminalState, loginOverLan, setTerminalToken, disconnectEventStream } from '../lib/lanClient'

const isElectron = typeof window !== 'undefined' && window.api

function normalizeUser(user) {
  if (!user) return null
  let rights = user.rights || {}
  if (typeof rights === 'string') {
    try {
      rights = JSON.parse(rights)
    } catch (e) {
      rights = {}
    }
  }
  return { ...user, rights }
}

export const useAuthStore = create((set, get) => ({
  user: isElectron ? null : {
    id: 1,
    full_name: 'Administrator',
    role: 'admin',
    username: 'admin',
    rights: { all: true }
  },
  loading: false,

  login: async (username, password) => {
    set({ loading: true })
    try {
      const terminal = await initTerminal()

      // Cashier Mode: Authenticate against the Central Server PC over LAN
      if (terminal && terminal.mode === 'cashier') {
        const result = await loginOverLan(username, password, terminal.serverIp, terminal.serverPort)
        if (result.success) {
          const user = normalizeUser(result.user)
          set({ user, loading: false })
          return { success: true }
        }
        set({ loading: false })
        return { success: false, message: result.message }
      }

      // Standalone or Server Mode: Authenticate locally via Electron IPC
      if (isElectron) {
        const result = await window.api.settings.login({ username, password })
        if (result.success) {
          const user = normalizeUser(result.user)
          set({ user, loading: false })
          return { success: true }
        }
        set({ loading: false })
        return { success: false, message: result.message }
      } else {
        // Dev mode mock
        if (username === 'admin' && password === 'admin123') {
          const user = {
            id: 1,
            full_name: 'Administrator',
            role: 'admin',
            username: 'admin',
            rights: { all: true }
          }
          set({ user, loading: false })
          return { success: true }
        }
        set({ loading: false })
        return { success: false, message: 'Invalid credentials' }
      }
    } catch (e) {
      set({ loading: false })
      return { success: false, message: e.message }
    }
  },

  logout: async () => {
    setTerminalToken(null)
    disconnectEventStream()
    if (isElectron && window.api?.settings?.logout) {
      try {
        await window.api.settings.logout()
      } catch (e) {}
    }
    set({ user: null })
  },

  updateUser: (fields) => {
    set(s => ({ user: s.user ? normalizeUser({ ...s.user, ...fields }) : null }))
  },
}))
