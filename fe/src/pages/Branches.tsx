import { useState, type FormEvent } from 'react'
import { MoreHorizontal, Pencil, Plus, Power } from 'lucide-react'
import { toast } from 'sonner'
import { get, post, put } from '../api/client'
import type { Branch } from '../api/types'
import { HeaderSearch } from '../components/HeaderSearch'
import {
  Button,
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
} from '../components/ui'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table'
import { useAsync } from '../hooks/useAsync'
import { usePageTitle } from '../hooks/usePageTitle'

const empty = { name: '', address: '', phone: '' }

export default function Branches() {
  const { data, err, reload } = useAsync(() => get<Branch[]>('/admin/branches'), [])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Branch | null>(null)
  const [form, setForm] = useState(empty)
  const [q, setQ] = useState('')
  const [actionErr, setActionErr] = useState('')

  usePageTitle(
    'Cabang',
    <>
      <HeaderSearch onSearch={setQ} placeholder="Cari cabang..." />
      <Button onClick={() => { setEditing(null); setForm(empty); setOpen(true) }} size="sm" aria-label="Tambah Cabang">
        <Plus className="size-4" />
        <span className="hidden sm:inline">Tambah Cabang</span>
      </Button>
    </>,
  )

  const rows = (data?.data ?? []).filter((b) =>
    [b.name, b.address, b.phone].some((v) =>
      (v ?? '').toLowerCase().includes(q.toLowerCase()),
    ),
  )

  async function submit(e: FormEvent) {
    e.preventDefault()
    try {
      if (editing) {
        await put<Branch>(`/admin/branches/${editing.id}`, form)
        toast.success('Cabang diperbarui')
      } else {
        await post<Branch>('/admin/branches', form)
        toast.success('Cabang dibuat')
      }
      setEditing(null)
      setForm(empty)
      setOpen(false)
      reload()
    } catch (ex) {
      toast.error((ex as Error).message)
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
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Cabang' : 'Tambah Cabang'}</DialogTitle>
            <DialogDescription>
              {editing ? `Perbarui data cabang "${editing.name}".` : 'Data cabang baru bisnis Anda.'}
            </DialogDescription>
          </DialogHeader>
          <form id="branch-form" className="flex flex-col gap-4" onSubmit={submit}>
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
          </form>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Batal</Button>
            </DialogClose>
            <Button type="submit" form="branch-form">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Alamat</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>Aktif</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((b) => (
              <TableRow key={b.id}>
                <TableCell>{b.name}</TableCell>
                <TableCell>{b.address || '-'}</TableCell>
                <TableCell>{b.phone || '-'}</TableCell>
                <TableCell>{b.is_active ? 'Ya' : 'Tidak'}</TableCell>
                <TableCell>
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!rows.length && (
        <p className="mt-4 text-center text-sm text-muted-foreground">Tidak ada data.</p>
      )}
    </>
  )
}