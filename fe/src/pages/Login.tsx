import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ApiError, get } from "../api/client";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useDocTitle } from "../hooks/useDocTitle";

export default function Login() {
  const { user, login, setup } = useAuth();
  const nav = useNavigate();
  useDocTitle("Login");
  const [bootstrap, setBootstrap] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchPhone, setBranchPhone] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    get<{ bootstrap_needed: boolean }>("/auth/bootstrap")
      .then((res) => setBootstrap(res.data.bootstrap_needed))
      .catch(() => setBootstrap(false));
  }, []);

  if (user)
    return (
      <Navigate to={user.role === "cashier" ? "/pos" : "/admin"} replace />
    );

  async function submitSetup(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await setup(name, email, password, {
        name: branchName,
        address: branchAddress,
        phone: branchPhone,
      });
      nav("/");
    } catch (ex) {
      setErr(
        ex instanceof ApiError
          ? ex.message
          : "Gagal membuat akun, cek koneksi ke server",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await login(email, password);
      nav("/");
    } catch (ex) {
      setErr(
        ex instanceof ApiError
          ? ex.message
          : "Gagal login, cek koneksi ke server",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            {bootstrap ? "Setup Awal" : "qrdigo"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bootstrap === null ? null : bootstrap ? (
            <form className="flex flex-col gap-4" onSubmit={submitSetup}>
              {err && (
                <p className="text-sm font-medium text-destructive">{err}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Belum ada akun. Akun pertama otomatis menjadi Super Admin,
                beserta cabang pertama.
              </p>
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Nama</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="branchName">Nama Cabang</Label>
                <Input
                  id="branchName"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="branchAddress">Alamat Cabang</Label>
                <Input
                  id="branchAddress"
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="branchPhone">Telepon Cabang</Label>
                <Input
                  id="branchPhone"
                  type="tel"
                  value={branchPhone}
                  onChange={(e) => setBranchPhone(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={busy}>
                {busy ? "Memproses..." : "Buat Akun Super Admin"}
              </Button>
            </form>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={submit}>
              {err && (
                <p className="text-sm font-medium text-destructive">{err}</p>
              )}
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={busy}>
                {busy ? "Memproses..." : "Login"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
