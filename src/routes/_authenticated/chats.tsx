import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeft, Check, CheckCheck, FileText, LogOut, MessageCircle, Paperclip, Plus, Search, Send,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchConversations, fetchMessages, openConversationWith, initials,
  type ConversationItem, type Message, type Profile,
} from "@/lib/chat-data";
import { normalizePhone, formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chats")({
  validateSearch: z.object({ c: z.string().optional() }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Chats — Connected" },
      { name: "description", content: "Tus conversaciones en Connected." },
      { property: "og:title", content: "Chats — Connected" },
      { property: "og:description", content: "Tus conversaciones en Connected." },
    ],
  }),
  component: ChatsPage,
});

function timeLabel(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Ayer";
  return format(d, "dd/MM/yy");
}

function ChatsPage() {
  const { user } = Route.useRouteContext();
  const me = user.id;
  const { c: activeId } = Route.useSearch();
  const navigate = useNavigate({ from: "/chats" });
  const qc = useQueryClient();
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [newOpen, setNewOpen] = useState(false);

  const { data: myProfile } = useQuery({
    queryKey: ["profile", me],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", me).single()).data,
  });
  const { data: convs = [] } = useQuery({
    queryKey: ["conversations", me],
    queryFn: () => fetchConversations(me),
  });

  // Realtime: new / updated messages and conversations
  useEffect(() => {
    const ch = supabase
      .channel("db-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload) => {
        const row = (payload.new ?? payload.old) as Message;
        qc.invalidateQueries({ queryKey: ["conversations", me] });
        if (row?.conversation_id) qc.invalidateQueries({ queryKey: ["messages", row.conversation_id] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversations" }, () => {
        qc.invalidateQueries({ queryKey: ["conversations", me] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [me, qc]);

  // Presence: who is online
  useEffect(() => {
    const ch = supabase.channel("online-users", { config: { presence: { key: me } } });
    ch.on("presence", { event: "sync" }, () => setOnline(new Set(Object.keys(ch.presenceState()))));
    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") await ch.track({ at: Date.now() });
    });
    const touch = () => supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", me);
    touch();
    const t = setInterval(touch, 60_000);
    window.addEventListener("beforeunload", touch);
    return () => {
      clearInterval(t);
      window.removeEventListener("beforeunload", touch);
      touch();
      supabase.removeChannel(ch);
    };
  }, [me]);

  const active = convs.find((c) => c.conv.id === activeId) ?? null;
  const filtered = convs.filter((c) => {
    const q = filter.toLowerCase();
    return !q || c.other?.display_name.toLowerCase().includes(q) || c.other?.phone.includes(q.replace(/\D/g, "") || "~");
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className={cn("flex w-full flex-col border-r bg-panel md:w-[380px]", active && "hidden md:flex")}>
        <div className="flex items-center justify-between px-4 py-4">
          <div className="min-w-0 flex items-center gap-3">
            <Avatar name={myProfile?.display_name ?? ""} />
            <div className="leading-tight">
              <div className="font-display text-lg font-semibold">Connected</div>
              <div className="truncate text-sm">{myProfile?.display_name}</div>
              <div className="text-xs text-muted-foreground">{myProfile && formatPhone(myProfile.phone)}</div>
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={() => setNewOpen(true)} aria-label="Nuevo chat">
              <Plus className="h-5 w-5" />
            </Button>
            <Button size="icon" variant="ghost" onClick={signOut} aria-label="Cerrar sesión">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar chat" className="pl-9" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="px-6 py-16 text-center text-sm text-muted-foreground">
              Aún no tienes chats.
              <Button className="mt-4 w-full" onClick={() => setNewOpen(true)}>
                <Plus className="h-4 w-4" /> Nuevo chat
              </Button>
            </div>
          )}
          {filtered.map((item) => (
            <ConvRow
              key={item.conv.id}
              item={item}
              me={me}
              active={item.conv.id === activeId}
              online={!!item.other && online.has(item.other.id)}
              onClick={() => navigate({ search: { c: item.conv.id } })}
            />
          ))}
        </div>
      </aside>

      {/* Chat panel */}
      <section className={cn("flex-1", !active && "hidden md:flex")}>
        {active ? (
          <ChatPanel
            key={active.conv.id}
            item={active}
            me={me}
            online={!!active.other && online.has(active.other.id)}
            onBack={() => navigate({ search: {} })}
          />
        ) : (
          <div className="chat-canvas flex h-full w-full flex-col items-center justify-center gap-4 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <MessageCircle className="h-8 w-8" />
            </span>
            <h2 className="text-2xl font-semibold">Connected</h2>
            <p className="max-w-xs text-sm text-muted-foreground">Elige una conversación o inicia una nueva con un número de teléfono.</p>
          </div>
        )}
      </section>

      <NewChatDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        me={me}
        onOpened={(id) => {
          qc.invalidateQueries({ queryKey: ["conversations", me] });
          navigate({ search: { c: id } });
        }}
      />
    </div>
  );
}

function Avatar({ name, online, size = "md" }: { name: string; online?: boolean; size?: "md" | "sm" }) {
  return (
    <div className="relative shrink-0">
      <div className={cn("grid place-items-center rounded-full bg-secondary font-semibold text-secondary-foreground", size === "md" ? "h-11 w-11" : "h-9 w-9 text-sm")}>
        {initials(name) || "?"}
      </div>
      {online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-panel bg-online" />}
    </div>
  );
}

function ConvRow({ item, me, active, online, onClick }: { item: ConversationItem; me: string; active: boolean; online: boolean; onClick: () => void }) {
  const name = item.other?.display_name || (item.other ? formatPhone(item.other.phone) : "Usuario");
  const last = item.last;
  const preview = last ? (last.body || (last.attachment_type?.startsWith("image/") ? "📷 Foto" : `📎 ${last.attachment_name ?? "Archivo"}`)) : "Nuevo chat";
  return (
    <Button variant="ghost" onClick={onClick} className={cn("flex h-auto w-full justify-start whitespace-normal rounded-none items-center gap-3 px-4 py-3 text-left", active && "bg-accent")}>
      <Avatar name={name} online={online} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate font-semibold">{name}</span>
          {last && <span className={cn("shrink-0 text-xs", item.unread ? "text-primary" : "text-muted-foreground")}>{timeLabel(last.created_at)}</span>}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1 truncate text-sm text-muted-foreground">
            {last && last.sender_id === me && <Ticks read={!!last.read_at} />}
            <span className="truncate">{preview}</span>
          </span>
          {item.unread > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">{item.unread}</span>
          )}
        </div>
      </div>
    </Button>
  );
}

function Ticks({ read }: { read: boolean }) {
  return read ? <CheckCheck className="h-4 w-4 shrink-0 text-read" /> : <Check className="h-4 w-4 shrink-0 opacity-70" />;
}

function ChatPanel({ item, me, online, onBack }: { item: ConversationItem; me: string; online: boolean; onBack: () => void }) {
  const convId = item.conv.id;
  const other = item.other;
  const name = other?.display_name || (other ? formatPhone(other.phone) : "Usuario");
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingSent = useRef(0);

  const { data: messages = [] } = useQuery({ queryKey: ["messages", convId], queryFn: () => fetchMessages(convId) });

  // Typing indicator
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const ch = supabase.channel(`typing:${convId}`);
    ch.on("broadcast", { event: "typing" }, ({ payload }) => {
      if (payload.user === me) return;
      setTyping(true);
      clearTimeout(timer);
      timer = setTimeout(() => setTyping(false), 3000);
    }).subscribe();
    channelRef.current = ch;
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(ch);
    };
  }, [convId, me]);

  // Mark incoming as read
  useEffect(() => {
    const unread = messages.filter((m) => m.sender_id !== me && !m.read_at);
    if (!unread.length) return;
    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unread.map((m) => m.id))
      .then(() => qc.invalidateQueries({ queryKey: ["conversations", me] }));
  }, [messages, me, qc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typing]);

  function onType(v: string) {
    setText(v);
    const now = Date.now();
    if (now - lastTypingSent.current > 1500) {
      lastTypingSent.current = now;
      channelRef.current?.send({ type: "broadcast", event: "typing", payload: { user: me } });
    }
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({ conversation_id: convId, sender_id: me, body });
    setSending(false);
    if (error) { toast.error("No se pudo enviar. Tu mensaje sigue aquí para reintentar."); return; }
    setText("");
    qc.invalidateQueries({ queryKey: ["messages", convId] });
    qc.invalidateQueries({ queryKey: ["conversations", me] });
  }

  async function sendFile(file: File): Promise<void> {
    if (file.size > 20 * 1024 * 1024) { toast.error("Máximo 20 MB por archivo"); return; }
    setSending(true);
    const safe = file.name.replace(/[^\w.-]/g, "_");
    const path = `${convId}/${crypto.randomUUID()}-${safe}`;
    const up = await supabase.storage.from("attachments").upload(path, file, { contentType: file.type });
    if (up.error) {
      setSending(false);
      { toast.error("No se pudo subir el archivo"); return; }
    }
    const { error } = await supabase.from("messages").insert({
      conversation_id: convId, sender_id: me, attachment_path: path,
      attachment_type: file.type || "application/octet-stream", attachment_name: file.name,
    });
    setSending(false);
    if (error) { toast.error("El archivo no se pudo enviar. Inténtalo de nuevo."); return; }
    qc.invalidateQueries({ queryKey: ["messages", convId] });
    qc.invalidateQueries({ queryKey: ["conversations", me] });
  }

  const grouped = useMemo(() => {
    const out: { day: string; items: Message[] }[] = [];
    for (const m of messages) {
      const d = new Date(m.created_at);
      const day = isToday(d) ? "Hoy" : isYesterday(d) ? "Ayer" : format(d, "d 'de' MMMM yyyy", { locale: es });
      if (out.at(-1)?.day !== day) out.push({ day, items: [] });
      out.at(-1)?.items.push(m);
    }
    return out;
  }, [messages]);

  return (
    <div className="flex h-full w-full flex-col">
      <header className="flex items-center gap-3 border-b bg-panel px-4 py-3">
        <Button size="icon" variant="ghost" className="md:hidden" onClick={onBack} aria-label="Volver">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar name={name} online={online} size="sm" />
        <div className="leading-tight">
          <div className="font-semibold">{name}</div>
          <div className={cn("text-xs", typing || online ? "text-online" : "text-muted-foreground")}>
            {typing ? "escribiendo…" : online ? "en línea" : other ? lastSeenLabel(other) : ""}
          </div>
        </div>
      </header>

      <div className="chat-canvas flex-1 overflow-y-auto px-4 py-6 md:px-10">
        {grouped.map((g) => (
          <div key={g.day} className="space-y-1.5">
            <div className="sticky top-0 z-10 my-4 flex justify-center">
              <span className="rounded-full bg-panel px-3 py-1 text-xs text-muted-foreground shadow">{g.day}</span>
            </div>
            {g.items.map((m) => (
              <Bubble key={m.id} m={m} mine={m.sender_id === me} />
            ))}
          </div>
        ))}
        {typing && (
          <div className="mt-2 inline-flex gap-1 rounded-2xl rounded-bl-sm bg-bubble-in px-4 py-3">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex items-center gap-2 border-t bg-panel px-3 py-3">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) sendFile(f);
            e.target.value = "";
          }}
        />
        <Button type="button" size="icon" variant="ghost" onClick={() => fileRef.current?.click()} disabled={sending} aria-label="Adjuntar">
          <Paperclip className="h-5 w-5" />
        </Button>
        <Input
          value={text}
          onChange={(e) => onType(e.target.value)}
          placeholder={sending ? "Subiendo archivo…" : "Escribe un mensaje"}
          className="h-11 rounded-full"
        />
        <Button type="submit" size="icon" className="h-11 w-11 shrink-0 rounded-full" disabled={sending || !text.trim()} aria-label="Enviar">
          <Send className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
}

