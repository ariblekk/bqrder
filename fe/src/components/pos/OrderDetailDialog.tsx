import { useEffect, useState } from 'react'
import { post, put } from '../../api/client'
import ReceiptDialog from './ReceiptDialog'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  StatusTag,
} from '../ui'
import type { Order } from '../../api/types'

export function fmtRp(n: number) {
  return `Rp ${n.toLocaleString('id-ID')}`
}

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'baru saja'
  if (m < 60) return `${m} mnt lalu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} jam lalu`
  return `${Math.floor(h / 24)} hari lalu`
}

export default function OrderDetailDialog({
  order,
  open,
  onOpenChange,
  onReload,
  onError,
}: {
  order: Order | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onReload: () => void
  onError: (msg: string) => void
}) {
  const [receiptId, setReceiptId] = useState<number | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [cur, setCur] = useState(order)

  useEffect(() => setCur(order), [order])

  async function act(fn: () => Promise<{ data: Order }>) {
    onError('')
    try {
      const res = await fn()
      setCur(res.data)
      onReload()
    } catch (e) {
      onError((e as Error).message)
    }
  }

  const showReceipt = (id: number) => {
    setReceiptId(id)
    setReceiptOpen(true)
  }
  const needAction = cur && cur.payment_status === 'unpaid' && cur.status !== 'cancelled'
  const paid = cur?.payment_status === 'paid'
  const canProses = paid && cur?.status === 'pending'
  const canFinish = paid && cur?.status === 'processing'

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {cur && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detail {cur.order_number}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <StatusTag status={cur.status} />
              <StatusTag status={cur.payment_status} />
              <span className="ml-auto text-muted-foreground">{timeAgo(cur.created_at)}</span>
            </div>
            <p className="text-muted-foreground">
              {cur.customer_name} • Meja {cur.table_number || cur.table_id || '-'}
            </p>
            <ul className="m-0 max-h-56 list-none space-y-1 divide-y p-0">
              {cur.items.map((it) => (
                <li key={it.id} className="flex items-center justify-between gap-2 py-1">
                  <span className="min-w-0">
                    <span className="block truncate">
                      {it.quantity}x {it.product_name}
                    </span>
                    {it.notes && <em className="block truncate text-xs text-muted-foreground">({it.notes})</em>}
                  </span>
                  <span className="shrink-0">{fmtRp(it.subtotal)}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between">
              <strong>Total: {fmtRp(cur.total_amount)}</strong>
              <div className="flex items-center gap-2">
                {canProses && (
                  <Button
                    size="sm"
                    onClick={() =>
                      act(() => put<Order>(`/pos/orders/${cur.id}/status`, { status: 'processing' }))
                    }
                  >
                    Proses
                  </Button>
                )}
                {canFinish && (
                  <Button
                    size="sm"
                    onClick={() =>
                      act(() => put<Order>(`/pos/orders/${cur.id}/status`, { status: 'completed' }))
                    }
                  >
                    Selesai
                  </Button>
                )}
                {needAction && (
                  <>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        act(() => put<Order>(`/pos/orders/${cur.id}/status`, { status: 'cancelled' }))
                      }
                    >
                      Batal
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        act(() => post(`/pos/orders/${cur.id}/pay`, { payment_method: 'cash' }))
                      }
                    >
                      Bayar Tunai
                    </Button>
                  </>
                )}
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => showReceipt(cur.id)}>
              Struk
            </Button>
          </div>
          </DialogContent>
        )}
      </Dialog>
      <ReceiptDialog
        orderId={receiptId}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        onError={onError}
      />
    </>
  )
}