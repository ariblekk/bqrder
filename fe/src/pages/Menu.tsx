import { useState, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, ShoppingBag, ShoppingCart } from "lucide-react";
import { get } from "../api/client";
import type { MenuCategory, Table, MenuProduct } from "../api/types";
import ProductPicker, { type PickChoice } from "../components/ProductPicker";
import {
  Badge,
  Button,
  Card,
  Empty,
  EmptyContent,
  EmptyDescription,
  Skeleton,
} from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { useDocTitle } from "../hooks/useDocTitle";
import { cn } from "../lib/utils";

const CART_KEY = "qrdigo_cart";
const QR_KEY = "qrdigo_qr";

export interface CartLine {
  key: string;
  product: MenuProduct;
  variant_id?: number;
  option_ids?: number[];
  qty: number;
  notes: string;
}

export const linePrice = (l: CartLine) => {
  const variant = l.product.variants?.find((v) => v.id === l.variant_id);
  const variantPrice = variant?.price ?? l.product.price;
  const optionsPrice =
    l.option_ids?.reduce((sum, oid) => {
      const opt = l.product.options?.find((o) => o.id === oid);
      return sum + (opt?.price ?? 0);
    }, 0) ?? 0;
  return variantPrice + optionsPrice;
};

export function lineKey(
  p: { id: number },
  variant_id?: number,
  option_ids?: number[],
) {
  const opts = option_ids
    ? [...option_ids].sort((a, b) => a - b).join(",")
    : "";
  return `${p.id}:${variant_id ?? 0}:${opts}`;
}

