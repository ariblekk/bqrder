"use client"

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"

interface HeaderState {
  title: string
  action?: ReactNode
}

const defaultHeader: HeaderState = { title: "bqrder" }

const HeaderContext = createContext<{
  header: HeaderState
  setHeader: (h: Partial<HeaderState>) => void
}>({ header: defaultHeader, setHeader: () => {} })

export function AdminHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeaderState] = useState<HeaderState>(defaultHeader)
  const setHeader = useCallback((h: Partial<HeaderState>) => {
    setHeaderState((prev) => ({ ...prev, ...h }))
  }, [])
  return (
    <HeaderContext.Provider value={{ header, setHeader }}>
      {children}
    </HeaderContext.Provider>
  )
}

export function useAdminHeader() {
  return useContext(HeaderContext)
}