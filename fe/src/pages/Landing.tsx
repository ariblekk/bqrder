import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Check,
  LayoutDashboard,
  Menu as MenuIcon,
  Printer,
  QrCode,
  Sparkles,
} from "lucide-react";
import hero from "../assets/hero.png";
import { Badge, Button, Card, CardContent } from "../components/ui";
import { useDocTitle } from "../hooks/useDocTitle";

const FEATURES = [
  {
    icon: QrCode,
    title: "Order lewat QR meja",
    desc: "Pelanggan scan QR, pilih menu, dan checkout langsung dari ponsel tanpa antre.",
  },
  {
    icon: Printer,
    title: "POS real-time",
    desc: "Pesanan masuk langsung ke kasir. Pembayaran, status order, dan stok tetap sinkron.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard multi-cabang",
    desc: "Kelola cabang, produk, laporan, dan pengguna dari satu workspace yang terpusat.",
  },
];

const BENEFITS = [
  "Open source dan self-hostable",
  "Tanpa vendor lock-in",
  "Dibuat untuk bisnis yang berkembang",
];

export default function Landing() {
  useDocTitle("qrdigo — Open Source POS untuk Restoran & Kafe");

  return (
    <div className="min-h-dvh bg-[#1c1c1c] text-[#ededed] selection:bg-[#3ecf8e]/30 selection:text-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between border-b border-white/[0.08] px-5 py-5 sm:px-8">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-white transition-opacity hover:opacity-80"
          aria-label="qrdigo beranda"
        >
          <span className="flex size-8 items-center justify-center rounded-md bg-[#3ecf8e] text-[#111] shadow-[0_0_24px_rgba(62,207,142,0.25)]">
            <QrCode className="size-[18px]" strokeWidth={2.5} />
          </span>
          qrdigo
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-[#969696] sm:inline">
            Open source POS
          </span>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-white/15 bg-transparent text-[#ededed] hover:border-white/30 hover:bg-white/[0.06] hover:text-white"
          >
            <Link to="/login">Masuk</Link>
          </Button>
        </div>
      </nav>

      <header className="relative overflow-hidden border-b border-white/[0.08]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(62,207,142,0.16),transparent_45%)]" />
        <div className="pointer-events-none absolute -left-24 top-32 size-72 rounded-full bg-[#3ecf8e]/[0.05] blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-20 sm:px-8 sm:pb-28 sm:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge
              variant="secondary"
              className="rounded-full border border-[#3ecf8e]/25 bg-[#3ecf8e]/10 px-3 py-1 text-[#3ecf8e] hover:bg-[#3ecf8e]/15"
            >
              <Sparkles className="mr-1.5 inline size-3.5" />
              Open source · Self-hostable · BUSL-1.1
            </Badge>
            <h1 className="mt-7 text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
              The open source POS for restaurants.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[#a1a1a1] sm:text-lg">
              qrdigo menghubungkan order QR, kasir, stok, dan operasional
              multi-cabang dalam satu platform yang cepat, fleksibel, dan mudah
              kamu kontrol.
            </p>

            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="rounded-md bg-[#3ecf8e] px-6 font-medium text-[#111] shadow-[0_0_28px_rgba(62,207,142,0.18)] hover:bg-[#46d998]"
              >
                <Link to="/login" className="flex items-center gap-2">
                  Mulai Sekarang <ArrowUpRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-md border-white/15 bg-white/[0.03] px-6 text-[#ededed] hover:border-white/30 hover:bg-white/[0.08] hover:text-white"
              >
                <Link to="/menu" className="flex items-center gap-2">
                  <MenuIcon className="size-4" /> Lihat Demo
                </Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-[#8f8f8f]">
              {BENEFITS.map((benefit) => (
                <span key={benefit} className="flex items-center gap-2">
                  <Check className="size-3.5 text-[#3ecf8e]" />
                  {benefit}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto mt-16 max-w-5xl sm:mt-20">
            <div className="pointer-events-none absolute -inset-6 rounded-2xl bg-[#3ecf8e]/10 blur-3xl" />
            <div className="relative rounded-xl border border-white/[0.14] bg-[#242424] p-2 shadow-2xl shadow-black/40 sm:p-3">
              <div className="mb-2 flex items-center gap-1.5 px-2 sm:mb-3">
                <span className="size-2 rounded-full bg-[#ef4444]/80" />
                <span className="size-2 rounded-full bg-[#eab308]/80" />
                <span className="size-2 rounded-full bg-[#22c55e]/80" />
                <span className="ml-2 text-[11px] text-[#666]">
                  app.qrdigo.local
                </span>
              </div>
              <img
                src={hero}
                alt="Dashboard menu digital, POS, dan admin qrdigo"
                className="w-full rounded-lg border border-white/[0.08]"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 sm:px-8">
        <section
          className="border-b border-white/[0.08] py-20 sm:py-24"
          aria-labelledby="features-heading"
        >
          <div className="mb-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-sm text-[#3ecf8e]">
                01 — Built for flow
              </p>
              <h2
                id="features-heading"
                className="mt-3 max-w-xl text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl"
              >
                Semua alur kerja restoran, terhubung.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-[#8f8f8f]">
              Dari meja pelanggan sampai laporan pemilik, qrdigo membuat setiap
              proses terasa sederhana.
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-lg border border-white/[0.1] bg-white/[0.1] md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc }, index) => (
              <Card
                key={title}
                className="rounded-none border-0 bg-[#1c1c1c] shadow-none"
              >
                <CardContent className="group p-7 sm:p-8">
                  <div className="flex items-start justify-between">
                    <span className="flex size-10 items-center justify-center rounded-md border border-[#3ecf8e]/20 bg-[#3ecf8e]/10 text-[#3ecf8e] transition-colors group-hover:bg-[#3ecf8e] group-hover:text-[#111]">
                      <Icon className="size-5" />
                    </span>
                    <span className="font-mono text-xs text-[#666]">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-8 text-base font-medium text-white">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#8f8f8f]">
                    {desc}
                  </p>
                  <Link
                    to="/login"
                    className="mt-6 inline-flex items-center gap-1.5 text-sm text-[#3ecf8e] transition-colors hover:text-[#6ee7ad]"
                  >
                    Pelajari lebih lanjut <ArrowUpRight className="size-3.5" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-[#777] sm:flex-row sm:px-8">
        <span className="font-semibold text-white">qrdigo</span>
        <span>Built for independent restaurants · Open source (BUSL-1.1)</span>
      </footer>
    </div>
  );
}
