import type { ReactNode } from 'react'
import { toast as sonnerToast } from 'sonner'

import { Toaster } from './sonner'

type Variant = 'success' | 'error'

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="top-right" richColors />
    </>
  )
}

export function useToast() {
  return {
    toast: (title: string, opts?: { description?: string; variant?: Variant }) => {
      const show = opts?.variant === 'error' ? sonnerToast.error : sonnerToast.success
      show(title, { description: opts?.description })
    },
  }
}