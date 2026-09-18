import { Link } from 'react-router-dom'
import { QrCode, Printer, LayoutDashboard, ArrowRight, Menu as MenuIcon } from 'lucide-react'
import hero from '../assets/hero.png'
import { Badge, Button, Card, CardContent } from '../components/ui'
import { useDocTitle } from '../hooks/useDocTitle'

const FEATURES = [
  {
    icon: QrCode,
    title: 'Pesan Lewat QR Meja',
    desc: 'Pelanggan scan QR di meja, lihat menu & checkout dari HP sendiri. Tanpa antre.',
  },
  {
    icon: Printer,
    title: 'Layar Kasir (POS)',
    desc: 'Pesanan masuk real-time ke kasir. Proses, terima pembayaran, stok berkurang otomatis.',
  },
  {
    icon: LayoutDashboard,
    title: 'Dashboard Multi-Cabang',
    desc: 'Pantau semua cabang, produk, laporan penjualan, dan pengguna dari satu tempat.',
  },
]

export default function Landing() {
  useDocTitle('bqrder — POS Multi-Cabang untuk Restoran & Kafe via QR')

  return (
    <div className="min-h-dvh bg-muted/40">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <QrCode className="size-5" />
          bqrder
        </span>
        <Button asChild variant="outline" size="sm">
          <Link to="/login">Masuk</Link>
        </Button>
      </nav>

      <header className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/70 text-primary-foreground">
        <div className="pointer-events-none absolute -top-16 -right-16 size-64 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 size-72 rounded-full bg-white/10" />
        <div className="relative mx-auto max-w-5xl px-6 py-16">
          <Badge variant="secondary" className="bg-white/15 text-primary-foreground hover:bg-white/15">
            Free & open source (BUSL-1.1)
          </Badge>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            POS Multi-Cabang untuk Restoran & Kafe
          </h1>
          <p className="mt-3 max-w-xl text-base text-primary-foreground/80">
            Pelanggan pesan lewat QR meja, kasir olah di layar POS, dan kamu pantau semua cabang
            dalam satu dashboard.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="bg-background text-foreground shadow-lg hover:bg-background/90">
              <Link to="/login" className="flex items-center gap-2">
                Mulai Sekarang <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
              <Link to="/menu" className="flex items-center gap-2">
                <MenuIcon className="size-4" /> Lihat Simulasi Menu
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        <div className="-mt-10 mb-10 flex justify-center">
          <img
            src={hero}
            alt="bqrder — menu digital, POS, dan dashboard admin"
            className="w-full max-w-3xl rounded-2xl shadow-2xl ring-1 ring-foreground/10"
            loading="lazy"
          />
        </div>

        <section className="pb-16">
          <h2 className="text-center text-2xl font-bold tracking-tight">Kenapa bqrder?</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title}>
                <CardContent className="space-y-2 p-5">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/5 text-primary">
                    <f.icon className="size-5" />
                  </span>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t bg-background">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-muted-foreground sm:flex-row">
          <span className="font-semibold text-foreground">bqrder</span>
          <span>Self-host gratis · Open source (BUSL-1.1)</span>
        </div>
      </footer>
    </div>
  )
}