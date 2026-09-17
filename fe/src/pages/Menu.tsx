import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, ShoppingBag } from 'lucide-react'
import { get } from '../api/client'
import type { MenuCategory, Table } from '../api/types'
import {
  Badge,
  Button,
  Card,
  Empty,
  EmptyContent,
  EmptyDescription,
  Skeleton,
} from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { cn } from '../lib/utils'

const CART_KEY = 'bqrder_cart'
const QR_KEY = 'bqrder_qr'

export interface CartLine {
  product: { id: number; name: string; price: number; image_url?: string }
  qty: number
}

export function getCart(): CartLine[] {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]')
  } catch {
    return []
  }
}
export function setCart(cart: CartLine[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart))
}
export function getQr() {
  return localStorage.getItem(QR_KEY) || ''
}

const rupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

export default function Menu() {
  const [params] = useSearchParams()
  const qr = params.get('qr') || getQr()
  if (params.get('qr')) localStorage.setItem(QR_KEY, qr)

  const [cart, setCartState] = useState<CartLine[]>(getCart)
  const [active, setActive] = useState('')
  const { data, err } = useAsync(
    () => get<MenuCategory[]>(`/public/menu?qr_token=${qr}`),
    [qr],
  )
  const { data: table } = useAsync(() => get<Table>(`/public/table/${qr}`), [qr])
  const total = cart.reduce((s, l) => s + l.product.price * l.qty, 0)
  const count = cart.reduce((s, l) => s + l.qty, 0)

  const cats = data?.data ?? []
  const products = active
    ? cats.find((c) => c.name === active)?.products ?? []
    : cats.flatMap((c) => c.products)

  function add(p: { id: number; name: string; price: number; image_url?: string }, qty: number) {
    setCartState((prev) => {
      const found = prev.find((l) => l.product.id === p.id)
      const next = found
        ? prev.map((l) => (l.product.id === p.id ? { ...l, qty: Math.max(0, l.qty + qty) } : l))
        : [...prev, { product: p, qty }]
        .filter((l) => l.qty > 0)
      setCart(next)
      return next
    })
  }

  return (
    <div className="min-h-dvh bg-muted/40 pb-28">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/70 text-primary-foreground">
        <div className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 size-56 rounded-full bg-white/10" />
        <header className="mx-auto max-w-xl px-6 py-10">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest opacity-80">
            <ShoppingBag className="size-4" />
            Menu Digital
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            {table?.data ? `Meja ${table.data.table_number}` : 'bqrder'}
          </h1>
          <p className="mt-1 text-sm text-primary-foreground/80">
            Pilih menu favoritmu, pesan, dan nikmati.
          </p>
        </header>
      </div>

      <div className="mx-auto max-w-xl">
        {err && <p className="px-6 pt-4 text-sm font-medium text-destructive">{err}</p>}

        {cats.length > 0 && (
          <div className="sticky top-0 z-10 bg-background/90 px-4 py-3 backdrop-blur">
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              <Pill active={active === ''} onClick={() => setActive('')}>
                Semua
              </Pill>
              {cats.map((c) => (
                <Pill key={c.id} active={active === c.name} onClick={() => setActive(c.name)}>
                  {c.name}
                </Pill>
              ))}
            </div>
          </div>
        )}

        {!data && !err && (
          <div className="grid grid-cols-2 gap-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-xl bg-background">
                <Skeleton className="aspect-4/3 w-full rounded-none" />
                <div className="space-y-2 p-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {data && !data.data.length && (
          <div className="px-4 py-10">
            <Empty>
              <EmptyContent>
                <EmptyDescription>Tidak ada menu untuk saat ini.</EmptyDescription>
              </EmptyContent>
            </Empty>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 p-4">
          {products.map((p) => {
            const qty = cart.find((l) => l.product.id === p.id)?.qty ?? 0
            const soldOut = p.stock === 0
            return (
              <Card
                key={p.id}
                size="sm"
                className={cn('overflow-hidden p-0', soldOut && 'opacity-70')}
              >
                <button
                  type="button"
                  disabled={soldOut}
                  className="block w-full text-left"
                  onClick={() => add(p, 1)}
                >
                  <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
                    {p.image_url ? (
                      <img
                        className={cn('size-full object-cover transition-transform duration-300', !soldOut && 'hover:scale-105')}
                        src={p.image_url}
                        alt={p.name}
                        loading="lazy"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                        No image
                      </div>
                    )}
                    {soldOut && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                        <Badge variant="destructive">Habis</Badge>
                      </div>
                    )}
                  </div>
                </button>
                <div className="p-3">
                  <h3 className="line-clamp-1 font-semibold">{p.name}</h3>
                  {p.description && (
                    <p className="mt-0.5 line-clamp-2 min-h-8 text-xs text-muted-foreground">
                      {p.description}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="font-bold">{rupiah(p.price)}</span>
                    {qty === 0 ? (
                      <Button
                        size="icon-sm"
                        variant="outline"
                        className="rounded-full"
                        disabled={soldOut}
                        aria-label={`Tambah ${p.name}`}
                        onClick={() => add(p, 1)}
                      >
                        +
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1.5 rounded-full border px-1 py-0.5">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="size-6 rounded-full"
                          onClick={() => add(p, -1)}
                        >
                          −
                        </Button>
                        <span className="min-w-5 text-center text-sm font-semibold">{qty}</span>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="size-6 rounded-full"
                          disabled={soldOut}
                          onClick={() => add(p, 1)}
                        >
                          +
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-20 px-4">
          <Button asChild size="lg" className="mx-auto flex h-14 w-full max-w-xl shadow-xl">
            <Link to="/checkout" className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                  {count}
                </span>
                {rupiah(total)}
              </span>
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                  Lihat Pesanan
                  <ArrowRight className="size-4" />
                </span>
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'bg-muted text-muted-foreground hover:bg-secondary',
      )}
    >
      {children}
    </button>
  )
}
