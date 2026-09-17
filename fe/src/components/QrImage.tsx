import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function QrImage({
  value,
  size = 96,
  onData,
}: {
  value: string
  size?: number
  onData?: (dataUrl: string) => void
}) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    let alive = true
    QRCode.toDataURL(value, { width: size, margin: 1 }).then((url) => {
      if (!alive) return
      setSrc(url)
      onData?.(url)
    })
    return () => {
      alive = false
    }
  }, [value, size, onData])

  if (!src) return <span className="text-sm text-muted-foreground">...</span>
  return <img src={src} width={size} height={size} alt="" />
}