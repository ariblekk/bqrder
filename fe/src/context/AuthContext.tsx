import { createContext, useContext, useState, type ReactNode } from 'react'
import { clearAuth, loadAuth, post, saveAuth } from '../api/client'
import type { AuthData, User } from '../api/types'

interface AuthCtx {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  setup: (
    name: string,
    email: string,
    password: string,
    branch: { name: string; address: string; phone: string },
  ) => Promise<void>
  logout: () => void
}

const Ctx = createContext<AuthCtx>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthData | null>(() => loadAuth())

  async function login(email: string, password: string) {
    const res = await post<AuthData>('/auth/login', { email, password })
    setAuth(res.data)
    saveAuth(res.data)
  }

  async function setup(
    name: string,
    email: string,
    password: string,
    branch: { name: string; address: string; phone: string },
  ) {
    const res = await post<AuthData>('/auth/bootstrap', { name, email, password, branch })
    setAuth(res.data)
    saveAuth(res.data)
  }

  function logout() {
    clearAuth()
    setAuth(null)
  }

  return (
    <Ctx.Provider value={{ user: auth?.user ?? null, login, setup, logout }}>{children}</Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)