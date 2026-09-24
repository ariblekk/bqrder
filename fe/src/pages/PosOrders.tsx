import { useState } from 'react'
import { get } from '../api/client'
import OrderDetailDialog from '../components/pos/OrderDetailDialog'
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
import { formatRupiah, timeAgo } from '../lib/utils'

export default function PosOrders() {
  const { data: orders, err, reload } = useAsync(() => get<Order[]>('/pos/orders'), [])
  const [selected, setSelected] = useState<Order | null>(null)
  const [done, setDone] = useState('')

  const allOrders = orders?.data ?? []

  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <PosHeader title="Pesanan Hari Ini" />
      {(err || done) && <p className="mb-2 text-sm font-medium text-destructive">{err || done}</p>}

      <div className="flex min-h-0 flex-1 flex-col">
        {!allOrders.length ? (
          <Empty>
            <EmptyContent>
              <EmptyDescription>Belum ada pesanan hari ini.</EmptyDescription>
            </EmptyContent>
          </Empty>
        ) : (
          <Card size="sm" className="min-h-0 flex-1 overflow-y-auto">
            <CardContent className="p-2">
              <ul className="m-0 list-none divide-y divide-border p-0 text-sm">
                {allOrders.map((o) => {
                  const fromQr = o.payment_method === 'gateway'
                  const needsPay = o.payment_status === 'unpaid' && o.status !== 'cancelled'
                  const needsProses = o.payment_status === 'paid' && o.status === 'pending'
                  const needsAction = needsPay || needsProses
                  return (
                    <li
                      key={o.id}
                      className={`flex cursor-pointer gap-3 border-l-4 py-2 pl-3 pr-2 transition-colors hover:bg-muted/50 ${fromQr ? 'border-l-emerald-500' : 'border-l-primary'} ${needsPay ? 'bg-destructive/5' : ''}`}
                      onClick={() => setSelected(o)}
                    >
                      <span className="mt-2 shrink-0">
                        <span className={`block size-2.5 rounded-full ${needsAction ? 'bg-destructive' : fromQr ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate font-medium">{o.customer_name}</span>
                          <span className="flex shrink-0 items-center gap-2">
                            {needsAction && (
                              <Badge variant={needsPay ? 'destructive' : 'secondary'} className="text-[10px]">
                                {needsPay ? 'Bayar' : 'Proses'}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">{timeAgo(o.created_at)}</span>
                          </span>
                        </span>
                        <span className="flex items-baseline gap-2">
                          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                            <span className="text-muted-foreground/70">{o.order_number}</span>
                            {' · '}
                            {o.items.map((it) => `${it.quantity}x ${it.product_name}`).join(', ')}
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="text-xs font-medium">{formatRupiah(o.total_amount)}</span>
                            <span className="hidden items-center gap-1 lg:flex">
                              <StatusTag status={o.status} />
                              <StatusTag status={o.payment_status} />
                            </span>
                          </span>
                        </span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>
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