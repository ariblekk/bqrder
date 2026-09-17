import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { get, post } from '../api/client'
import OrderDetailDialog, { fmtRp } from '../components/pos/OrderDetailDialog'
import PosHeader from '../components/pos/PosHeader'
import ReceiptDialog from '../components/pos/ReceiptDialog'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
} from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import type { Order, Product } from '../api/types'

interface CartLine {
  product: Product
  qty: number
}

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'baru saja'
  if (m < 60) return `${m} mnt lalu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} jam lalu`
  return `${Math.floor(h / 24)} hari lalu`
}

export default function Pos() {
  const { user } = useAuth()
  const nav = useNavigate()
  const { data: orders, reload } = useAsync(() => get<Order[]>('/pos/orders'), [])
  const { data: prods } = useAsync(() => get<Product[]>('/pos/products?limit=100'), [])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [customer, setCustomer] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState('')
  const [payOpen, setPayOpen] = useState(false)
  const [paidId, setPaidId] = useState<number | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [selected, setSelected] = useState<Order | null>(null)

  useEffect(() => {
    const t = setInterval(reload, 15000)
    return () => clearInterval(t)
  }, [reload])

  const allOrders = orders?.data ?? []
  const needsAttention = allOrders.filter(
    (o) => (o.payment_status === 'unpaid' && o.status !== 'cancelled') || (o.payment_status === 'paid' && o.status === 'pending'),
  )
  const products = prods?.data.filter((p) => p.is_active) ?? []
  const q = search.trim().toLowerCase()
  const filtered = q ? products.filter((p) => p.name.toLowerCase().includes(q)) : products
  const categories = [...new Set(filtered.map((p) => p.category_name || 'Lainnya'))]
  const total = cart.reduce((s, l) => s + l.product.price * l.qty, 0)
  const itemCount = cart.reduce((s, l) => s + l.qty, 0)

  function addToCart(p: Product) {
    setCart((prev) => {
      const found = prev.find((l) => l.product.id === p.id)
      if (found) {
        if (found.qty >= p.stock) return prev
        return prev.map((l) => (l.product.id === p.id ? { ...l, qty: l.qty + 1 } : l))
      }
      return p.stock < 1 ? prev : [...prev, { product: p, qty: 1 }]
    })
  }

  function changeQty(id: number, delta: number) {
    setCart((prev) =>
      prev.map((l) => (l.product.id === id ? { ...l, qty: l.qty + delta } : l)).filter((l) => l.qty > 0),
    )
  }

  async function submit(pay: boolean) {
    if (!user) return
    setBusy(true)
    setDone('')
    try {
      const res = await post<Order>('/pos/orders/direct', {
        customer_name: customer,
        items: cart.map((l) => ({ product_id: l.product.id, quantity: l.qty })),
        pay,
      })
      setCart([])
      setCustomer('')
      setPayOpen(false)
      reload()
      if (pay) {
        setPaidId(res.data.id)
        setReceiptOpen(true)
      }
    } catch (e) {
      setDone((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden p-4">
      <PosHeader
        title="bqrder — POS"
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Pesanan" className="relative">
                <Bell />
                {needsAttention.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
                    {needsAttention.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-96 w-80 overflow-y-auto p-1">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Pesanan</span>
                {needsAttention.length > 0 && (
                  <Badge variant="destructive" className="text-[10px]">{needsAttention.length} perlu tindakan</Badge>
                )}
              </DropdownMenuLabel>
              {allOrders.length === 0 ? (
                <DropdownMenuItem disabled>Tidak ada pesanan.</DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuSeparator />
                  {allOrders.slice(0, 5).map((o) => {
                    const needsPay = o.payment_status === 'unpaid' && o.status !== 'cancelled'
                    const needsProses = o.payment_status === 'paid' && o.status === 'pending'
                    const needsAction = needsPay || needsProses
                    const firstItem = o.items[0]?.product_name
                    return (
                      <DropdownMenuItem key={o.id} onClick={() => setSelected(o)}>
                        <div className="flex w-full items-center gap-2 py-1">
                          <span
                            className={`size-1.5 shrink-0 rounded-full ${
                              needsAction ? 'bg-destructive' : o.payment_status === 'paid' && o.status === 'completed' ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className={`truncate text-xs ${needsAction ? 'font-semibold' : ''}`}>
                              {o.order_number}
                              {firstItem && <span className="font-normal text-muted-foreground"> · {firstItem}</span>}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {timeAgo(o.created_at)} · {fmtRp(o.total_amount)}
                            </p>
                          </div>
                          {needsPay && (
                            <Badge variant="destructive" className="text-[10px]">Bayar</Badge>
                          )}
                          {needsProses && (
                            <Badge variant="secondary" className="text-[10px]">Proses</Badge>
                          )}
                        </div>
                      </DropdownMenuItem>
                    )
                  })}
                </>
              )}
              {allOrders.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => nav('/pos/orders')}
                    className="justify-center font-medium text-primary"
                  >
                    Lihat semua pesanan hari ini ({allOrders.length})
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      {(done) && <p className="mb-2 text-sm font-medium text-destructive">{done}</p>}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:grid-rows-[minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col gap-3">
          <h3 className="text-base font-semibold">Produk</h3>
          <Input placeholder="Cari produk..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {categories.map((cat) => (
              <div key={cat} className="mb-3">
                <p className="mb-2 text-sm font-semibold">{cat}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                  {filtered
                    .filter((p) => (p.category_name || 'Lainnya') === cat)
                    .map((p) => {
                      const qty = cart.find((l) => l.product.id === p.id)?.qty ?? 0
                      return (
                        <button
                          key={p.id}
                          type="button"
                          disabled={p.stock === 0}
                          onClick={() => addToCart(p)}
                          className="relative flex h-full flex-col items-stretch gap-1.5 overflow-hidden rounded-lg border p-0 text-left text-sm transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <div className="relative aspect-4/3 w-full shrink-0 bg-muted">
                            {p.image_url ? (
                              <img
                                className="size-full object-cover"
                                src={p.image_url}
                                alt={p.name}
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                                No image
                              </div>
                            )}
                            {qty > 0 && <Badge className="absolute top-1 right-1">{qty}</Badge>}
                          </div>
                          <div className="flex flex-1 flex-col gap-0.5 p-1.5">
                            <span className="truncate font-medium">{p.name}</span>
                            <span className="text-muted-foreground">Rp {p.price.toLocaleString('id-ID')}</span>
                            <span className="mt-auto text-xs text-muted-foreground">stok {p.stock}</span>
                          </div>
                        </button>
                      )
                    })}
                </div>
              </div>
            ))}
            {prods && !filtered.length && (
              <p className="text-sm text-muted-foreground">Produk tidak ditemukan.</p>
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col">
          <Card size="sm" className="flex h-full flex-col">
            <CardContent className="flex flex-1 flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Pesanan</h3>
                <span className="text-sm text-muted-foreground">{itemCount} item</span>
              </div>
              {cart.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-md border border-dashed">
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Belum ada produk dipilih.
                </p>
              </div>
              ) : (
                <ul className="m-0 flex-1 list-none space-y-1 overflow-y-auto p-0 text-sm">
                  {cart.map((l) => (
                    <li key={l.product.id} className="flex items-center gap-2">
                      <span className="flex-1">
                        {l.product.name} — Rp {(l.product.price * l.qty).toLocaleString('id-ID')}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => changeQty(l.product.id, -1)}>
                        −
                      </Button>
                      <span className="min-w-4 text-center">{l.qty}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={l.qty >= l.product.stock}
                        onClick={() => changeQty(l.product.id, 1)}
                      >
                        +
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => changeQty(l.product.id, -l.qty)}>
                        x
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <Input
                placeholder="Nama pelanggan"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
              />
              <div className="flex items-center justify-between">
                <strong>Total: Rp {total.toLocaleString('id-ID')}</strong>
              </div>
              <Button disabled={!customer || cart.length === 0 || busy} onClick={() => setPayOpen(true)}>
                {busy ? 'Memproses...' : 'Buat Pesanan'}
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen} title="Metode Pembayaran">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {customer} • Rp {total.toLocaleString('id-ID')}
          </p>
          <Button disabled={busy} onClick={() => submit(true)}>
            Tunai (langsung dibayar)
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => submit(false)}>
            Bayar di tempat
          </Button>
        </div>
      </Dialog>

      <ReceiptDialog
        orderId={paidId}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        onError={setDone}
      />

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