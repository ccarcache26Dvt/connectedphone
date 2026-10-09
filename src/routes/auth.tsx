import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizePhone, phoneToEmail } from "@/lib/phone";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Chatline" },
      { name: "description", content: "Inicia sesión o crea tu cuenta con tu número de teléfono." },
      { property: "og:title", content: "Entrar — Chatline" },
      { property: "og:description", content: "Accede con tu número de teléfono y contraseña." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = normalizePhone(phone);
    if (!p) return toast.error("Número inválido. Incluye el código de país, ej. +505 8888 1234");
    if (password.length < 6) return toast.error("La contraseña debe tener al menos 6 caracteres");
    setLoading(true);
    const email = phoneToEmail(p);
    const { error } =
      mode === "up"
        ? await supabase.auth.signUp({
            email,
            password,
            options: { data: { phone: p, display_name: name.trim() || `+${p}` } },
          })
        : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      const msg = error.message.includes("already registered")
        ? "Ese número ya tiene cuenta. Inicia sesión."
        : error.message.includes("Invalid login")
          ? "Número o contraseña incorrectos"
          : error.message;
      return toast.error(msg);
    }
    navigate({ to: "/chats", replace: true });
  }

  return (
    <main className="grid min-h-screen place-items-center bg-glow px-4">
      <div className="w-full max-w-sm rounded-3xl border bg-panel p-8 shadow-2xl">
        <Link to="/" className="mb-6 flex items-center gap-2 font-display font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <MessageCircle className="h-5 w-5" />
          </span>
          Chatline
        </Link>
        <h1 className="text-2xl font-semibold">{mode === "in" ? "Bienvenido de vuelta" : "Crea tu cuenta"}</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Número de teléfono</Label>
            <Input id="phone" type="tel" placeholder="+505 8888 1234" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          </div>
          {mode === "up" && (
            <div className="space-y-2">
              <Label htmlFor="name">Tu nombre</Label>
              <Input id="name" placeholder="Carlos" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="pw">Contraseña</Label>
            <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Un momento…" : mode === "in" ? "Entrar" : "Registrarme"}
          </Button>
        </form>
        <button
          type="button"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
          className="mt-6 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "in" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Entra"}
        </button>
      </div>
    </main>
  );
}
