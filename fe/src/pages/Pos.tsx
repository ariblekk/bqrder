import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { get, post } from "../api/client";
import { subscribeOrderEvents } from "../api/sse";
import type {
  Branch,
  Order,
  Product,
  ProductOption,
  ProductVariant,
} from "../api/types";
import OrderDetailDialog, { fmtRp } from "../components/pos/OrderDetailDialog";
import PosHeader from "../components/pos/PosHeader";
import ProductPicker, { type PickChoice } from "../components/ProductPicker";
import ReceiptDialog from "../components/pos/ReceiptDialog";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
} from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useAsync } from "../hooks/useAsync";
import { cn } from "../lib/utils";

interface CartLine {
  key: string;
  product: Product;
  variant: ProductVariant | null;
  options: ProductOption[];
  qty: number;
  notes: string;
}

const linePrice = (l: CartLine) =>
  (l.variant?.price ?? l.product.price) +
  l.options.reduce((s, o) => s + o.price, 0);

function lineKey(
  p: Product,
  variant: ProductVariant | null,
  options: ProductOption[],
) {
  const o = [...options]
    .sort((a, b) => a.id - b.id)
    .map((x) => x.id)
    .join(",");
  return `${p.id}:${variant?.id ?? 0}:${o}`;
}

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

export default function Pos() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { data: orders, reload } = useAsync(
    () => get<Order[]>("/pos/orders"),
    [],
  );
  const { data: prods } = useAsync(
    () => get<Product[]>("/pos/products?limit=100"),
    [],
  );
  const { data: branch } = useAsync(() => get<Branch>("/pos/branch"), []);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("Semua");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [picker, setPicker] = useState<Product | null>(null);
  const [customer, setCustomer] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [paidId, setPaidId] = useState<number | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);

  useEffect(() => {
    const t = setInterval(reload, 15000);
    return () => clearInterval(t);
  }, [reload]);

  useEffect(() => {
    return subscribeOrderEvents(() => reload());
  }, [reload]);

  const allOrders = orders?.data ?? [];
  const needsAttention = allOrders.filter(
    (o) =>
      (o.payment_status === "unpaid" && o.status !== "cancelled") ||
      (o.payment_status === "paid" && o.status === "pending"),
  );
  const products = prods?.data.filter((p) => p.is_active) ?? [];
  const q = search.trim().toLowerCase();
  const filtered = q
    ? products.filter((p) => p.name.toLowerCase().includes(q))
    : products;
  const allCategories = [
    "Semua",
    ...new Set(products.map((p) => p.category_name || "Lainnya")),
  ];
  const shown =
    cat === "Semua"
      ? filtered
      : filtered.filter((p) => (p.category_name || "Lainnya") === cat);
  const total = cart.reduce((s, l) => s + linePrice(l) * l.qty, 0);
  const itemCount = cart.reduce((s, l) => s + l.qty, 0);

  function addLine(
    p: Product,
    choice: { variant: ProductVariant | null; options: ProductOption[] },
    delta: number,
  ) {
    const key = lineKey(p, choice.variant, choice.options);
    setCart((prev) => {
      const found = prev.find((l) => l.key === key);
      if (found) {
        const nextQty = found.qty + delta;
        if (nextQty > p.stock) return prev;
        return prev.map((l) => (l.key === key ? { ...l, qty: nextQty } : l));
      }
      if (delta < 1 || p.stock < 1) return prev;
      return [
        ...prev,
        {
          key,
          product: p,
          variant: choice.variant,
          options: choice.options,
          qty: delta,
          notes: "",
        },
      ];
    });
  }

  function addToCart(p: Product) {
    setPicker(p);
  }

  function confirmChoice(choice: PickChoice) {
    if (!picker) return;
    addLine(
      picker,
      { variant: choice.variant, options: choice.options },
      choice.qty,
    );
  }

  function changeQty(key: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    );
  }

  function lineLabel(l: CartLine) {
    const parts: string[] = [];
    if (l.variant) parts.push(l.variant.name);
    for (const o of l.options) parts.push(o.name);
    return parts.join(" · ");
  }

  async function submit(pay: boolean) {
    if (!user) return;
    setBusy(true);
    setDone("");
    try {
      const res = await post<Order>("/pos/orders/direct", {
        customer_name: customer,
        items: cart.map((l) => ({
          product_id: l.product.id,
          quantity: l.qty,
          variant_id: l.variant?.id,
          option_ids: l.options.map((o) => o.id),
          notes: l.notes,
        })),
        pay,
      });
      setCart([]);
      setCustomer("");
      setPayOpen(false);
      reload();
      if (pay) {
        setPaidId(res.data.id);
        setReceiptOpen(true);
      }
    } catch (e) {
      setDone((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden p-4">
      <PosHeader
        title={`${branch?.data?.name || "qrdigo"} — POS`}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Pesanan"
                className="relative"
              >
                <Bell />
                {needsAttention.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
                    {needsAttention.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="max-h-96 w-80 overflow-y-auto p-1"
            >
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Pesanan</span>
                {needsAttention.length > 0 && (
                  <Badge variant="destructive" className="text-[10px]">
                    {needsAttention.length} perlu tindakan
                  </Badge>
                )}
              </DropdownMenuLabel>
              {allOrders.length === 0 ? (
                <DropdownMenuItem disabled>Tidak ada pesanan.</DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuSeparator />
                  {allOrders.slice(0, 5).map((o) => {
                    const needsPay =
                      o.payment_status === "unpaid" && o.status !== "cancelled";
                    const needsProses =
                      o.payment_status === "paid" && o.status === "pending";
                    const needsAction = needsPay || needsProses;
                    const firstItem = o.items[0]?.product_name;
                    return (
                      <DropdownMenuItem
                        key={o.id}
                        onClick={() => setSelected(o)}
                      >
                        <div className="flex w-full items-center gap-2 py-1">
                          <span
                            className={`size-1.5 shrink-0 rounded-full ${
                              needsAction
                                ? "bg-destructive"
                                : o.payment_status === "paid" &&
                                    o.status === "completed"
                                  ? "bg-emerald-500"
                                  : "bg-muted-foreground/40"
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <p
                              className={`truncate text-xs ${needsAction ? "font-semibold" : ""}`}
                            >
                              {o.order_number}
                              {firstItem && (
                                <span className="font-normal text-muted-foreground">
                                  {" "}
                                  · {firstItem}
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {timeAgo(o.created_at)} · {fmtRp(o.total_amount)}
                            </p>
                          </div>
                          {needsPay && (
                            <Badge
                              variant="destructive"
                              className="text-[10px]"
                            >
                              Bayar
                            </Badge>
                          )}
                          {needsProses && (
                            <Badge variant="secondary" className="text-[10px]">
                              Proses
                            </Badge>
                          )}
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </>
              )}
              {allOrders.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => nav("/pos/orders")}
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
      {done && (
        <p className="mb-2 text-sm font-medium text-destructive">{done}</p>
      )}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col gap-3">
          <h3 className="text-base font-semibold">Produk</h3>
          <Input
            placeholder="Cari produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex shrink-0 gap-1.5 overflow-x-auto">
            {allCategories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  cat === c
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70",
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {shown.map((p) => {
                const qty = cart
                  .filter((l) => l.product.id === p.id)
                  .reduce((s, l) => s + l.qty, 0);
                const hasChoices =
                  p.variants.length > 0 || p.options.length > 0;
                const minPrice =
                  p.variants.length > 0
                    ? Math.min(...p.variants.map((v) => v.price))
                    : p.price;
                return (
                  <Card
                    key={p.id}
                    size="sm"
                    className={cn(
                      "relative h-full",
                      p.stock === 0 && "opacity-50",
                    )}
                  >
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        loading="lazy"
                        className="aspect-video w-full object-cover"
                      />
                    ) : (
                      <div className="aspect-video w-full bg-muted" />
                    )}
                    <Badge
                      variant="secondary"
                      className="absolute top-2 right-2 bg-background/80 backdrop-blur"
                    >
                      stok {p.stock}
                    </Badge>
                    <CardHeader>
                      <CardTitle className="truncate">{p.name}</CardTitle>
                      <CardDescription>
                        <span className="font-semibold text-foreground">
                          {hasChoices && "mulai "}Rp{" "}
                          {minPrice.toLocaleString("id-ID")}
                        </span>
                      </CardDescription>
                      {hasChoices && (
                        <CardDescription className="text-xs">
                          Ada varian / pilihan
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardFooter className="mt-auto">
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={p.stock === 0}
                        onClick={() => addToCart(p)}
                      >
                        {qty > 0 ? `Tambah lagi (${qty})` : "Tambah"}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
            {prods && !shown.length && (
              <p className="text-sm text-muted-foreground">
                Produk tidak ditemukan.
              </p>
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col">
          <Card size="sm" className="flex h-full flex-col">
            <CardContent className="flex flex-1 flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Pesanan</h3>
                <span className="text-sm text-muted-foreground">
                  {itemCount} item
                </span>
              </div>
              {cart.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-md border border-dashed">
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Belum ada produk dipilih.
                  </p>
                </div>
              ) : (
                <ul className="m-0 flex-1 list-none divide-y divide-border overflow-y-auto p-0 text-sm">
                  {cart.map((l) => (
                    <li
                      key={l.key}
                      className="flex items-center gap-2 py-2 first:pt-0 last:pb-0"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">
                          {l.product.name} — Rp{" "}
                          {(linePrice(l) * l.qty).toLocaleString("id-ID")}
                        </span>
                        {lineLabel(l) && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {lineLabel(l)}
                          </span>
                        )}
                        {l.notes && (
                          <span className="block truncate text-xs text-muted-foreground">
                            Catatan: {l.notes}
                          </span>
                        )}
                      </span>
                      <div className="flex h-8 items-center gap-1 rounded-full border px-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="size-6 rounded-full"
                          aria-label={`Kurangi ${l.product.name}`}
                          onClick={() => changeQty(l.key, -1)}
                        >
                          −
                        </Button>
                        <span className="min-w-5 text-center text-sm font-semibold">
                          {l.qty}
                        </span>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="size-6 rounded-full"
                          disabled={l.qty >= l.product.stock}
                          aria-label={`Tambah ${l.product.name}`}
                          onClick={() => changeQty(l.key, 1)}
                        >
                          +
                        </Button>
                      </div>
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
                <strong>Total: Rp {total.toLocaleString("id-ID")}</strong>
              </div>
              <Button
                disabled={!customer || cart.length === 0 || busy}
                onClick={() => setPayOpen(true)}
              >
                {busy ? "Memproses..." : "Buat Pesanan"}
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Metode Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              {customer} • Rp {total.toLocaleString("id-ID")}
            </p>
            <Button disabled={busy} onClick={() => submit(true)}>
              Tunai (langsung dibayar)
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => submit(false)}
            >
              Bayar di tempat
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ReceiptDialog
        orderId={paidId}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        onError={setDone}
      />

      <ProductPicker
        product={picker}
        open={!!picker}
        onOpenChange={(v) => !v && setPicker(null)}
        onConfirm={confirmChoice}
      />

      <OrderDetailDialog
        order={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        onReload={reload}
        onError={setDone}
      />
    </div>
  );
}
