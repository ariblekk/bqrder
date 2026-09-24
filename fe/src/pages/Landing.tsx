import { Link } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  Boxes,
  Check,
  LayoutDashboard,
  Printer,
  QrCode,
  ReceiptText,
  ScanLine,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { Badge, Button, Card, CardContent } from "../components/ui";
import { useDocTitle } from "../hooks/useDocTitle";
import logo from "../assets/logo.png";

const FEATURES = [
  {
    icon: QrCode,
    title: "Order lewat QR meja",
    desc: "Pelanggan scan QR, pilih menu, dan checkout langsung dari ponsel. Tanpa antre, tanpa aplikasi tambahan.",
  },
  {
    icon: Printer,
    title: "POS real-time",
    desc: "Pesanan masuk ke kasir seketika. Pembayaran, status order, dan stok tetap sinkron di semua perangkat.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard multi-cabang",
    desc: "Kelola cabang, produk, laporan, dan pengguna dari satu workspace terpusat. Bukan empat tools terpisah.",
  },
];

const STEPS = [
  {
    icon: ScanLine,
    title: "Pelanggan memesan",
    desc: "Scan QR di meja, telusuri menu, kirim order. Nomor pesanan muncul otomatis.",
  },
  {
    icon: ReceiptText,
    title: "Kasir memproses",
    desc: "Order tampil di layar POS. Proses, terima pembayaran, stok berkurang sendiri.",
  },
  {
    icon: Activity,
    title: "Semua terpantau",
    desc: "Pelanggan memantau status, pemilik melihat penjualan lintas cabang secara langsung.",
  },
];

const STATS = [
  { value: "3", label: "Modul inti: menu, POS, admin" },
  { value: "4", label: "Peran akses berjenjang" },
  { value: "1", label: "Perintah untuk deploy" },
  { value: "0", label: "Vendor lock-in" },
];

const STACK = ["Go", "Gin", "PostgreSQL", "React", "Vite", "Docker"];

const LICENSE_POINTS = [
  "Self-host gratis untuk satu deployment operasional usahamu.",
  "Butuh lebih dari satu project atau menjualnya sebagai SaaS? Pakai lisensi komersial.",
  "18 September 2030 lisensi otomatis berganti ke Apache 2.0.",
];

const ORDERS = [
  {
    id: "A-014",
    table: "Meja 7",
    items: "3 item",
    total: "Rp84.000",
    status: "Baru",
    tone: "bg-amber-100 text-amber-800",
  },
  {
    id: "A-013",
    table: "Meja 2",
    items: "5 item",
    total: "Rp132.000",
    status: "Diproses",
    tone: "bg-blue-100 text-blue-800",
  },
  {
    id: "A-012",
    table: "Meja 11",
    items: "2 item",
    total: "Rp46.000",
    status: "Dibayar",
    tone: "bg-emerald-100 text-emerald-800",
  },
];

function SectionLabel({ index, children }: { index: string; children: string }) {
  return (
    <p className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
      <span className="text-primary">{index}</span>
      <span className="h-px w-6 bg-border" />
      {children}
    </p>
  );
}

