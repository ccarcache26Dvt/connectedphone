import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight, CirclePlay, Images, Loader2, Plus, RefreshCw, Search, Trash2, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ConnectedNavigation } from "@/components/connected-navigation";
import { PublicationComposer } from "@/components/publication-composer";
import { contactName } from "@/lib/chat-features";
import { deletePublication, socialFeedOptions } from "@/lib/social-data";
import { isActivePublication, matchesPublication, mentionName, readMentions, type Publication, type PublicationKind } from "@/lib/social-features";

function SocialMedia({ publication, thumbnail = false }: { publication: Publication; thumbnail?: boolean }) {
  const { data: url, error, refetch } = useQuery({
    queryKey: ["social-media-url", publication.id, publication.media_path],
    enabled: Boolean(publication.media_path),
    staleTime: 60_000,
    gcTime: 0,
    queryFn: async () => {
      if (!publication.media_path) return null;
      const seconds = publication.expires_at ? Math.min(300, Math.floor((Date.parse(publication.expires_at) - Date.now()) / 1000)) : 300;
      if (seconds <= 0) throw new Error("Este estado ha caducado.");
      const { data, error: signedError } = await supabase.storage.from("social-media").createSignedUrl(publication.media_path, seconds);
      if (signedError) throw signedError;
      return data.signedUrl;
    },
  });
  if (!publication.media_path) return null;
  if (!url) return <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 bg-muted text-muted-foreground">{error ? <><span className="px-3 text-center text-sm">No se pudo cargar el archivo.</span><Button variant="ghost" size="icon" onClick={() => { void refetch(); }} aria-label="Reintentar cargar archivo" title="Reintentar cargar archivo"><RefreshCw /></Button></> : <Loader2 className="animate-spin" />}</div>;
  if (publication.media_type?.startsWith("video/")) return <div className="relative w-full bg-background"><video src={url} controls={!thumbnail} muted={thumbnail} playsInline preload="metadata" className={thumbnail ? "aspect-[3/4] w-full object-cover" : "max-h-[60dvh] w-full object-contain"} />{thumbnail && <CirclePlay className="absolute left-3 top-3 h-6 w-6 text-primary-foreground" />}</div>;
  return <img src={url} alt={publication.caption || "Foto publicada"} loading="lazy" className={thumbnail ? "aspect-[3/4] w-full object-cover" : "max-h-[60dvh] w-full object-contain bg-background"} />;
}

