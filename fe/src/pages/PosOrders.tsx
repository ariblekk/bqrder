import { useState } from 'react'
import { get } from '../api/client'
import OrderDetailDialog, { fmtRp } from '../components/pos/OrderDetailDialog'
import PosHeader from '../components/pos/PosHeader'
import {
  Badge,
  Card,
  CardContent,
  Empty,
  EmptyContent,
  EmptyDescription,
  StatusTag,
} from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import type { Order } from '../api/types'

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'baru saja'
  if (m < 60) return `${m} mnt lalu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} jam lalu`
  return `${Math.floor(h / 24)} hari lalu`
}

export default function PosOrders() {
  const { data: orders, err, reload } = useAsync(() => get<Order[]>('/pos/orders'), [])
  const [selected, setSelected] = useState<Order | null>(null)
  const [done, setDone] = useState('')

  const allOrders = orders?.data ?? []

  return (
    <div className="flex h-full flex-col p-4">
      <PosHeader title="Pesanan Hari Ini" />
      {(err || done) && <p className="mb-2 text-sm font-medium text-destructive">{err || done}</p>}

      <div className="flex flex-col gap-3">
        {allOrders.map((o: Order) => {
          const fromQr = o.payment_method === 'gateway'
          const notes = o.items.filter((it) => it.notes).map((it) => `${it.product_name}: ${it.notes}`)
          return (
            <Card
              key={o.id}
              size="sm"
              className={`cursor-pointer border-l-4 transition-colors hover:border-primary ${fromQr ? 'border-l-emerald-500' : 'border-l-primary'}`}
            >
              <CardContent className="flex flex-col gap-2" onClick={() => setSelected(o)}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={fromQr ? 'secondary' : 'outline'}>{fromQr ? 'QR' : 'Kasir'}</Badge>
                  <strong>{o.order_number}</strong>
                  <span className="text-xs text-muted-foreground">{timeAgo(o.created_at)}</span>
                  {o.payment_status === 'unpaid' && o.status !== 'cancelled' && (
                    <Badge variant="destructive" className="text-[10px]">
                      Belum dibayar
                    </Badge>
                  )}
                  {o.payment_status === 'paid' && o.status === 'pending' && (
                    <Badge variant="secondary" className="text-[10px]">
                      Perlu diproses
                    </Badge>
                  )}
                  <span className="ml-auto flex items-center gap-1">
                    <StatusTag status={o.status} />
                    <StatusTag status={o.payment_status} />
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {o.customer_name} • Meja {o.table_number || o.table_id || '-'} • {fmtRp(o.total_amount)}
                </p>
                <p className="text-sm">
                  {o.items.map((it) => `${it.quantity}x ${it.product_name}`).join(', ')}
                  {notes.length > 0 && <em className="text-muted-foreground"> — {notes.join('; ')}</em>}
                </p>
              </CardContent>
            </Card>
          )
        })}
        {orders && !allOrders.length && (
          <Empty>
            <EmptyContent>
              <EmptyDescription>Belum ada pesanan hari ini.</EmptyDescription>
            </EmptyContent>
          </Empty>
        )}
      </div>

      <OrderDetailDialog
        order={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        onReload={reload}
        onError={setDone}
      />
    </div>
  )
}