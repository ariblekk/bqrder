import { useState, type FormEvent } from 'react'
import { ArrowLeft, ShoppingBag } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { post } from '../api/client'
import type { Order } from '../api/types'
import { Button, Card, CardContent, Input, Label } from '../components/ui'
import { getCart, getQr } from './Menu'

const rupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

export default function Checkout() {
  const nav = useNavigate()
  const qr = getQr()
  const [cart] = useState(getCart)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const total = cart.reduce((s, l) => s + l.product.price * l.qty, 0)
  const count = cart.reduce((s, l) => s + l.qty, 0)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      const res = await post<Order>(`/public/orders?qr_token=${qr}`, {
        customer_name: name,
        items: cart.map((l) => ({ product_id: l.product.id, quantity: l.qty })),
      })
      localStorage.removeItem('bqrder_cart')
      nav(`/o/${res.data.order_number}`)
    } catch (ex) {
      setErr((ex as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (!qr) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-2 px-4 text-center">
        <ShoppingBag className="size-10 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">bqrder</h1>
        <p className="text-sm text-muted-foreground">Scan QR di meja untuk mulai memesan.</p>
      </div>
    )
  }

  if (!cart.length) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted">
          <ShoppingBag className="size-8 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Keranjang kosong</h1>
          <p className="mt-1 text-sm text-muted-foreground">Yuk pilih menu favoritmu dulu.</p>
        </div>
        <Button asChild size="lg">
          <Link to="/menu">Lihat Menu</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-muted/40 pb-28">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="icon" aria-label="Kembali ke menu">
            <Link to="/menu">
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <h1 className="text-base font-bold">Checkout</h1>
            <p className="text-xs text-muted-foreground">{count} item dipilih</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pt-4">
        {err && (
          <p className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {err}
          </p>
        )}

        <Card size="sm">
          <CardContent className="divide-y divide-border">
            {cart.map((l) => (
              <div key={l.product.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="relative">
                  {l.product.image_url ? (
                    <img
                      src={l.product.image_url}
                      alt={l.product.name}
                      className="size-16 rounded-lg object-cover"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  ) : (
                    <div className="flex size-16 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                  <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow">
                    {l.qty}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{l.product.name}</p>
                  <p className="text-xs text-muted-foreground">{rupiah(l.product.price)} / pcs</p>
                </div>
                <span className="font-semibold">{rupiah(l.product.price * l.qty)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card size="sm" className="mt-4">
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <strong className="text-lg">{rupiah(total)}</strong>
            </div>
            <form className="flex flex-col gap-3" onSubmit={submit}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="customer">Nama Anda</Label>
                <Input
                  id="customer"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Contoh: Budi"
                  autoFocus
                />
              </div>
              <Button type="submit" size="lg" disabled={busy || !name.trim()}>
                {busy ? 'Memproses...' : `Bayar ${rupiah(total)}`}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Pembayaran diproses otomatis via payment gateway.
              </p>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}