function PublicationText({ text, onTag }: { text: string; onTag: (tag: string) => void }) {
  return <p className="whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere]">{text.split(/(#[\p{L}\p{N}_]+)/gu).map((part, index) => part.startsWith("#") ? <Button key={index} variant="link" className="inline h-auto whitespace-normal p-0 text-read" onClick={() => onTag(part)}>{part}</Button> : <span key={index}>{part}</span>)}</p>;
}

export function SocialFeed({ me, kind }: { me: string; kind: PublicationKind }) {
  const { data } = useSuspenseQuery(socialFeedOptions(me, kind));
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [compose, setCompose] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Publication | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    const refresh = () => { setNow(Date.now()); void qc.invalidateQueries({ queryKey: ["social-feed", me] }); };
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [me, qc]);
  const publications = data.publications.filter((publication) => isActivePublication(publication, now) && matchesPublication(publication, search));
  const selectedIndex = publications.findIndex((publication) => publication.id === selectedId);
  const selected = publications[selectedIndex];
  const author = (publication: Publication) => {
    if (publication.author_id === me) return mentionName(data.profile.display_name);
    const profile = data.contacts.find((contact) => contact.id === publication.author_id) ?? null;
    return mentionName(contactName(profile, data.nicknames[publication.author_id]));
  };
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["social-feed", me] }); };
  const showTag = (tag: string) => { setSearch(tag); setSelectedId(null); };
  const text = (publication: Publication) => <div className="min-w-0 space-y-3">
    {publication.caption && <PublicationText text={publication.caption} onTag={showTag} />}
    {publication.dedication && <div className="border-l-2 border-primary pl-3"><div className="mb-1 text-xs text-muted-foreground">Dedicatoria</div><PublicationText text={publication.dedication} onTag={showTag} /></div>}
    {readMentions(publication.mentions).length > 0 && <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-read">{readMentions(publication.mentions).map((mention) => <span key={mention.id} className="[overflow-wrap:anywhere]">@{mention.name}</span>)}</div>}
  </div>;
  return <main className="min-h-dvh min-w-0 bg-background">
    <header className="sticky top-0 z-20 border-b bg-panel">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-3 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2"><Button asChild variant="ghost" size="icon"><Link to="/chats" aria-label="Volver a chats" title="Volver a chats"><ArrowLeft /></Link></Button><div className="min-w-0"><div className="font-display font-semibold">Connected</div><div className="truncate text-xs text-muted-foreground">{mentionName(data.profile.display_name)}</div></div></div>
        <Button size="sm" onClick={() => setCompose(true)}><Plus />{kind === "status" ? "Nuevo estado" : "Nuevo post"}</Button>
      </div>
      <div className="mx-auto max-w-4xl"><ConnectedNavigation active={kind} /></div>
    </header>
    <section className="mx-auto min-w-0 max-w-4xl px-3 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h1 className="font-display text-2xl font-semibold">{kind === "status" ? "Estados" : "Publicaciones"}</h1><div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" />Contactos · {kind === "status" ? "24 horas" : "Permanentes"}</div></div><Button variant="ghost" size="icon" onClick={refresh} aria-label="Actualizar publicaciones" title="Actualizar publicaciones"><RefreshCw /></Button></div>
      <div className="relative mb-6"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Buscar publicaciones" placeholder="Buscar texto, #etiqueta o nombre" className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      {!publications.length ? <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center text-muted-foreground">{kind === "status" ? <CirclePlay className="h-10 w-10" /> : <Images className="h-10 w-10" />}<p>{search ? "No se encontraron publicaciones." : kind === "status" ? "Aún no hay estados." : "Aún no hay publicaciones."}</p>{!search && <Button variant="outline" onClick={() => setCompose(true)}><Plus />{kind === "status" ? "Crear estado" : "Crear publicación"}</Button>}</div> : kind === "status" ?
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">{publications.map((publication) => <article key={publication.id} className="relative min-w-0 overflow-hidden rounded-lg border bg-card">
          <Button variant="ghost" className="block h-auto w-full overflow-hidden rounded-none p-0 text-left" onClick={() => setSelectedId(publication.id)} aria-label={`Ver estado de ${author(publication)}`}><SocialMedia publication={publication} thumbnail /><div className="space-y-1 p-3"><div className="truncate text-sm font-semibold">{publication.author_id === me ? "Mi estado" : author(publication)}</div><div className="truncate text-xs text-muted-foreground">{formatDistanceToNow(new Date(publication.created_at), { addSuffix: true, locale: es })}</div></div></Button>
        </article>)}</div> :
        <div className="mx-auto max-w-2xl space-y-5">{publications.map((publication) => <article key={publication.id} className="min-w-0 overflow-hidden rounded-lg border bg-card">
          <div className="flex min-w-0 items-center justify-between gap-2 p-4"><div className="min-w-0"><div className="truncate font-semibold">{author(publication)}{publication.author_id === me && <span className="ml-2 text-xs font-normal text-muted-foreground">Tú</span>}</div><div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(publication.created_at), { addSuffix: true, locale: es })}</div></div>{publication.author_id === me && <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setDeleting(publication)} aria-label="Eliminar publicación" title="Eliminar publicación"><Trash2 /></Button>}</div>
          {publication.media_path && <SocialMedia publication={publication} />}
          {(publication.caption || publication.dedication || readMentions(publication.mentions).length > 0) && <div className="p-4">{text(publication)}</div>}
        </article>)}</div>}
    </section>
    {compose && <PublicationComposer me={me} kind={kind} contacts={data.contacts} onClose={() => setCompose(false)} onPublished={refresh} />}
    <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
      <DialogContent className="max-h-[94dvh] w-[calc(100%-1rem)] max-w-2xl overflow-y-auto bg-panel p-4"><DialogHeader className="pr-6 text-left"><DialogTitle>{selected ? author(selected) : "Estado"}</DialogTitle><DialogDescription>Estado · 24 horas</DialogDescription></DialogHeader>{selected && <><SocialMedia key={selected.id} publication={selected} />{text(selected)}<div className="flex items-center justify-between gap-2 border-t pt-3"><Button variant="ghost" size="icon" aria-label="Estado anterior" title="Estado anterior" disabled={selectedIndex === 0} onClick={() => setSelectedId(publications[selectedIndex - 1]?.id ?? null)}><ChevronLeft /></Button><span className="text-xs text-muted-foreground">{selectedIndex + 1} / {publications.length}</span>{selected.author_id === me && <Button variant="ghost" size="icon" aria-label="Eliminar estado" title="Eliminar estado" onClick={() => setDeleting(selected)}><Trash2 /></Button>}<Button variant="ghost" size="icon" aria-label="Estado siguiente" title="Estado siguiente" disabled={selectedIndex === publications.length - 1} onClick={() => setSelectedId(publications[selectedIndex + 1]?.id ?? null)}><ChevronRight /></Button></div></>}</DialogContent>
    </Dialog>
    <Dialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open && !busy) setDeleting(null); }}><DialogContent className="w-[calc(100%-1rem)] max-w-sm bg-panel"><DialogHeader><DialogTitle>¿Eliminar {kind === "status" ? "estado" : "publicación"}?</DialogTitle><DialogDescription>Se eliminará para ti y tus contactos.</DialogDescription></DialogHeader><div className="flex justify-end gap-2"><Button variant="ghost" disabled={busy} onClick={() => setDeleting(null)}>Cancelar</Button><Button variant="destructive" disabled={busy} onClick={() => { if (!deleting) return; setBusy(true); void deletePublication(deleting.id, me, deleting.media_path).then(() => { setDeleting(null); setSelectedId(null); refresh(); toast.success("Eliminado"); }).catch((error: unknown) => { refresh(); toast.error(error instanceof Error ? error.message : "No se pudo eliminar."); }).finally(() => setBusy(false)); }}>{busy ? <Loader2 className="animate-spin" /> : <Trash2 />}Eliminar</Button></div></DialogContent></Dialog>
  </main>;
}