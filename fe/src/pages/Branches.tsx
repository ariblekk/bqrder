import { useState, type FormEvent } from 'react'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Pencil, Power } from 'lucide-react'
import { get, post, put } from '../api/client'
import type { Branch } from '../api/types'
import { HeaderSearch } from '../components/HeaderSearch'
import {
  Button,
  DataTable,
  Dialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Label,
  useToast,
} from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { usePageTitle } from '../hooks/usePageTitle'

const empty = { name: '', address: '', phone: '' }

export default function Branches() {
  const { data, err, reload } = useAsync(() => get<Branch[]>('/admin/branches'), [])
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Branch | null>(null)
  const [form, setForm] = useState(empty)
  const [q, setQ] = useState('')
  const [actionErr, setActionErr] = useState('')
  const col = createColumnHelper<Branch>()

  usePageTitle(
    'Cabang',
    <>
      <HeaderSearch onSearch={setQ} placeholder="Cari cabang..." />
      <Button onClick={() => { setEditing(null); setForm(empty); setOpen(true) }}>Tambah Cabang</Button>
    </>,
  )

  const columns: ColumnDef<Branch, any>[] = [
    col.accessor('name', { header: 'Nama' }),
    col.accessor('address', { header: 'Alamat', cell: (i) => i.getValue<string>() || '-' }),
    col.accessor('phone', { header: 'Telepon', cell: (i) => i.getValue<string>() || '-' }),
    col.accessor((b) => (b.is_active ? 'Ya' : 'Tidak'), { id: 'is_active', header: 'Aktif' }),
    col.display({
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => {
        const b = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setEditing(b)
                  setForm({ name: b.name, address: b.address || '', phone: b.phone || '' })
                  setOpen(true)
                }}
              >
                <Pencil />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    await put<Branch>(`/admin/branches/${b.id}`, { is_active: !b.is_active })
                    reload()
                  } catch (ex) {
                    setActionErr((ex as Error).message)
                  }
                }}
              >
                <Power />
                {b.is_active ? 'Nonaktifkan' : 'Aktifkan'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    }),
  ]

  async function submit(e: FormEvent) {
    e.preventDefault()
    try {
      if (editing) {
        await put<Branch>(`/admin/branches/${editing.id}`, form)
        toast('Cabang diperbarui')
      } else {
        await post<Branch>('/admin/branches', form)
        toast('Cabang dibuat')
      }
      setEditing(null)
      setForm(empty)
      setOpen(false)
      reload()
    } catch (ex) {
      toast((ex as Error).message, { variant: 'error' })
    }
  }

  return (
    <>
      {(err || actionErr) && (
        <p className="text-sm font-medium text-destructive">{err || actionErr}</p>
      )}

      <Dialog
        open={open}
        onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null) }}
        title={editing ? 'Edit Cabang' : 'Tambah Cabang'}
        description={editing ? `Perbarui data cabang "${editing.name}".` : 'Data cabang baru bisnis Anda.'}
      >
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="branch-name">Nama</Label>
            <Input
              id="branch-name"
              placeholder="Nama"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="branch-address">Alamat</Label>
            <Input
              id="branch-address"
              placeholder="Alamat"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="branch-phone">Telepon</Label>
            <Input
              id="branch-phone"
              placeholder="Telepon"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit">Simpan</Button>
          </div>
        </form>
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