function lastSeenLabel(p: Profile) {
  return `últ. vez ${formatDistanceToNow(new Date(p.last_seen), { addSuffix: true, locale: es })}`;
}

function Bubble({ m, mine }: { m: Message; mine: boolean }) {
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-3 py-2 shadow-sm md:max-w-[60%]",
          mine ? "rounded-br-sm bg-bubble-out text-bubble-out-foreground" : "rounded-bl-sm bg-bubble-in text-bubble-in-foreground",
        )}
      >
        {m.attachment_path && <Attachment m={m} />}
        {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
        <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] opacity-70">
          {format(new Date(m.created_at), "HH:mm")}
          {mine && (m.read_at ? <CheckCheck className="h-3.5 w-3.5 text-read" /> : <Check className="h-3.5 w-3.5" />)}
        </div>
      </div>
    </div>
  );
}

function Attachment({ m }: { m: Message }) {
  const { data: url } = useQuery({
    queryKey: ["signed", m.attachment_path],
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      if (!m.attachment_path) return null;
      const { data, error } = await supabase.storage.from("attachments").createSignedUrl(m.attachment_path, 3600);
      if (error) throw error;
      return data?.signedUrl ?? null;
    },
  });
  if (m.attachment_type?.startsWith("image/")) {
    return url ? (
      <a href={url} target="_blank" rel="noreferrer">
        <img src={url} alt={m.attachment_name ?? "Foto"} className="mb-1 max-h-80 rounded-xl object-cover" />
      </a>
    ) : (
      <div className="mb-1 h-48 w-56 animate-pulse rounded-xl bg-muted" />
    );
  }
  return (
    <a href={url ?? "#"} target="_blank" rel="noreferrer" className="mb-1 flex items-center gap-2 rounded-xl bg-background/20 px-3 py-2">
      <FileText className="h-6 w-6 shrink-0" />
      <span className="truncate text-sm font-medium">{m.attachment_name}</span>
    </a>
  );
}

function NewChatDialog({ open, onOpenChange, me, onOpened }: { open: boolean; onOpenChange: (o: boolean) => void; me: string; onOpened: (id: string) => void }) {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const p = normalizePhone(phone);
    if (!p) { toast.error("Número inválido. Incluye el código de país"); return; }
    setBusy(true);
    try {
      const id = await openConversationWith(me, p);
      onOpenChange(false);
      setPhone("");
      onOpened(id);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-panel">
        <DialogHeader>
          <DialogTitle>Nuevo chat</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Input type="tel" autoFocus placeholder="+505 8888 1234" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Buscando…" : "Iniciar chat"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
