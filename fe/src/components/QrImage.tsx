import { useEffect, useRef } from 'react'
import QRCodeStyling from 'qr-code-styling'

export function QrImage({
  value,
  size = 96,
  onData,
}: {
  value: string
  size?: number
  onData?: (dataUrl: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const qr = new QRCodeStyling({
      width: size * 3,
      height: size * 3,
      type: 'canvas',
      data: value,
      margin: 1,
      qrOptions: { errorCorrectionLevel: 'H' },
      image: '/logo.jpg',
      imageOptions: { hideBackgroundDots: true, imageSize: 0.3, margin: 6 },
      dotsOptions: { color: '#000000', type: 'rounded' },
      cornersSquareOptions: { color: '#000000', type: 'extra-rounded' },
      cornersDotOptions: { color: '#000000', type: 'dot' },
    })
    const container = ref.current
    container.innerHTML = ''
    qr.append(container)
    const canvas = container.querySelector('canvas')
    if (canvas) {
      canvas.style.width = '100%'
      canvas.style.height = '100%'
    }
    qr.getRawData('png').then((blob) => {
      const reader = new FileReader()
      reader.onload = () => onData?.(reader.result as string)
      reader.readAsDataURL(blob)
    })
  }, [value, size, onData])

  return <div ref={ref} style={{ width: size, height: size }} />
}