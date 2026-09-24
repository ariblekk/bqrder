import { useEffect, useState } from 'react'
import { get } from '../../api/client'
import type { Order, Branch } from '../../api/types'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui'

interface ReceiptData {
  order: Order
  branch: Branch
}

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
  const [data, setData] = useState<ReceiptData | null>(null)

  useEffect(() => {
    if (!open || orderId == null) return
    get<ReceiptData>(`/pos/orders/${orderId}/receipt`)
      .then((r) => setData(r.data))
      .catch((e) => onError((e as Error).message))
  }, [open, orderId, onError])

  function printReceipt() {
    if (!data) return
    const w = window.open('', '_blank', 'width=380,height=600')
    if (!w) return

    const html = `
      <html>
        <head>
          <style>
            body { font-family: monospace; font-size: 12px; padding: 20px; }
            .center { text-align: center; }
            .divider { border-top: 1px solid #000; margin: 10px 0; }
            .row { display: flex; justify-content: space-between; margin: 5px 0; }
            .item { margin: 8px 0; }
            .total { font-weight: bold; font-size: 14px; margin-top: 10px; }
          </style>
        </head>
        <body>
          ${renderPlainReceipt(data)}
        </body>
      </html>
    `
    w.document.write(html)
    w.document.close()
    w.focus()
    w.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Struk</DialogTitle>
        </DialogHeader>
        {data ? (
          <div className="space-y-4 rounded-lg border p-4">
            {/* Header */}
            <div className="space-y-1 text-center">
              <div className="text-lg font-bold">qrdigo</div>
              <div className="font-semibold">{data.branch.name}</div>
              {data.branch.address && (
                <div className="text-xs text-muted-foreground">{data.branch.address}</div>
              )}
              {data.branch.phone && (
                <div className="text-xs text-muted-foreground">Telp: {data.branch.phone}</div>
              )}
            </div>

            <div className="border-t" />

            {/* Order Info */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">No. Pesanan</span>
                <span className="font-semibold">{data.order.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Waktu</span>
                <span>{new Date(data.order.created_at).toLocaleString('id-ID')}</span>
              </div>
              {data.order.customer_name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pelanggan</span>
                  <span>{data.order.customer_name}</span>
                </div>
              )}
              {data.order.table_number && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Meja</span>
                  <span>{data.order.table_number}</span>
                </div>
              )}
            </div>

            <div className="border-t" />

            {/* Items */}
            <div className="space-y-3">
              {data.order.items.map((item) => (
                <div key={item.id} className="space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium">{item.product_name}</span>
                    <span className="font-semibold">{formatIDR(item.subtotal)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.quantity} x {formatIDR(item.price)}
                  </div>
                  {item.notes && (
                    <div className="text-xs text-muted-foreground">Catatan: {item.notes}</div>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t" />

            {/* Total */}
            <div className="flex justify-between text-lg font-bold">
              <span>TOTAL</span>
              <span>{formatIDR(data.order.total_amount)}</span>
            </div>

            {/* Status */}
            <div className="flex justify-center gap-2 text-xs">
              <span className="rounded-full bg-muted px-2 py-1">{data.order.status}</span>
              <span className="rounded-full bg-muted px-2 py-1">{data.order.payment_status}</span>
            </div>

            <div className="border-t" />

            <div className="text-center font-semibold">TERIMA KASIH</div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">Memuat...</div>
        )}
        <DialogFooter>
          <Button onClick={printReceipt} disabled={!data}>
            Cetak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

function renderPlainReceipt(data: ReceiptData): string {
  const lines: string[] = []
  const width = 40

  const center = (s: string) => {
    const pad = Math.floor((width - s.length) / 2)
    return ' '.repeat(Math.max(0, pad)) + s
  }

  lines.push('='.repeat(width))
  lines.push(center('qrdigo'))
  lines.push(center(data.branch.name))
  if (data.branch.address) lines.push(center(data.branch.address))
  if (data.branch.phone) lines.push(center(`Telp: ${data.branch.phone}`))
  lines.push('='.repeat(width))
  lines.push(`No       : ${data.order.order_number}`)
  lines.push(`Waktu    : ${new Date(data.order.created_at).toLocaleString('id-ID')}`)
  if (data.order.customer_name) lines.push(`Pelanggan: ${data.order.customer_name}`)
  lines.push(`Meja     : ${data.order.table_number || '-'}`)
  lines.push('-'.repeat(width))

  data.order.items.forEach((item) => {
    lines.push(item.product_name)
    lines.push(`  ${item.quantity} x ${formatIDR(item.price)}  ${formatIDR(item.subtotal)}`)
    if (item.notes) lines.push(`  catatan: ${item.notes}`)
  })

  lines.push('-'.repeat(width))
  lines.push(`TOTAL    : ${formatIDR(data.order.total_amount)}`)
  lines.push(`Status   : ${data.order.status} / ${data.order.payment_status}`)
  lines.push('='.repeat(width))
  lines.push(center('TERIMA KASIH'))
  lines.push('='.repeat(width))

  return `<div class="center"><pre>${lines.join('\n')}</pre></div>`
}