export function getCart(): CartLine[] {
  try {
    const raw: any[] = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return raw.map((l) => ({
      key: l.key ?? `${l.product.id}:0:`,
      product: l.product,
      variant_id: l.variant_id,
      option_ids: l.option_ids,
      qty: l.qty,
      notes: l.notes ?? "",
    }));
  } catch {
    return [];
  }
}
export function setCart(cart: CartLine[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}
export function getQr() {
  return localStorage.getItem(QR_KEY) || "";
}

const rupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

// Featured carousel component
function FeaturedCarousel({ products }: { products: MenuProduct[] }) {
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemWidth = 300; // card width + gap

  // Auto-scroll
  useEffect(() => {
    if (products.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % products.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [products.length]);

  const scrollTo = (i: number) => {
    setIndex(i);
    containerRef.current?.scrollTo({
      left: i * itemWidth,
      behavior: "smooth",
    });
  };

  return (
    <div className="px-4 py-3 sm:px-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-primary">
          ⭐ Pilihan Unggulan
        </h2>
        <div className="flex gap-1">
          {products.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              className={cn(
                "size-2 rounded-full transition-colors",
                i === index ? "bg-primary" : "bg-primary/30",
              )}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
      <div
        ref={containerRef}
        className="no-scrollbar flex gap-3 overflow-x-auto pb-2"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {products.map((p, i) => (
          <FeaturedCard key={p.id} product={p} index={i} active={i === index} />
        ))}
      </div>
    </div>
  );
}

function FeaturedCard({
  product,
  active,
}: {
  product: MenuProduct;
  index: number;
  active: boolean;
}) {
  const soldOut = !product.is_unlimited && product.stock === 0;
  return (
    <button
      type="button"
      disabled={soldOut}
      className={cn(
        "relative shrink-0 w-64 flex-snap-start overflow-hidden rounded-xl bg-background shadow-md transition-shadow",
        active && "shadow-lg ring-2 ring-primary/20",
      )}
      onClick={() => {}}
    >
      {product.image_url ? (
        <img
          className="w-full h-36 object-cover"
          src={product.image_url}
          alt={product.name}
          loading="lazy"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      ) : (
        <div className="w-full h-36 bg-muted flex items-center justify-center text-xs text-muted-foreground">
          No image
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
        <h3 className="font-semibold text-sm truncate">{product.name}</h3>
        {product.description && (
          <p className="text-xs opacity-80 truncate mt-0.5">
            {product.description}
          </p>
        )}
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-sm font-bold">{rupiah(product.price)}</span>
          {soldOut && (
            <Badge variant="destructive" className="text-[10px]">
              Habis
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

export default function Menu() {
  const [params] = useSearchParams();
  const qr = params.get("qr") || getQr();
  if (params.get("qr")) localStorage.setItem(QR_KEY, qr);

  const { data: table } = useAsync(
    () => get<Table>(`/public/table/${qr}`),
    [qr],
  );
  useDocTitle(
    table?.data
      ? `Menu ${table.data.branch_name || "Digital"} — Meja ${table.data.table_number}`
      : "Menu Digital",
  );

  const [cart, setCartState] = useState<CartLine[]>(getCart);
  const [active, setActive] = useState("");
  const [picker, setPicker] = useState<MenuProduct | null>(null);
  const { data, err } = useAsync(
    () => get<MenuCategory[]>(`/public/menu?qr_token=${qr}`),
    [qr],
  );
  const total = cart.reduce((s, l) => s + linePrice(l) * l.qty, 0);
  const count = cart.reduce((s, l) => s + l.qty, 0);

  const cats = data?.data ?? [];
  // Filter out featured category (id=0) from regular categories
  const regularCats = cats.filter((c) => c.id !== 0);
  const products = active
    ? (regularCats.find((c) => c.name === active)?.products ?? [])
    : regularCats.flatMap((c) => c.products);

  function adjustLine(
    p: MenuProduct,
    choice: { variant_id?: number; option_ids?: number[] },
    delta: number,
  ) {
    const key = lineKey(p, choice.variant_id, choice.option_ids);
    setCartState((prev) => {
      const found = prev.find((l) => l.key === key);
      const next = found
        ? prev.map((l) =>
            l.key === key ? { ...l, qty: Math.max(0, l.qty + delta) } : l,
          )
        : [
            ...prev,
            {
              key,
              product: p,
              variant_id: choice.variant_id,
              option_ids: choice.option_ids,
              qty: delta,
              notes: "",
            },
          ].filter((l) => l.qty > 0);
      setCart(next);
      return next;
    });
  }

  function openPicker(p: MenuProduct) {
    setPicker(p);
  }

  function confirmChoice(choice: PickChoice) {
    if (!picker) return;
    adjustLine(
      picker,
      { variant_id: choice.variant_id, option_ids: choice.option_ids },
      choice.qty,
    );
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
            {table?.data?.branch_name || "Kedai Kami"}
          </h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-primary-foreground/80">
            {table?.data && (
              <Badge
                variant="secondary"
                className="bg-white/15 text-primary-foreground hover:bg-white/15"
              >
                Meja {table.data.table_number}
              </Badge>
            )}
            Pilih menu favoritmu, pesan, dan nikmati.
          </p>
        </header>
      </div>

      <div className="mx-auto w-full max-w-2xl">
        {err && (
          <p className="px-4 pt-3 text-sm font-medium text-destructive sm:px-6">
            {err}
          </p>
        )}

        {/* Featured carousel - only show on "Semua" tab */}
        {active === "" && cats.some((c) => c.id === 0) && (
          <FeaturedCarousel
            products={cats.find((c) => c.id === 0)?.products ?? []}
          />
        )}

        {cats.length > 0 && (
          <div className="sticky top-0 z-10 px-4 py-2 backdrop-blur sm:px-6">
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              <Pill active={active === ""} onClick={() => setActive("")}>
                Semua
              </Pill>
              {regularCats.map((c) => (
                <Pill
                  key={c.id}
                  active={active === c.name}
                  onClick={() => setActive(c.name)}
                >
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
                <EmptyDescription>
                  Tidak ada menu untuk saat ini.
                </EmptyDescription>
              </EmptyContent>
            </Empty>
          </div>
        )}

        <div className="space-y-2 p-3 sm:p-4">
          {products.map((p) => {
            const qty = cart
              .filter((l) => l.product.id === p.id)
              .reduce((s, l) => s + l.qty, 0);
            const soldOut = !p.is_unlimited && p.stock === 0;
            const hasSales = (p.total_sold ?? 0) > 0;
            return (
              <Card
                key={p.id}
                size="sm"
                className={cn("p-0", soldOut && "opacity-70")}
              >
                <div className="flex gap-3 p-2">
                  <button
                    type="button"
                    disabled={soldOut}
                    className="relative block size-20 shrink-0 overflow-hidden rounded-lg bg-muted"
                    onClick={() => openPicker(p)}
                  >
                    {p.image_url ? (
                      <img
                        className="size-full object-cover"
                        src={p.image_url}
                        alt={p.name}
                        loading="lazy"
                        onError={(e) =>
                          (e.currentTarget.style.display = "none")
                        }
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
                      <span className="text-sm font-bold">
                        {rupiah(p.price)}
                      </span>
                      <div className="relative">
                        <Button
                          size="icon-sm"
                          variant="outline"
                          className="rounded-full"
                          disabled={soldOut}
                          aria-label={`Tambah ${p.name}`}
                          onClick={() => openPicker(p)}
                        >
                          <ShoppingCart className="size-4" />
                        </Button>
                        {qty > 0 && (
                          <span className="pointer-events-none absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                            {qty}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-20 px-4">
          <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between gap-3 rounded-2xl bg-primary px-4 text-primary-foreground">
            <div className="min-w-0">
              <p className="text-xs opacity-80">{count} item dipilih</p>
              <p className="truncate text-lg font-bold leading-tight">
                {rupiah(total)}
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="h-10 bg-background px-5 text-foreground hover:bg-background/90 rounded-2xl"
            >
              <Link to="/checkout" className="flex items-center gap-1.5">
                Lihat Pesanan
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      <ProductPicker
        product={picker}
        open={!!picker}
        onOpenChange={(v) => !v && setPicker(null)}
        onConfirm={confirmChoice}
      />
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted text-muted-foreground hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}
