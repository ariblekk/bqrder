import { useState, type FormEvent } from 'react'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { Download, ExternalLink, MoreHorizontal, Pencil, Plus, Power, Printer } from 'lucide-react'
import { get, post, put } from '../api/client'
import type { Table } from '../api/types'
import { QrImage } from '../components/QrImage'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Label,
} from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { usePageTitle } from '../hooks/usePageTitle'

const empty = { table_number: '', capacity: 2 }

function printTable(t: Table, dataUrl: string) {
  const w = window.open('', '_blank', 'width=420,height=560')
  if (!w) return
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>QR ${t.table_number}</title>
<style>body{font-family:sans-serif;text-align:center;padding:32px}h1{font-size:26px;margin:0}img{width:260px;height:260px}p{color:#555;font-size:14px}</style>
</head><body>
<h1>Meja ${t.table_number}</h1>
<img src="${dataUrl}" alt="QR meja ${t.table_number}">
<p>Scan untuk lihat menu dan pesan</p>
</body></html>`)
  w.document.close()
  w.focus()
  w.onafterprint = () => w.close()
  w.print()
}

export default function Tables() {
  const { data, err, reload } = useAsync(() => get<Table[]>('/admin/tables'), [])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState(empty)
  const [editTarget, setEditTarget] = useState<Table | null>(null)
  const [qrTarget, setQrTarget] = useState<Table | null>(null)
  const [qrUrl, setQrUrl] = useState('')
  const [msg, setMsg] = useState('')
  const [actionErr, setActionErr] = useState('')
  const [q, setQ] = useState('')
  const col = createColumnHelper<Table>()

  usePageTitle(
    'Meja',
    <>
      <HeaderSearch onSearch={setQ} placeholder="Cari meja..." />
      <Button onClick={() => setOpen(true)} size="sm" aria-label="Tambah Meja">
        <Plus className="size-4" />
        <span className="hidden sm:inline">Tambah Meja</span>
      </Button>
    </>,
  )

  const columns: ColumnDef<Table, any>[] = [
    col.accessor('table_number', { header: 'Nomor' }),
    col.accessor('capacity', { header: 'Kapasitas' }),
    col.accessor((t) => (t.is_active ? 'Ya' : 'Tidak'), { id: 'is_active', header: 'Aktif' }),
    col.display({
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => {
        const t = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setQrTarget(t); setQrUrl('') }}>
                <Printer />
                Cetak QR
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.open(t.qr_link, '_blank')}>
                <ExternalLink />
                Kunjungi link
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setEditTarget(t)
                  setEditForm({ table_number: t.table_number, capacity: t.capacity })
                  setEditOpen(true)
                }}
              >
                <Pencil />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    await put<Table>(`/admin/tables/${t.id}`, { is_active: !t.is_active })
                    reload()
                  } catch (ex) {
                    setActionErr((ex as Error).message)
                  }
                }}
              >
                <Power />
                {t.is_active ? 'Nonaktif' : 'Aktifkan'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    }),
  ]

  async function create(e: FormEvent) {
    e.preventDefault()
    await post<Table>('/admin/tables', { ...form, capacity: Number(form.capacity) })
    setForm(empty)
    setOpen(false)
    setMsg('Meja dibuat')
    reload()
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    await put<Table>(`/admin/tables/${editTarget.id}`, {
      table_number: editForm.table_number,
      capacity: Number(editForm.capacity),
    })
    setEditOpen(false)
    setEditTarget(null)
    setMsg('Meja diperbarui')
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
            <DialogTitle>Tambah Meja</DialogTitle>
            <DialogDescription>Nomor meja dan kapasitas untuk cabang yang sedang dipilih.</DialogDescription>
          </DialogHeader>
          <form id="table-form" className="flex flex-col gap-4" onSubmit={create}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="table-number">Nomor meja</Label>
              <Input
                id="table-number"
                placeholder="T-01"
                value={form.table_number}
                onChange={(e) => setForm({ ...form, table_number: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="table-capacity">Kapasitas</Label>
              <Input
                id="table-capacity"
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
              />
            </div>
          </form>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Batal</Button>
            </DialogClose>
            <Button type="submit" form="table-form">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Meja</DialogTitle>
            <DialogDescription>{editTarget ? `Ubah meja ${editTarget.table_number}.` : ''}</DialogDescription>
          </DialogHeader>
          <form id="edit-table-form" className="flex flex-col gap-4" onSubmit={saveEdit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-table-number">Nomor meja</Label>
              <Input
                id="edit-table-number"
                value={editForm.table_number}
                onChange={(e) => setEditForm({ ...editForm, table_number: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-table-capacity">Kapasitas</Label>
              <Input
                id="edit-table-capacity"
                type="number"
                min={1}
                value={editForm.capacity}
                onChange={(e) => setEditForm({ ...editForm, capacity: Number(e.target.value) })}
              />
            </div>
          </form>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Batal</Button>
            </DialogClose>
            <Button type="submit" form="edit-table-form">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!qrTarget}
        onOpenChange={(o) => {
          if (!o) setQrTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Cetak QR Meja {qrTarget?.table_number}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {qrTarget && <QrImage value={qrTarget.qr_link} size={240} onData={setQrUrl} />}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={!qrUrl}
              onClick={() => {
                if (qrTarget && qrUrl) {
                  const a = document.createElement('a')
                  a.href = qrUrl
                  a.download = `qr-meja-${qrTarget.table_number}.png`
                  a.click()
                }
              }}
            >
              <Download />
              Download
            </Button>
            <Button
              disabled={!qrUrl}
              onClick={() => {
                if (qrTarget && qrUrl) {
                  printTable(qrTarget, qrUrl)
                  setQrTarget(null)
                }
              }}
            >
              <Printer />
              Cetak
            </Button>
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