import { useMemo, useState, type FormEvent } from 'react'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { del, get, post } from '../api/client'
import type { Category } from '../api/types'
import { HeaderSearch } from '../components/HeaderSearch'
import {
  Button,
  DataTable,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { usePageTitle } from '../hooks/usePageTitle'

export default function Categories() {
  const { data, err, reload } = useAsync(() => get<Category[]>('/admin/categories'), [])
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')
  const [actionErr, setActionErr] = useState('')
  const col = createColumnHelper<Category>()

  usePageTitle(
    'Kategori',
    <>
      <HeaderSearch onSearch={setQ} placeholder="Cari kategori..." />
<Button onClick={() => setOpen(true)} size="sm" aria-label="Tambah">
        <Plus className="size-4" />
        <span className="hidden sm:inline">Tambah Kategori</span>
      </Button>
    </>,
  )

  const columns = useMemo<ColumnDef<Category, any>[]>(
    () => [
      col.accessor('name', { header: 'Nama' }),
      col.accessor('description', { header: 'Deskripsi', cell: (i) => i.getValue<string>() || '-' }),
      col.display({
        id: 'actions',
        header: 'Aksi',
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="destructive"
            onClick={async () => {
              if (!confirm(`Hapus kategori "${row.original.name}"?`)) return
              try {
                await del(`/admin/categories/${row.original.id}`)
                reload()
              } catch (ex) {
                setActionErr((ex as Error).message)
              }
            }}
          >
            Hapus
          </Button>
        ),
      }),
    ],
    [col, reload],
  )

  async function create(e: FormEvent) {
    e.preventDefault()
    await post<Category>('/admin/categories', { name })
    setName('')
    setOpen(false)
    setMsg('Kategori dibuat')
    reload()
  }

  return (
    <>
      {(err || actionErr) && (
        <p className="text-sm font-medium text-destructive">{err || actionErr}</p>
      )}
      {msg && <p className="text-sm font-medium text-primary">{msg}</p>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Kategori</DialogTitle>
            <DialogDescription>Nama kategori untuk mengelompokkan produk.</DialogDescription>
          </DialogHeader>
          <form id="category-form" className="flex flex-col gap-4" onSubmit={create}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="category-name">Nama kategori</Label>
              <Input
                id="category-name"
                placeholder="Makanan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </form>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Batal</Button>
            </DialogClose>
            <Button type="submit" form="category-form">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        globalFilter={q}
        onGlobalFilterChange={setQ}
      />
    </>
  )
}