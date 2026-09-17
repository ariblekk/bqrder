import { useEffect } from 'react'
import { Check, ChefHat, Clock3, PackageCheck, XCircle } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { get } from '../api/client'
import type { Order } from '../api/types'
import { Badge, Button, Card, CardContent, Skeleton } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { cn } from '../lib/utils'

const rupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

const STEPS = [
  { key: 'pending', label: 'Diterima', desc: 'Pesananmu sudah masuk ke kasir' },
  { key: 'processing', label: 'Disiapkan', desc: 'Dapur sedang menyiapkan pesanan' },
  { key: 'completed', label: 'Selesai', desc: 'Pesanan siap dinikmati' },
]

const statusTitle: Record<string, { title: string; sub: string }> = {
  pending: { title: 'Menunggu diproses', sub: 'Kasir akan memproses pesananmu sebentar lagi.' },
  processing: { title: 'Sedang disiapkan', sub: 'Dapur sedang memasak pesananmu. Sabar ya!' },
  completed: { title: 'Pesanan selesai', sub: 'Silakan nikmati pesananmu. Selamat makan!' },
  cancelled: { title: 'Pesanan dibatalkan', sub: 'Pesanan tidak dapat diproses.' },
}

export default function OrderStatus() {
  const { orderNumber } = useParams()
  const { data, err, reload } = useAsync(
    () => get<Order>(`/public/orders/${orderNumber}`),
    [orderNumber],
  )

  useEffect(() => {
    const t = setInterval(reload, 5000)
    return () => clearInterval(t)
  }, [reload])

  const o = data?.data
  const cancelled = o?.status === 'cancelled'
  const activeIdx =
    o?.status === 'completed' ? 2 : o?.status === 'processing' ? 1 : o?.status === 'pending' ? 0 : -1
  const st = o ? statusTitle[o.status] ?? { title: o.status, sub: '' } : null

  return (
    <div className="min-h-dvh bg-muted/40 pb-24">
      <header className="pt-10 pb-4 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          bqrder
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Status Pesanan</h1>
        {o && <p className="mt-1 text-sm text-muted-foreground">{o.order_number}</p>}
      </header>

      <main className="mx-auto max-w-xl px-4">
        {err && <p className="text-sm font-medium text-destructive">{err}</p>}

        {!o && !err && (
          <Card size="sm">
            <CardContent className="space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        )}

        {o && (
          <>
            <div className="overflow-hidden rounded-xl bg-card text-sm text-card-foreground ring-1 ring-foreground/10">
              <div
                className={cn(
                  'px-4 py-6 text-center',
                  cancelled
                    ? 'bg-destructive/10'
                    : activeIdx === 2
                      ? 'bg-emerald-500/10'
                      : 'bg-primary/5',
                )}
              >
                <div
                  className={cn(
                    'mx-auto flex size-16 items-center justify-center rounded-full text-white shadow-sm',
                    cancelled ? 'bg-destructive' : activeIdx === 2 ? 'bg-emerald-500' : 'bg-primary',
                  )}
                >
                  {activeIdx >= 0 && !cancelled ? (
                    activeIdx === 2 ? (
                      <PackageCheck className="size-8" />
                    ) : activeIdx === 1 ? (
                      <ChefHat className="size-8" />
                    ) : (
                      <Clock3 className="size-8" />
                    )
                  ) : (
                    <XCircle className="size-8" />
                  )}
                </div>
                <h2 className="mt-3 text-lg font-bold">{st?.title}</h2>
                <p className="text-sm text-muted-foreground">{st?.sub}</p>
              </div>

              {!cancelled && (
                <div className="px-4 pt-4 pb-4">
                  <div className="grid grid-cols-3">
                    {STEPS.map((s, i) => {
                      const done = i <= activeIdx
                      return (
                        <div key={s.key} className="relative flex flex-col items-center">
                          {i < STEPS.length - 1 && (
                            <span
                              className={cn(
                                'absolute top-3 left-1/2 h-0.5 w-full',
                                i < activeIdx ? 'bg-primary' : 'bg-muted',
                              )}
                            />
                          )}
                          <span
                            className={cn(
                              'relative z-10 flex size-6 items-center justify-center rounded-full text-xs font-bold',
                              done
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {done ? <Check className="size-3.5" /> : i + 1}
                          </span>
                          <p
                            className={cn(
                              'mt-1.5 text-center text-xs font-medium',
                              done ? 'text-foreground' : 'text-muted-foreground',
                            )}
                          >
                            {s.label}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <Card size="sm" className="mt-4">
              <CardContent className="divide-y divide-border">
                <div className="flex items-center justify-between pb-3">
                  <span className="text-sm text-muted-foreground">Nama</span>
                  <span className="font-medium">{o.customer_name}</span>
                </div>
                {o.items.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 py-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                      {it.quantity}x
                    </span>
                    <span className="flex-1 truncate text-sm font-medium">{it.product_name}</span>
                    <span className="text-sm">{rupiah(it.subtotal)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <strong>{rupiah(o.total_amount)}</strong>
                </div>
                <div className="flex items-center justify-between pt-3">
                  <span className="text-sm text-muted-foreground">Pembayaran</span>
                  <Badge
                    variant={o.payment_status === 'paid' ? 'outline' : 'secondary'}
                    className={o.payment_status === 'paid' ? 'gap-1.5' : ''}
                  >
                    {o.payment_status === 'paid' && <Check className="size-3.5" />}
                    {o.payment_status === 'paid' ? 'Sudah dibayar' : 'Belum dibayar'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <div className="mt-6 space-y-3">
              <Button asChild size="lg" className="w-full">
                <Link to="/menu">Pesan Lagi</Link>
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                Halaman menyegarkan otomatis setiap 5 detik.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  )
}