import { useState, type FormEvent } from 'react'
import { MoreHorizontal, Pencil, Plus, Power } from 'lucide-react'
import { get, post, put } from '../api/client'
import { getBranchId } from '../api/client'
import type { Branch, Role, User } from '../api/types'
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
  Select,
} from '../components/ui'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table'
import { SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { useAsync } from '../hooks/useAsync'
import { useAuth } from '../context/AuthContext'
import { usePageTitle } from '../hooks/usePageTitle'

const empty = { name: '', email: '', password: '', role: 'cashier' as Role }
const editEmpty = { name: '', email: '', password: '', role: 'cashier' as Role }

const roleOptions = [
  { value: 'cashier', label: 'Kasir' },
  { value: 'branch_admin', label: 'Branch Admin' },
]

export default function Users() {
  const { data, err, reload } = useAsync(() => get<User[]>('/admin/users'), [])
  const { user: me } = useAuth()
  const { data: branches } = useAsync(() => get<Branch[]>('/admin/branches').then((r) => r.data), [])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState(editEmpty)
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')
  const [actionErr, setActionErr] = useState('')
  const isSuper = me?.role === 'super_admin'

  usePageTitle(
    'User',
    <>
      <HeaderSearch onSearch={setQ} placeholder="Cari user..." />
      <Button onClick={() => setOpen(true)} size="sm" aria-label="Tambah User">
        <Plus className="size-4" />
        <span className="hidden sm:inline">Tambah User</span>
      </Button>
    </>,
  )

  async function create(e: FormEvent) {
    e.preventDefault()
    await post<User>('/admin/users', {
      ...form,
      branch_id: isSuper ? getBranchId() || branches?.[0]?.id : me?.branch_id,
    })
    setForm(empty)
    setOpen(false)
    setMsg('User dibuat')
    reload()
  }

  function startEdit(u: User) {
    setEditTarget(u)
    setEditForm({ name: u.name, email: u.email, password: '', role: u.role })
    setEditOpen(true)
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    const body: Record<string, unknown> = {
      name: editForm.name,
      email: editForm.email,
      role: editForm.role,
    }
    if (editForm.password) body.password = editForm.password
    await put<User>(`/admin/users/${editTarget.id}`, body)
    setEditOpen(false)
    setEditTarget(null)
    setMsg('User diperbarui')
    reload()
  }

  async function toggleActive(u: User) {
    try {
      await put<User>(`/admin/users/${u.id}`, {
        name: u.name,
        email: u.email,
        role: u.role,
        is_active: !u.is_active,
      })
      reload()
    } catch (ex) {
      setActionErr((ex as Error).message)
    }
  }

  return (
    <>
      {(err || actionErr) && (
        <p className="text-sm font-medium text-destructive">{err || actionErr}</p>
      )}
      {isSuper && branches && !branches.length && (
        <p className="text-sm font-medium text-destructive">Buat cabang dulu sebelum menambah user.</p>
      )}
      {msg && <p className="text-sm font-medium text-primary">{msg}</p>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah User</DialogTitle>
            <DialogDescription>Akun untuk mengakses sistem di cabang yang sedang dipilih.</DialogDescription>
          </DialogHeader>
          <form id="user-form" className="flex flex-col gap-4" onSubmit={create}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="user-name">Nama</Label>
              <Input
                id="user-name"
                placeholder="Nama"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="user-password">Password</Label>
              <Input
                id="user-password"
                type="password"
                placeholder="Minimal 8 karakter"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            {isSuper && (
              <div className="flex flex-col gap-2">
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v as Role })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Batal</Button>
            </DialogClose>
            <Button type="submit" form="user-form" disabled={isSuper && !branches?.length}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>{editTarget ? `Ubah akun ${editTarget.name}.` : ''}</DialogDescription>
          </DialogHeader>
          <form id="edit-user-form" className="flex flex-col gap-4" onSubmit={saveEdit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-user-name">Nama</Label>
              <Input
                id="edit-user-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-user-email">Email</Label>
              <Input
                id="edit-user-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-user-password">Password baru</Label>
              <Input
                id="edit-user-password"
                type="password"
                placeholder="Kosongkan jika tidak diganti"
                minLength={8}
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              />
            </div>
            {isSuper && (
              <div className="flex flex-col gap-2">
                <Label>Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(v) => setEditForm({ ...editForm, role: v as Role })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Batal</Button>
            </DialogClose>
            <Button type="submit" form="edit-user-form">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UserTable
        data={data?.data ?? []}
        branches={branches ?? []}
        filter={q}
        onEdit={startEdit}
        onToggle={toggleActive}
      />
    </>
  )
}

function UserTable({
  data,
  branches,
  filter,
  onEdit,
  onToggle,
}: {
  data: User[]
  branches: Branch[]
  filter: string
  onEdit: (u: User) => void
  onToggle: (u: User) => void
}) {
  const branchName = (id: number) => branches.find((b) => b.id === id)?.name ?? `#${id}`
  const rows = data.filter((u) =>
    [u.name, u.email, u.role, branchName(u.branch_id)].some((v) =>
      (v ?? '').toLowerCase().includes(filter.toLowerCase()),
    ),
  )
  return (
    <div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Cabang</TableHead>
              <TableHead>Aktif</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.role}</TableCell>
                <TableCell>{branchName(u.branch_id)}</TableCell>
                <TableCell>{u.is_active ? 'Ya' : 'Tidak'}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(u)}>
                        <Pencil />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onToggle(u)}>
                        <Power />
                        {u.is_active ? 'Nonaktif' : 'Aktifkan'}
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
    </div>
  )
}