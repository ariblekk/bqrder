import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { del, get, post } from "../api/client";
import type { Category } from "../api/types";
import { HeaderSearch } from "../components/HeaderSearch";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "../components/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { useAsync } from "../hooks/useAsync";
import { usePageTitle } from "../hooks/usePageTitle";

export default function Categories() {
  const { data, err, reload } = useAsync(
    () => get<Category[]>("/admin/categories"),
    [],
  );
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [actionErr, setActionErr] = useState("");

  usePageTitle(
    "Kategori",
    <>
      <HeaderSearch onSearch={setQ} placeholder="Cari kategori..." />
      <Button onClick={() => setOpen(true)} size="sm" aria-label="Tambah">
        <Plus className="size-4" />
        <span className="hidden sm:inline">Tambah Kategori</span>
      </Button>
    </>,
  );

  const rows = (data?.data ?? []).filter((c) =>
    [c.name, c.description].some((v) =>
      (v ?? "").toLowerCase().includes(q.toLowerCase()),
    ),
  );

  async function create(e: FormEvent) {
    e.preventDefault();
    await post<Category>("/admin/categories", { name });
    setName("");
    setOpen(false);
    setMsg("Kategori dibuat");
    reload();
  }

  return (
    <>
      {(err || actionErr) && (
        <p className="text-sm font-medium text-destructive">
          {err || actionErr}
        </p>
      )}
      {msg && <p className="text-sm font-medium text-primary">{msg}</p>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Kategori</DialogTitle>
            <DialogDescription>
              Nama kategori untuk mengelompokkan produk.
            </DialogDescription>
          </DialogHeader>
          <form
            id="category-form"
            className="flex flex-col gap-4"
            onSubmit={create}
          >
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
            <Button type="submit" form="category-form">
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.description || "-"}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      if (!confirm(`Hapus kategori "${c.name}"?`)) return;
                      try {
                        await del(`/admin/categories/${c.id}`);
                        reload();
                      } catch (ex) {
                        setActionErr((ex as Error).message);
                      }
                    }}
                  >
                    Hapus
                  </Button>
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
