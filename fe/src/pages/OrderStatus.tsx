import { useEffect } from "react";
import {
  ArrowLeft,
  Check,
  ChefHat,
  Clock3,
  PackageCheck,
  XCircle,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { get } from "../api/client";
import type { Order } from "../api/types";
import { Badge, Button, Card, CardContent, Skeleton } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { useDocTitle } from "../hooks/useDocTitle";
import { cn } from "../lib/utils";

const rupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

const STEPS = [
  { key: "pending", label: "Diterima", desc: "Pesananmu sudah masuk ke kasir" },
  {
    key: "processing",
    label: "Disiapkan",
    desc: "Dapur sedang menyiapkan pesanan",
  },
  { key: "completed", label: "Selesai", desc: "Pesanan siap dinikmati" },
];

const statusTitle: Record<string, { title: string; sub: string }> = {
  pending: {
    title: "Menunggu diproses",
    sub: "Kasir akan memproses pesananmu sebentar lagi.",
  },
  processing: {
    title: "Sedang disiapkan",
    sub: "Dapur sedang memasak pesananmu. Sabar ya!",
  },
  completed: {
    title: "Pesanan selesai",
    sub: "Silakan nikmati pesananmu. Selamat makan!",
  },
  cancelled: {
    title: "Pesanan dibatalkan",
    sub: "Pesanan tidak dapat diproses.",
  },
};

export default function OrderStatus() {
  const { orderNumber } = useParams();
  const { data, err, reload } = useAsync(
    () => get<Order>(`/public/orders/${orderNumber}`),
    [orderNumber],
  );
  useDocTitle(
    data?.data ? `Status ${data.data.order_number}` : "Status Pesanan",
  );

  useEffect(() => {
    const t = setInterval(reload, 5000);
    return () => clearInterval(t);
  }, [reload]);

  const o = data?.data;
  const cancelled = o?.status === "cancelled";
  const activeIdx =
    o?.status === "completed"
      ? 2
      : o?.status === "processing"
        ? 1
        : o?.status === "pending"
          ? 0
          : -1;
  const st = o ? (statusTitle[o.status] ?? { title: o.status, sub: "" }) : null;
  const count = o?.items.reduce((s, it) => s + it.quantity, 0) ?? 0;

  return (
    <div className="min-h-dvh bg-muted/40 pb-28">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3">
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label="Kembali ke menu"
          >
            <Link to="/menu">
              <ArrowLeft />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {o?.branch_name || "qrdigo"}
            </p>
            <h1 className="truncate text-sm font-bold">{o?.order_number}</h1>
          </div>
          {o && (
            <p className="shrink-0 text-base font-medium text-muted-foreground">
              {o.table_number
                ? `Meja ${o.table_number}`
                : "Pesanan bawa pulang"}
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 pt-4">
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
                  "px-4 py-6 text-center",
                  cancelled
                    ? "bg-destructive/10"
                    : activeIdx === 2
                      ? "bg-emerald-500/10"
                      : "bg-primary/5",
                )}
              >
                <div
                  className={cn(
                    "mx-auto flex size-16 items-center justify-center rounded-full text-white shadow-sm",
                    cancelled
                      ? "bg-destructive"
                      : activeIdx === 2
                        ? "bg-emerald-500"
                        : "bg-primary",
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
                      const done = i <= activeIdx;
                      return (
                        <div
                          key={s.key}
                          className="relative flex flex-col items-center"
                        >
                          {i < STEPS.length - 1 && (
                            <span
                              className={cn(
                                "absolute top-3 left-1/2 h-0.5 w-full",
                                i < activeIdx ? "bg-primary" : "bg-muted",
                              )}
                            />
                          )}
                          <span
                            className={cn(
                              "relative z-10 flex size-6 items-center justify-center rounded-full text-xs font-bold",
                              done
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {done ? <Check className="size-3.5" /> : i + 1}
                          </span>
                          <p
                            className={cn(
                              "mt-1.5 text-center text-xs font-medium",
                              done
                                ? "text-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            {s.label}
                          </p>
                        </div>
                      );
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
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {it.product_name}
                      </span>
                      {(it.variant_name || it.option_names) && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {[it.variant_name, it.option_names]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      )}
                      {it.notes && (
                        <span className="block truncate text-xs text-muted-foreground">
                          Catatan: {it.notes}
                        </span>
                      )}
                    </div>
                    <span className="text-sm">{rupiah(it.subtotal)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3">
                  <span className="text-sm text-muted-foreground">
                    Pembayaran
                  </span>
                  <Badge
                    variant={
                      o.payment_status === "paid" ? "outline" : "secondary"
                    }
                    className={o.payment_status === "paid" ? "gap-1.5" : ""}
                  >
                    {o.payment_status === "paid" && (
                      <Check className="size-3.5" />
                    )}
                    {o.payment_status === "paid"
                      ? "Sudah dibayar"
                      : "Belum dibayar"}
                  </Badge>
                </div>
                <p className="flex items-center gap-1.5 pt-3 text-xs text-muted-foreground">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Halaman menyegarkan otomatis setiap 5 detik.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {o && (
        <div className="fixed inset-x-0 bottom-4 z-20 px-4">
          <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between gap-3 rounded-2xl bg-primary px-4 text-primary-foreground shadow-xl">
            <div className="min-w-0">
              <p className="text-xs opacity-80">Total ({count} item)</p>
              <p className="truncate text-lg font-bold leading-tight">
                {rupiah(o.total_amount)}
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="h-10 bg-background px-5 text-foreground hover:bg-background/90"
            >
              <Link to="/menu">Pesan Lagi</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
