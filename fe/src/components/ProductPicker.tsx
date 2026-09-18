import { useEffect, useState } from "react";
import { cn } from "../lib/utils";
import type { ProductOption, ProductVariant } from "../api/types";
import {
  Button,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "./ui";

const rupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

export interface PickChoice {
  variant: ProductVariant | null;
  options: ProductOption[];
  qty: number;
}

export interface PickerProduct {
  id: number;
  name: string;
  price: number;
  image_url?: string;
  stock: number;
  variants?: ProductVariant[];
  options?: ProductOption[];
}

export default function ProductPicker({
  product,
  open,
  onOpenChange,
  onConfirm,
}: {
  product: PickerProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (choice: PickChoice) => void;
}) {
  const [variant, setVariant] = useState<ProductVariant | null>(null);
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (open) {
      setVariant(product?.variants?.length ? product.variants[0] : null);
      setOptions([]);
      setQty(1);
    }
  }, [open, product]);

  if (!product) return null;

  const unit =
    (variant?.price ?? product.price) +
    options.reduce((s, o) => s + o.price, 0);
  const variants = product.variants ?? [];
  const opts = product.options ?? [];

  function toggleOption(o: ProductOption) {
    setOptions((prev) =>
      prev.some((x) => x.id === o.id)
        ? prev.filter((x) => x.id !== o.id)
        : [...prev, o],
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto max-h-[85dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl"
      >
        <div className="flex justify-center pt-3">
          <span className="h-1.5 w-12 rounded-full bg-muted" />
        </div>
        <SheetHeader>
          <SheetTitle>{product.name}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4">
          {product.image_url && (
            <img
              src={product.image_url}
              alt={product.name}
              className="max-h-40 rounded-lg object-cover"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          )}

          {variants.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Pilih Varian</p>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVariant(v)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      variant?.id === v.id
                        ? "border-primary bg-primary/10 font-semibold text-primary"
                        : "hover:border-primary/50",
                    )}
                  >
                    <span className="block">
                      {v.name} - {rupiah(v.price)}
                    </span>
                    {/* <span className={cn('text-xs', variant?.id === v.id ? 'text-primary' : 'text-muted-foreground')}>
                    {rupiah(v.price)}
                  </span> */}
                  </button>
                ))}
              </div>
            </div>
          )}

          {opts.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Pilihan Tambahan</p>
              <div className="flex flex-wrap gap-2">
                {opts.map((o) => {
                  const active = options.some((x) => x.id === o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => toggleOption(o)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        active
                          ? "border-primary bg-primary/10 font-semibold text-primary"
                          : "hover:border-primary/50",
                      )}
                    >
                      <span className="block">{o.name}</span>
                      {o.price > 0 && (
                        <span
                          className={cn(
                            "text-xs",
                            active ? "text-primary" : "text-muted-foreground",
                          )}
                        >
                          +{rupiah(o.price)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="flex h-10 items-center gap-1 rounded-full border px-1.5">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="size-7 rounded-full"
                disabled={qty <= 1}
                aria-label="Kurangi"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                −
              </Button>
              <span className="min-w-6 text-center text-sm font-semibold">
                {qty}
              </span>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="size-7 rounded-full"
                disabled={product.stock > 0 && qty >= product.stock}
                aria-label="Tambah"
                onClick={() => setQty((q) => q + 1)}
              >
                +
              </Button>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-base font-bold">{rupiah(unit * qty)}</p>
            </div>
          </div>

          <SheetFooter>
            <Button
              disabled={product.stock === 0}
              onClick={() => {
                onConfirm({ variant, options, qty });
                onOpenChange(false);
              }}
            >
              Tambah ke Pesanan
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
