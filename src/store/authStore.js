import { create } from 'zustand'

// Mock API for browser development (when Electron is not available)
const isElectron = typeof window !== 'undefined' && window.api

export const useAuthStore = create((set, get) => ({
  user: isElectron ? null : { id: 1, full_name: 'Administrator', role: 'admin', username: 'admin' },
  loading: false,

  login: async (username, password) => {
    set({ loading: true })
    try {
      if (isElectron) {
        const result = await window.api.settings.login({ username, password })
        if (result.success) {
          set({ user: result.user, loading: false })
          return { success: true }
        }
        set({ loading: false })
        return { success: false, message: result.message }
      } else {
        // Dev mode mock
        if (username === 'admin' && password === 'admin123') {
          const user = { id: 1, full_name: 'Administrator', role: 'admin', username: 'admin' }
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
    if (isElectron) await window.api.settings.logout()
    set({ user: null })
  },
}))
