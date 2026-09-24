export interface CartLine {
  key: string;
  product: {
    id: number;
    name: string;
    price: number;
    stock: number;
    is_unlimited: boolean;
    image_url?: string;
    variants?: { id: number; name: string; price?: number }[];
    options?: { id: number; name: string; price?: number }[];
  };
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

const CART_KEY = "qrdigo_cart";

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

const QR_KEY = "qrdigo_qr";

export function getQr() {
  return localStorage.getItem(QR_KEY) || "";
}

export function setQr(qr: string) {
  localStorage.setItem(QR_KEY, qr);
}