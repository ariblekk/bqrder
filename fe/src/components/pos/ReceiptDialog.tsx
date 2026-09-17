import { useEffect, useState } from 'react'
import { get } from '../../api/client'
import { Button, Dialog } from '../ui'

export default function ReceiptDialog({
  orderId,
  open,
  onOpenChange,
  onError,
}: {
  orderId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onError: (msg: string) => void
}) {
  const [receipt, setReceipt] = useState('')

  useEffect(() => {
    if (!open || orderId == null) return
    get<{ receipt: string }>(`/pos/orders/${orderId}/receipt`)
      .then((r) => setReceipt(r.data.receipt))
      .catch((e) => onError((e as Error).message))
  }, [open, orderId, onError])

  function printReceipt() {
    const w = window.open('', '_blank', 'width=380,height=600')
    if (!w) return
    w.document.write(
      `<pre style="font-family:monospace;font-size:12px;white-space:pre-wrap">${receipt.replace(/</g, '&lt;')}</pre>`,
    )
    w.document.close()
    w.focus()
    w.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Struk">
      <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">{receipt}</pre>
      <Button onClick={printReceipt}>Cetak</Button>
    </Dialog>
  )
}