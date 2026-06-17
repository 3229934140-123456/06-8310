import { create } from 'zustand'
import type { User, UserRole } from '@/types'

interface AuthState {
  currentUser: User | null
  isAuthenticated: boolean
  login: (phone: string, role: UserRole) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: (() => {
    try {
      const stored = localStorage.getItem('autoCare_currentUser')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })(),
  isAuthenticated: (() => {
    try {
      return !!localStorage.getItem('autoCare_currentUser')
    } catch {
      return false
    }
  })(),

  login: (phone: string, role: UserRole) => {
    let users: User[] = []
    try {
      const stored = localStorage.getItem('autoCare_users')
      if (stored) users = JSON.parse(stored)
    } catch {
      users = []
    }

    let user = users.find((u) => u.phone === phone)

    if (!user) {
      user = {
        id: Date.now().toString(),
        phone,
        name: `用户${phone.slice(-4)}`,
        role,
      }
      users.push(user)
      localStorage.setItem('autoCare_users', JSON.stringify(users))
    }

    localStorage.setItem('autoCare_currentUser', JSON.stringify(user))
    set({ currentUser: user, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('autoCare_currentUser')
    set({ currentUser: null, isAuthenticated: false })
  },
}))
