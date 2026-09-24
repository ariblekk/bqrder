import { useRef, useState, type FormEvent } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { get, post, put, upload } from "../api/client";
import { formatRupiah } from "../lib/utils";
import type {
  Category,
  Product,
  VariantInput,
  OptionInput,
} from "../api/types";
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Label,
  Select,
} from "../components/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAsync } from "../hooks/useAsync";
import { usePageTitle } from "../hooks/usePageTitle";
import { HeaderSearch } from "../components/HeaderSearch";
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const empty = {
  category_id: 0,
  name: "",
  price: 0,
  stock: 0,
  is_unlimited: false,
  variants: [] as VariantInput[],
  options: [] as OptionInput[],
};

export default function Products() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(empty);
  const [image, setImage] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  usePageTitle(
    "Produk",
    <>
      <HeaderSearch onSearch={setQ} />
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        aria-label="Tambah Produk"
      >
        <Plus className="size-4" />
        <span className="hidden sm:inline">Tambah Produk</span>
      </Button>
    </>,
  );
  const { data, err, reload } = useAsync(
    () => get<Product[]>(`/admin/products?page=1&limit=1000`),
    [],
  );
  const { data: cats } = useAsync(
    () => get<Category[]>("/admin/categories"),
    [],
  );
  const products = data?.data ?? [];
  const rows = products.filter((p) =>
    [p.name, p.category_name].some((v) =>
      (v ?? "").toLowerCase().includes(q.toLowerCase()),
    ),
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.category_id) {
      toast.error("Pilih kategori dulu");
      return;
    }
    const payload = {
      ...form,
      price: Number(form.price),
      stock: form.is_unlimited ? 0 : Number(form.stock),
      is_unlimited: form.is_unlimited,
      variants: form.variants,
      options: form.options,
    };
    try {
      let id: number | undefined;
      if (editing) {
        await put<Product>(`/admin/products/${editing.id}`, payload);
        toast.success("Produk diperbarui");
        id = editing.id;
      } else {
        const res = await post<Product>("/admin/products", payload);
        toast.success("Produk dibuat");
        id = res.data.id;
      }
      if (image && id) {
        await upload(`/admin/products/${id}/image`, image);
        toast.success("Foto diunggah");
      }
      setForm(empty);
      setImage(null);
      setEditing(null);
      setOpen(false);
      reload();
    } catch (ex) {
      toast.error((ex as Error).message);
    }
  }

  return (
    <>
      {err && <p className="text-sm font-medium text-destructive">{err}</p>}

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setEditing(null);
            setForm(empty);
            setImage(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Produk" : "Tambah Produk"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? `Perbarui data produk "${editing.name}".`
                : "Isi data produk untuk cabang yang sedang dipilih."}
            </DialogDescription>
          </DialogHeader>
          <form
            id="product-form"
            className="-mx-4 no-scrollbar flex max-h-[50vh] flex-col gap-4 overflow-y-auto px-4"
            onSubmit={submit}
          >
            <div className="flex flex-col gap-2">
              <Label>Kategori</Label>
              <Select
                value={form.category_id ? String(form.category_id) : ""}
                onValueChange={(v) =>
                  setForm({ ...form, category_id: Number(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {cats?.data.map((c: Category) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="product-name">Nama produk</Label>
              <Input
                id="product-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="product-price">Harga</Label>
              <Input
                id="product-price"
                type="number"
                min={0}
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: Number(e.target.value) })
                }
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="product-stock">Stok</Label>
              <Input
                id="product-stock"
                type="number"
                min={0}
                disabled={form.is_unlimited}
                value={form.is_unlimited ? "" : form.stock}
                onChange={(e) =>
                  setForm({ ...form, stock: Number(e.target.value) })
                }
              />
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.is_unlimited}
                  onCheckedChange={(c) =>
                    setForm({ ...form, is_unlimited: c === true })
                  }
                />
                Stok tidak terbatas
              </label>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Varian/Size</Label>
              <div className="flex flex-col gap-2">
                {form.variants.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Belum ada varian
                  </p>
                )}
                {form.variants.map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      placeholder="Nama varian"
                      value={v.name}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          variants: form.variants.map((x, idx) =>
                            idx === i ? { ...x, name: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      placeholder="Harga"
                      value={v.price}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          variants: form.variants.map((x, idx) =>
                            idx === i
                              ? { ...x, price: Number(e.target.value) }
                              : x,
                          ),
                        })
                      }
                    />
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Hapus varian"
                      onClick={() =>
                        setForm({
                          ...form,
                          variants: form.variants.filter((_, idx) => idx !== i),
                        })
                      }
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm({
                      ...form,
                      variants: [...form.variants, { name: "", price: 0 }],
                    })
                  }
                >
                  + Tambah varian
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Pilihan Tambahan (opsional, bisa lebih dari satu)</Label>
              <p className="text-xs text-muted-foreground">
                Contoh: Ice, Extra Shot, Topping
              </p>
              <div className="flex flex-col gap-2">
                {form.options.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Belum ada pilihan tambahan
                  </p>
                )}
                {form.options.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      placeholder="Nama pilihan"
                      value={o.name}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          options: form.options.map((x, idx) =>
                            idx === i ? { ...x, name: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      placeholder="Harga tambahan"
                      value={o.price}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          options: form.options.map((x, idx) =>
                            idx === i
                              ? { ...x, price: Number(e.target.value) }
                              : x,
                          ),
                        })
                      }
                    />
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Hapus pilihan"
                      onClick={() =>
                        setForm({
                          ...form,
                          options: form.options.filter((_, idx) => idx !== i),
                        })
                      }
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm({
                      ...form,
                      options: [...form.options, { name: "", price: 0 }],
                    })
                  }
                >
                  + Tambah pilihan
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {(image || (editing?.image_url ?? "")) && (
                <img
                  className="size-20 rounded-lg object-cover"
                  src={image ? URL.createObjectURL(image) : editing?.image_url}
                  alt=""
                />
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="product-image">Foto</Label>
                <Input
                  id="product-image"
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImage(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          </form>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Batal</Button>
            </DialogClose>
            <Button type="submit" form="product-form">
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Gambar</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Harga</TableHead>
              <TableHead>Stok</TableHead>
              <TableHead>Aktif</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  {p.image_url ? (
                    <img
                      className="size-12 rounded-md object-cover"
                      src={p.image_url}
                      alt={p.name}
                    />
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1.5">
                    {p.name}
                    {p.is_featured && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <span className="text-yellow-500">★</span> Pin
                      </Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell>{p.category_name}</TableCell>
                <TableCell>
                  {formatRupiah(p.price)}
                </TableCell>
                <TableCell>
                  {p.is_unlimited ? "∞ (unlimited)" : p.stock}
                </TableCell>
                <TableCell>{p.is_active ? "Ya" : "Tidak"}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon-sm" variant="ghost" aria-label="Aksi">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditing(p);
                          setForm({
                            category_id: p.category_id,
                            name: p.name,
                            price: p.price,
                            stock: p.stock,
                            is_unlimited: p.is_unlimited,
                            variants: (p.variants ?? []).map((v) => ({
                              name: v.name,
                              price: v.price,
                              sort_order: v.sort_order,
                            })),
                            options: (p.options ?? []).map((o) => ({
                              name: o.name,
                              price: o.price,
                              sort_order: o.sort_order,
                            })),
                          });
                          setImage(null);
                          setOpen(true);
                        }}
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          try {
                            await put<Product>(`/admin/products/${p.id}`, {
                              is_featured: !p.is_featured,
                            });
                            toast.success(
                              p.is_featured
                                ? "Dihapus dari banner"
                                : "Dipin ke banner",
                            );
                            reload();
                          } catch (ex) {
                            toast.error((ex as Error).message);
                          }
                        }}
                      >
                        {p.is_featured ? "Lepas pin" : "Pin ke banner"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          try {
                            await put<Product>(`/admin/products/${p.id}`, {
                              is_active: !p.is_active,
                            });
                            toast.success(
                              p.is_active
                                ? "Produk dinonaktifkan"
                                : "Produk diaktifkan",
                            );
                            reload();
                          } catch (ex) {
                            toast.error((ex as Error).message);
                          }
                        }}
                      >
                        {p.is_active ? "Nonaktifkan" : "Aktifkan"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!rows.length && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Tidak ada data.
        </p>
      )}
    </>
  );
}
