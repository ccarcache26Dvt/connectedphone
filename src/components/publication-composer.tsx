import { useEffect, useRef, useState } from "react";
import { AtSign, ImagePlus, Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Profile } from "@/lib/chat-data";
import { createPublication } from "@/lib/social-data";
import { mentionName, resolveMentions, SOCIAL_MEDIA_LIMIT, type Mention, type PublicationKind } from "@/lib/social-features";

export function PublicationComposer({ me, kind, contacts, onClose, onPublished }: { me: string; kind: PublicationKind; contacts: Profile[]; onClose: () => void; onPublished: () => void }) {
  const [caption, setCaption] = useState("");
  const [dedication, setDedication] = useState("");
  const [field, setField] = useState<"caption" | "dedication">("caption");
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function chooseMention(contact: Profile) {
    const mention = { id: contact.id, name: mentionName(contact.display_name) };
    setMentions((current) => [...current.filter((item) => item.id !== contact.id), mention]);
    const value = field === "caption" ? caption : dedication;
    const next = /@[^@\n]*$/.test(value) ? value.replace(/@[^@\n]*$/, `@${mention.name} `) : `${value}${value && !value.endsWith(" ") ? " " : ""}@${mention.name} `;
    if (field === "caption") setCaption(next); else setDedication(next);
    setPicking(false);
    setSearch("");
  }

  function changeText(value: string, target: "caption" | "dedication") {
    if (target === "caption") setCaption(value); else setDedication(value);
    setField(target);
    const match = value.match(/@([^@\n]*)$/);
    if (match && !mentions.some((mention) => match[1]?.startsWith(mention.name))) {
      setPicking(true);
      setSearch(match[1] ?? "");
    } else setPicking(false);
  }

  async function publish() {
    setBusy(true);
    try {
      const safeCaption = resolveMentions(caption, contacts);
      const safeDedication = resolveMentions(dedication, contacts);
      const all = [...mentions, ...safeCaption.mentions, ...safeDedication.mentions];
      const unique = [...new Map(all.filter((mention) => `${safeCaption.text} ${safeDedication.text}`.includes(`@${mention.name}`)).map((mention) => [mention.id, mention])).values()];
      await createPublication(me, kind, safeCaption.text, safeDedication.text, unique, file);
      toast.success(kind === "status" ? "Estado publicado" : "Publicación guardada");
      onPublished();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo publicar. Inténtalo de nuevo.");
    } finally { setBusy(false); }
  }

  const available = contacts.filter((contact) => mentionName(contact.display_name).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) || (search.replace(/\D/g, "") && contact.phone.includes(search.replace(/\D/g, ""))));
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <DialogContent className="max-h-[92dvh] w-[calc(100%-1rem)] max-w-xl overflow-y-auto bg-panel p-4 sm:p-6" onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }} onInteractOutside={(event) => { if (busy) event.preventDefault(); }}>
      <DialogHeader className="pr-6 text-left"><DialogTitle>{kind === "status" ? "Nuevo estado" : "Nueva publicación"}</DialogTitle><DialogDescription>{kind === "status" ? "Contactos · 24 horas" : "Contactos · Permanente"}</DialogDescription></DialogHeader>
      <form className="min-w-0 space-y-4" onSubmit={(event) => { event.preventDefault(); void publish(); }}>
        <fieldset disabled={busy} className="min-w-0 space-y-4">
          <input ref={fileInput} type="file" accept="image/*,video/*" className="hidden" aria-label="Foto o video" onChange={(event) => {
            const selected = event.target.files?.[0];
            event.target.value = "";
            if (!selected) return;
            if (!/^(image|video)\//.test(selected.type)) { toast.error("Selecciona una foto o un video."); return; }
            if (selected.size > SOCIAL_MEDIA_LIMIT) { toast.error("El archivo no puede superar 50 MB."); return; }
            setFile(selected);
          }} />
          {preview && file ? <div className="relative overflow-hidden rounded-md bg-background">
            {file.type.startsWith("video/") ? <video src={preview} controls playsInline className="max-h-[30dvh] w-full object-contain" /> : <img src={preview} alt="Foto seleccionada" className="max-h-[30dvh] w-full object-contain" />}
            <Button type="button" size="icon" variant="secondary" className="absolute right-2 top-2" aria-label="Quitar archivo" title="Quitar archivo" onClick={() => setFile(null)}><X /></Button>
          </div> : <Button type="button" variant="outline" className="h-28 w-full border-dashed" onClick={() => fileInput.current?.click()}><ImagePlus />Foto o video</Button>}
          <div className="space-y-2"><Label htmlFor="publication-caption">Texto</Label><Textarea id="publication-caption" className="min-h-24 resize-y" value={caption} onFocus={() => setField("caption")} onChange={(event) => changeText(event.target.value, "caption")} /></div>
          <div className="space-y-2"><Label htmlFor="publication-dedication">Dedicatoria</Label><Textarea id="publication-dedication" className="min-h-16 resize-y" value={dedication} onFocus={() => setField("dedication")} onChange={(event) => changeText(event.target.value, "dedication")} /></div>
          <div className="flex items-center justify-between gap-2"><Button type="button" variant="ghost" size="sm" onClick={() => { setPicking((current) => !current); setSearch(""); }}><AtSign />Mencionar</Button><span className="text-xs text-muted-foreground">Solo contactos</span></div>
          {picking && <div className="space-y-2 border-y py-3">
            <Input aria-label="Buscar contacto para mencionar" placeholder="Nombre o número" value={search} onChange={(event) => setSearch(event.target.value)} />
            <div className="max-h-36 overflow-y-auto">{available.length ? available.map((contact) => <Button key={contact.id} type="button" variant="ghost" className="w-full justify-start overflow-hidden" onClick={() => chooseMention(contact)}><AtSign /><span className="truncate">{mentionName(contact.display_name)}</span></Button>) : <p className="py-3 text-sm text-muted-foreground">No se encontraron contactos.</p>}</div>
          </div>}
        </fieldset>
        <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="ghost" disabled={busy} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Send />}{busy ? "Publicando…" : "Publicar"}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}