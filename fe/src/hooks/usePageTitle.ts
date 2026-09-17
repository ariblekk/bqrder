import { useEffect } from 'react'
import { useAdminHeader } from '../layouts/AdminHeaderContext'

export function usePageTitle(title: string, action?: React.ReactNode) {
  const { setHeader } = useAdminHeader()
  useEffect(() => {
    setHeader({ title, action })
    return () => setHeader({ title: 'bqrder', action: undefined })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeader])
}