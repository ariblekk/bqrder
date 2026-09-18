import { useMemo, useRef, useState, type FormEvent } from 'react'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Plus } from 'lucide-react'
import { del, get, post, put, upload } from '../api/client'
import type { Category, Product } from '../api/types'
import {
  Button,
  ConfirmDialog,
  DataTable,
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
  useToast,
} from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { usePageTitle } from '../hooks/usePageTitle'
import { HeaderSearch } from '../components/HeaderSearch'

interface ChoiceRow {
  name: string
  price: number
}

const empty = { category_id: 0, name: '', price: 0, stock: 0, variants: [] as ChoiceRow[], options: [] as ChoiceRow[] }

export default function Products() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(empty)
  const [image, setImage] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)
  const [q, setQ] = useState('')
  const { toast } = useToast()
  usePageTitle(
    'Produk',
    <>
      <HeaderSearch onSearch={setQ} />
      <Button onClick={() => setOpen(true)} size="sm" aria-label="Tambah Produk">
        <Plus className="size-4" />
        <span className="hidden sm:inline">Tambah Produk</span>
      </Button>
    </>,
  )
  const { data, err, reload } = useAsync(
    () => get<Product[]>(`/admin/products?page=1&limit=1000`),
    [],
  )
  const { data: cats } = useAsync(() => get<Category[]>('/admin/categories'), [])
  const products = data?.data ?? []
  const col = createColumnHelper<Product>()

  const columns = useMemo<ColumnDef<Product, any>[]>(
    () => [
      col.accessor('name', {
        header: 'Nama',
        cell: ({ row }) => (
          <>
            {row.original.image_url && (
              <img
                className="mr-1.5 inline-block size-8 rounded-md object-cover align-middle"
                src={row.original.image_url}
                alt={row.original.name}
              />
            )}
            {row.original.name}
          </>
        ),
      }),
      col.accessor('category_name', { header: 'Kategori' }),
      col.accessor('price', {
        header: 'Harga',
        cell: (i) => `Rp ${i.getValue<number>().toLocaleString('id-ID')}`,
      }),
      col.accessor('stock', { header: 'Stok' }),
      col.accessor((p) => (p.is_active ? 'Ya' : 'Tidak'), { id: 'is_active', header: 'Aktif' }),
      col.display({
        id: 'actions',
        header: 'Aksi',
        cell: ({ row }) => {
          const p = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon-sm" variant="ghost" aria-label="Aksi">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setEditing(p)
                    setForm({
                      category_id: p.category_id,
                      name: p.name,
                      price: p.price,
                      stock: p.stock,
                      variants: (p.variants ?? []).map((v) => ({ name: v.name, price: v.price })),
                      options: (p.options ?? []).map((o) => ({ name: o.name, price: o.price })),
                    })
                    setImage(null)
                    setOpen(true)
                  }}
                >
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => setDeleting(p)}>
                  Hapus
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      }),
    ],
    [col],
  )

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!form.category_id) {
      toast('Pilih kategori dulu', { variant: 'error' })
      return
    }
    const variants = form.variants
      .filter((v) => v.name.trim())
      .map((v) => ({ name: v.name.trim(), price: Number(v.price) }))
    const options = form.options
      .filter((o) => o.name.trim())
      .map((o) => ({ name: o.name.trim(), price: Number(o.price) }))
    const payload = {
      ...form,
      price: Number(form.price),
      stock: Number(form.stock),
      variants,
      options,
    }
    try {
      let id: number | undefined
      if (editing) {
        await put<Product>(`/admin/products/${editing.id}`, payload)
        toast('Produk diperbarui')
        id = editing.id
      } else {
        const res = await post<Product>('/admin/products', payload)
        toast('Produk dibuat')
        id = res.data.id
      }
      if (image && id) {
        await upload(`/admin/products/${id}/image`, image)
        toast('Foto diunggah')
      }
      setForm(empty)
      setImage(null)
      setEditing(null)
      setOpen(false)
      reload()
    } catch (ex) {
      toast((ex as Error).message, { variant: 'error' })
    }
  }

  return (
    <>
      {err && <p className="text-sm font-medium text-destructive">{err}</p>}

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) {
            setEditing(null)
            setForm(empty)
            setImage(null)
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Produk' : 'Tambah Produk'}</DialogTitle>
            <DialogDescription>
              {editing
                ? `Perbarui data produk "${editing.name}".`
                : 'Isi data produk untuk cabang yang sedang dipilih.'}
            </DialogDescription>
          </DialogHeader>
          <form id="product-form" className="-mx-4 no-scrollbar flex max-h-[50vh] flex-col gap-4 overflow-y-auto px-4" onSubmit={submit}>
            <div className="flex flex-col gap-2">
              <Label>Kategori</Label>
              <Select
                value={form.category_id ? String(form.category_id) : ''}
                placeholder="Pilih kategori"
                options={
                  cats?.data.map((c: Category) => ({ value: String(c.id), label: c.name })) ?? []
                }
                onValueChange={(v) => setForm({ ...form, category_id: Number(v) })}
              />
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
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="product-stock">Stok</Label>
              <Input
                id="product-stock"
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                required
              />
            </div>
            <ChoiceEditor
              label="Varian (pilih satu, harga beda)"
              hint="Contoh: Ice Rp 20.000, Hot Rp 18.000"
              rows={form.variants}
              addText="Tambah varian"
              onChange={(variants) => setForm({ ...form, variants })}
            />
            <ChoiceEditor
              label="Pilihan tambahan (opsional, bisa lebih dari satu)"
              hint="Contoh: Less Ice, Less Sugar"
              rows={form.options}
              addText="Tambah pilihan"
              onChange={(options) => setForm({ ...form, options })}
            />
            <div className="flex items-center gap-3">
              {(image || (editing?.image_url ?? '')) && (
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

      <DataTable
        columns={columns}
        data={products}
        pageSize={10}
        globalFilter={q}
        onGlobalFilterChange={setQ}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Hapus produk?"
        description={deleting ? `Produk "${deleting.name}" akan dihapus permanen.` : ''}
        confirmText="Hapus"
        destructive
        onConfirm={async () => {
          if (!deleting) return
          try {
            await del(`/admin/products/${deleting.id}`)
            toast('Produk dihapus')
            reload()
          } catch (ex) {
            toast((ex as Error).message, { variant: 'error' })
          }
        }}
      />
    </>
  )
}

function ChoiceEditor({
  label,
  hint,
  rows,
  addText,
  onChange,
}: {
  label: string
  hint: string
  rows: ChoiceRow[]
  addText: string
  onChange: (rows: ChoiceRow[]) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <Label>{label}</Label>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex flex-col gap-2">
        {rows.length === 0 && (
          <p className="text-xs text-muted-foreground">Belum ada — bisa dikosongkan bila tidak perlu.</p>
        )}
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              placeholder="Nama"
              value={r.name}
              onChange={(e) =>
                onChange(rows.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))
              }
            />
            <Input
              type="number"
              min={0}
              placeholder="Harga"
              className="w-28"
              value={r.price || ''}
              onChange={(e) =>
                onChange(rows.map((x, idx) => (idx === i ? { ...x, price: Number(e.target.value) } : x)))
              }
            />
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Hapus"
              onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
            >
              ×
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, { name: '', price: 0 }])}>
          + {addText}
        </Button>
      </div>
    </div>
  )
}
