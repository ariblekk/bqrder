import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { Role } from '../api/types'
import { useAuth } from '../context/AuthContext'

export function RequireAuth({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth()
  const loc = useLocation()
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />
  if (!roles.includes(user.role)) {
    return <Navigate to={user.role === 'cashier' ? '/pos' : '/admin'} replace />
  }
  return <>{children}</>
}