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
import { useDocTitle } from '../hooks/useDocTitle'
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

  const { data: table } = useAsync(() => get<Table>(`/public/table/${qr}`), [qr])
  useDocTitle(table?.data ? `Menu ${table.data.branch_name || 'Digital'} — Meja ${table.data.table_number}` : 'Menu Digital')

  const [cart, setCartState] = useState<CartLine[]>(getCart)
  const [active, setActive] = useState('')
  const { data, err } = useAsync(
    () => get<MenuCategory[]>(`/public/menu?qr_token=${qr}`),
    [qr],
  )
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
        <header className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest opacity-80">
            <ShoppingBag className="size-4" />
            Selamat datang di
          </div>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight">
            {table?.data?.branch_name || 'Menu'}
          </h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-primary-foreground/80">
            {table?.data && (
              <Badge variant="secondary" className="bg-white/15 text-primary-foreground hover:bg-white/15">
                Meja {table.data.table_number}
              </Badge>
            )}
            Pilih menu favoritmu, pesan, dan nikmati.
          </p>
        </header>
      </div>

      <div className="mx-auto w-full max-w-2xl">
        {err && <p className="px-4 pt-3 text-sm font-medium text-destructive sm:px-6">{err}</p>}

        {cats.length > 0 && (
          <div className="sticky top-0 z-10 px-4 py-2 backdrop-blur sm:px-6">
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
          <div className="space-y-2 p-3 sm:p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3 rounded-xl bg-background p-2">
                <Skeleton className="size-20 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-1.5 py-1">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3.5 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {data && !data.data.length && (
          <div className="px-3 py-8">
            <Empty>
              <EmptyContent>
                <EmptyDescription>Tidak ada menu untuk saat ini.</EmptyDescription>
              </EmptyContent>
            </Empty>
          </div>
        )}

        <div className="space-y-2 p-3 sm:p-4">
          {products.map((p) => {
            const qty = cart.find((l) => l.product.id === p.id)?.qty ?? 0
            const soldOut = p.stock === 0
            const hasSales = (p.total_sold ?? 0) > 0
            return (
              <Card
                key={p.id}
                size="sm"
                className={cn('p-0', soldOut && 'opacity-70')}
              >
                <div className="flex gap-3 p-2">
                  <button
                    type="button"
                    disabled={soldOut}
                    className="relative block size-20 shrink-0 overflow-hidden rounded-lg bg-muted"
                    onClick={() => add(p, 1)}
                  >
                    {p.image_url ? (
                      <img
                        className="size-full object-cover"
                        src={p.image_url}
                        alt={p.name}
                        loading="lazy"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        No image
                      </span>
                    )}
                    {soldOut && (
                      <span className="absolute inset-0 flex items-center justify-center bg-background/50">
                        <Badge variant="destructive">Habis</Badge>
                      </span>
                    )}
                  </button>

                  <div className="flex min-w-0 flex-1 flex-col py-0.5">
                    <h3 className="truncate text-sm font-semibold">{p.name}</h3>
                    {p.description && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {p.description}
                      </p>
                    )}
                    {hasSales && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Terjual {p.total_sold} item
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
                      <span className="text-sm font-bold">{rupiah(p.price)}</span>
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
                        <div className="flex h-8 items-center gap-1 rounded-full border px-1">
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
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-20 px-4">
          <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between gap-3 rounded-2xl bg-primary px-4 text-primary-foreground shadow-xl">
            <div className="min-w-0">
              <p className="text-xs opacity-80">{count} item dipilih</p>
              <p className="truncate text-lg font-bold leading-tight">{rupiah(total)}</p>
            </div>
            <Button asChild size="lg" className="h-10 bg-background px-5 text-foreground hover:bg-background/90">
              <Link to="/checkout" className="flex items-center gap-1.5">
                Lihat Pesanan
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
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