function AppPreview() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-8 rounded-3xl bg-primary/[0.07] blur-3xl" />
      <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-foreground/10">
        <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2.5">
          <span className="size-2.5 rounded-full bg-destructive/70" />
          <span className="size-2.5 rounded-full bg-muted-foreground/30" />
          <span className="size-2.5 rounded-full bg-primary/50" />
          <span className="ml-3 font-mono text-[11px] text-muted-foreground">
            qrdigo / pos
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            live
          </span>
        </div>

        <div className="flex">
          <aside className="hidden w-36 shrink-0 flex-col gap-1 border-r border-border bg-muted/20 p-3 sm:flex">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <img src={logo} alt="" className="size-5 rounded" />
              qrdigo
            </span>
            {["Dashboard", "POS", "Meja", "Produk", "Laporan"].map((item, i) => (
              <span
                key={item}
                className={
                  "rounded-md px-2 py-1.5 text-xs " +
                  (i === 1
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground")
                }
              >
                {item}
              </span>
            ))}
          </aside>

          <div className="min-w-0 flex-1 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium">Pesanan masuk</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                hari ini
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {ORDERS.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">
                      <span className="font-mono text-muted-foreground">
                        #{order.id}
                      </span>{" "}
                      · {order.table}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {order.items} · {order.total}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={"border-transparent " + order.tone}
                  >
                    {order.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-6 -left-4 hidden items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 shadow-lg sm:flex">
        <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <QrCode className="size-4" />
        </span>
        <div>
          <p className="text-xs font-medium">Meja 07</p>
          <p className="font-mono text-[10px] text-muted-foreground">
            scan · pesan · bayar
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  useDocTitle("qrdigo — POS open source untuk restoran & kafe");

  return (
    <div className="min-h-dvh bg-background font-sans text-foreground selection:bg-primary/20">
      <nav className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 font-semibold tracking-tight transition-opacity hover:opacity-80"
            aria-label="qrdigo beranda"
          >
            <img src={logo} alt="" className="size-7 rounded-md" />
            qrdigo
          </Link>

          <div className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a href="#fitur" className="transition-colors hover:text-foreground">
              Fitur
            </a>
            <a href="#alur" className="transition-colors hover:text-foreground">
              Alur
            </a>
            <a
              href="#self-host"
              className="transition-colors hover:text-foreground"
            >
              Self-host
            </a>
            <a
              href="#lisensi"
              className="transition-colors hover:text-foreground"
            >
              Lisensi
            </a>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Masuk</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/login" className="flex items-center gap-1.5">
                Coba sekarang <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      <header className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 opacity-[0.15] [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-primary/[0.06] blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <Badge
              variant="secondary"
              className="rounded-full border border-border bg-muted/50 px-3 py-1 font-mono text-[11px] tracking-wide text-muted-foreground"
            >
              <span className="mr-1.5 size-1.5 rounded-full bg-emerald-500" />
              BUSL-1.1 · self-hostable
            </Badge>

            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-[-0.045em] sm:text-5xl lg:text-[3.5rem]">
              POS open source untuk restoran &amp; kafe.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              qrdigo menyatukan order QR meja, kasir, stok, dan operasional
              multi-cabang dalam satu platform yang kamu jalankan sendiri — di
              servermu, dengan datamu.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-10 px-4">
                <Link to="/login" className="flex items-center gap-2">
                  Mulai sekarang <ArrowUpRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-10 px-4">
                <a href="#self-host">Lihat cara self-host</a>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {[
                "Tanpa vendor lock-in",
                "Gratis untuk 1 deployment",
                "Bisa di-audit sepenuhnya",
              ].map((benefit) => (
                <span key={benefit} className="flex items-center gap-2">
                  <Check className="size-3.5 text-primary" />
                  {benefit}
                </span>
              ))}
            </div>
          </div>

          <AppPreview />
        </div>
      </header>

      <div className="border-b border-border bg-muted/20">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-5 py-5 font-mono text-xs text-muted-foreground sm:px-8">
          <span className="uppercase tracking-[0.18em]">Dibangun dengan</span>
          {STACK.map((tech) => (
            <span key={tech} className="text-foreground/70">
              {tech}
            </span>
          ))}
        </div>
      </div>

      <section className="bg-foreground text-background">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-background/10 px-5 sm:px-8 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="px-4 py-10 first:pl-0 sm:px-6">
              <p className="font-mono text-4xl font-semibold tracking-tight sm:text-5xl">
                {stat.value}
              </p>
              <p className="mt-3 max-w-[12rem] text-sm leading-6 text-background/60">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-5 sm:px-8">
        <section id="fitur" className="scroll-mt-20 border-b border-border py-20 sm:py-28">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div className="max-w-xl">
              <SectionLabel index="01">Fitur</SectionLabel>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                Semua alur restoran, satu tempat.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              Dari meja pelanggan sampai laporan pemilik, tiap proses dirancang
              supaya sederhana — dan tetap bisa kamu kustom.
            </p>
          </div>

          <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc }, index) => (
              <Card
                key={title}
                className="rounded-none border-0 bg-background shadow-none"
              >
                <CardContent className="group h-full p-7 transition-colors hover:bg-muted/30 sm:p-8">
                  <div className="flex items-start justify-between">
                    <span className="flex size-10 items-center justify-center rounded-md border border-border bg-muted/40 text-foreground transition-colors group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary">
                      <Icon className="size-5" />
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-8 text-base font-medium">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="alur" className="scroll-mt-20 border-b border-border py-20 sm:py-28">
          <SectionLabel index="02">Alur</SectionLabel>
          <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            Tiga langkah, dari pesan sampai dibayar.
          </h2>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, desc }, index) => (
              <div key={title} className="relative">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <Icon className="size-4" />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    Langkah {index + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-base font-medium">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="self-host"
          className="scroll-mt-20 border-b border-border py-20 sm:py-28"
        >
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <SectionLabel index="03">Self-host</SectionLabel>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                Jalankan di servermu dalam satu perintah.
              </h2>
              <p className="mt-5 max-w-lg text-sm leading-7 text-muted-foreground">
                Backend Go, PostgreSQL, dan frontend React sudah dikemas dalam
                Docker Compose. Pakai Supabase atau Postgres lokal — keduanya
                jalan tanpa mengubah kode.
              </p>
              <div className="mt-7 flex flex-col gap-3 text-sm">
                {[
                  { icon: Boxes, text: "API + web + database satu stack" },
                  {
                    icon: ShieldCheck,
                    text: "JWT, rate limit, dan HSTS aktif di produksi",
                  },
                ].map(({ icon: Icon, text }) => (
                  <span key={text} className="flex items-center gap-3">
                    <Icon className="size-4 text-primary" />
                    <span className="text-muted-foreground">{text}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-foreground shadow-xl">
              <div className="flex items-center gap-2 border-b border-background/10 px-4 py-3">
                <Terminal className="size-4 text-background/60" />
                <span className="font-mono text-xs text-background/60">
                  terminal
                </span>
              </div>
              <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-7 text-background/90">
                <code>
                  <span className="text-background/40"># siapkan env</span>
                  {"\n"}
                  <span className="text-emerald-400">$</span> cp .env.example
                  .env{"\n\n"}
                  <span className="text-background/40">
                    # bangun &amp; jalankan
                  </span>
                  {"\n"}
                  <span className="text-emerald-400">$</span> docker compose up
                  -d --build{"\n\n"}
                  <span className="text-background/40"># cek status</span>
                  {"\n"}
                  <span className="text-emerald-400">$</span> curl
                  localhost:8080/api/v1/health{"\n"}
                  <span className="text-background/50">
                    {"{ \"status\": \"ok\" }"}
                  </span>
                </code>
              </pre>
            </div>
          </div>
        </section>

        <section id="lisensi" className="scroll-mt-20 py-20 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div>
              <SectionLabel index="04">Lisensi</SectionLabel>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                Sumber terbuka, dengan aturan yang jelas.
              </h2>
              <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">
                qrdigo memakai Business Source License 1.1. Baca kodenya,
                modifikasi, dan jalankan untuk bisnismu sendiri.
              </p>
              <Badge
                variant="secondary"
                className="mt-6 rounded-md border border-border bg-muted/50 px-3 py-1 font-mono text-[11px]"
              >
                BUSL-1.1 → Apache-2.0
              </Badge>
            </div>

            <ul className="flex flex-col divide-y divide-border border-y border-border">
              {LICENSE_POINTS.map((point, index) => (
                <li key={point} className="flex items-start gap-4 py-5">
                  <span className="mt-0.5 font-mono text-xs text-muted-foreground">
                    0{index + 1}
                  </span>
                  <span className="text-sm leading-6 text-muted-foreground">
                    {point}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <section className="border-t border-border bg-muted/20">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-16 sm:flex-row sm:items-center sm:px-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              Siap menjalankan POS-mu sendiri?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Setup awal butuh waktu kurang dari lima menit.
            </p>
          </div>
          <Button asChild size="lg" className="h-10 px-4">
            <Link to="/login" className="flex items-center gap-2">
              Mulai sekarang <ArrowUpRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-2.5 font-semibold">
          <img src={logo} alt="" className="size-6 rounded-md" />
          qrdigo
        </div>
        <p className="text-sm text-muted-foreground">
          Dibuat untuk restoran independen · Open source (BUSL-1.1)
        </p>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#fitur" className="transition-colors hover:text-foreground">
            Fitur
          </a>
          <a
            href="#self-host"
            className="transition-colors hover:text-foreground"
          >
            Self-host
          </a>
          <Link to="/login" className="transition-colors hover:text-foreground">
            Masuk
          </Link>
        </div>
      </footer>
    </div>
  );
}
