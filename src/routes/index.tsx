import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle, Phone, Image as ImageIcon, CheckCheck, Mic, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstallPwaButton } from "@/components/install-pwa-button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Connected — Mensajería por número de teléfono" },
      { name: "description", content: "      Mensajes privados 1 a 1 con tu número de teléfono. Chats cifrados, notas de voz y colores a tu gusto." },
      { property: "og:title", content: "Connected — Mensajería por número de teléfono" },
      { property: "og:description", content: "Mensajes privados 1 a 1 con tu número. Tus conversaciones siempre guardadas." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-glow">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <MessageCircle className="h-5 w-5" />
          </span>
          Connected
        </div>
        <div className="flex items-center gap-2">
          <InstallPwaButton />
          <Button asChild variant="ghost">
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-24 pt-12 md:grid-cols-2 md:items-center">
        <div>
          <h1 className="text-5xl font-semibold leading-tight md:text-6xl">
            Connected<br />
            <span className="text-foreground">Tus conversaciones.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            Escribe a cualquier persona solo con su número de teléfono. Todo queda guardado y sincronizado al instante.
          </p>
          <div className="mt-8 flex gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Crear cuenta</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/chats">Abrir chats</Link>
            </Button>
          </div>
          <ul className="mt-10 grid gap-3 text-sm text-muted-foreground">
            <li className="flex items-center gap-3"><Phone className="h-4 w-4 text-primary" /> Inicia chats por número</li>
            <li className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-primary" /> Mensajes nuevos cifrados de extremo a extremo</li>
            <li className="flex items-center gap-3"><ImageIcon className="h-4 w-4 text-primary" /> Envía fotos y archivos cifrados</li>
            <li className="flex items-center gap-3"><Mic className="h-4 w-4 text-primary" /> Graba y envía notas de voz privadas</li>
            <li className="flex items-center gap-3"><CheckCheck className="h-4 w-4 text-primary" /> Visto, en línea y escribiendo…</li>
          </ul>
        </div>

        <div className="rounded-3xl border bg-panel p-5 shadow-2xl">
          <div className="flex items-center gap-3 border-b pb-4">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary font-semibold">AM</div>
            <div>
              <div className="font-semibold">Ana Martínez</div>
              <div className="text-xs text-online">en línea</div>
            </div>
          </div>
          <div className="chat-canvas -mx-5 mt-0 space-y-3 px-5 py-6">
            <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-bubble-in px-4 py-2 text-bubble-in-foreground">¿Llegaste bien? 🙌</div>
            <div className="ml-auto max-w-[75%] rounded-2xl rounded-br-sm bg-bubble-out px-4 py-2 text-bubble-out-foreground">
              Sí, todo perfecto. Te mando la foto ahora
              <div className="mt-1 flex justify-end gap-1 text-[10px] opacity-70">17:12 <CheckCheck className="h-3 w-3" /></div>
            </div>
            <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-bubble-in px-4 py-2 text-sm italic text-muted-foreground">escribiendo…</div>
          </div>
        </div>
      </section>
    </main>
  );
}
