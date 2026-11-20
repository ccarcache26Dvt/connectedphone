import { useEffect } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Image, MessageCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAttachmentUrl } from "@/hooks/use-attachment-url";
import type { DisplayMessage } from "@/lib/chat-features";

export function ChatPhotoGallery({ open, onOpenChange, photos, selectedId, onSelect, contactName, chatKey, onShowMessage }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photos: DisplayMessage[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  contactName: string;
  chatKey: CryptoKey | null;
  onShowMessage: (id: string) => void;
}) {
  const selectedIndex = photos.findIndex((photo) => photo.id === selectedId);
  const selected = selectedIndex >= 0 ? photos[selectedIndex] : null;
  const move = (direction: number) => {
    const next = photos[selectedIndex + direction];
    if (next) onSelect(next.id);
  };
  useEffect(() => {
    if (!open || !selected) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const next = photos[selectedIndex + (event.key === "ArrowLeft" ? -1 : 1)];
      if (next) onSelect(next.id);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, selected, selectedIndex, photos, onSelect]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%-1rem)] max-w-3xl min-w-0 flex-col rounded-lg bg-panel p-3 sm:p-5" aria-describedby="gallery-contact">
        <DialogHeader className="shrink-0 pr-7 text-left">
          <div className="flex min-w-0 items-center gap-2">
            {selected && <Button size="icon" variant="ghost" className="shrink-0" onClick={() => onSelect(null)} aria-label="Volver a la galería" title="Volver a la galería"><ArrowLeft /></Button>}
            <DialogTitle className="min-w-0 truncate">Fotos compartidas</DialogTitle>
          </div>
          <DialogDescription id="gallery-contact" className="truncate">{contactName} · {photos.length} {photos.length === 1 ? "foto" : "fotos"}</DialogDescription>
        </DialogHeader>
        {selected ? (
          <>
            <PhotoViewer key={selected.id} message={selected} chatKey={chatKey} />
            <div className="flex shrink-0 items-center justify-between gap-1 border-t pt-3">
              <Button size="icon" variant="ghost" disabled={selectedIndex === 0} onClick={() => move(-1)} aria-label="Foto anterior" title="Foto anterior"><ChevronLeft /></Button>
              <span className="shrink-0 text-xs text-muted-foreground">{selectedIndex + 1} / {photos.length}</span>
              <Button size="icon" variant="ghost" disabled={selectedIndex >= photos.length - 1} onClick={() => move(1)} aria-label="Foto siguiente" title="Foto siguiente"><ChevronRight /></Button>
              <Button size="icon" variant="ghost" onClick={() => { onOpenChange(false); onShowMessage(selected.id); }} aria-label="Ver foto en la conversación" title="Ver foto en la conversación"><MessageCircle /></Button>
            </div>
          </>
        ) : photos.length ? (
          <div className="grid min-h-0 min-w-0 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
            {[...photos].reverse().map((photo) => <PhotoThumbnail key={photo.id} message={photo} chatKey={chatKey} onSelect={() => onSelect(photo.id)} />)}
          </div>
        ) : (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-muted-foreground">
            <Image className="h-10 w-10" /><p className="text-sm">Aún no hay fotos en esta conversación.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PhotoThumbnail({ message, chatKey, onSelect }: { message: DisplayMessage; chatKey: CryptoKey | null; onSelect: () => void }) {
  const { url, error } = useAttachmentUrl(message, chatKey);
  return (
    <Button variant="ghost" onClick={onSelect} className="relative aspect-square h-auto min-w-0 overflow-hidden rounded-md bg-muted p-0" aria-label={`Abrir foto ${message.attachment_name || "compartida"}`}>
      {url ? <img src={url} alt={message.attachment_name || "Foto compartida"} loading="lazy" className="h-full w-full object-cover" /> : <Image className={error ? "text-destructive" : "animate-pulse text-muted-foreground"} />}
    </Button>
  );
}

function PhotoViewer({ message, chatKey }: { message: DisplayMessage; chatKey: CryptoKey | null }) {
  const { url, error, retry } = useAttachmentUrl(message, chatKey);
  return (
    <>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-background">
        {url ? <img src={url} alt={message.attachment_name || "Foto compartida"} className="h-[52dvh] max-h-[60dvh] w-full object-contain" />
          : <div className="flex h-[52dvh] w-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <Image className={error ? "h-8 w-8 text-destructive" : "h-8 w-8 animate-pulse"} />
            <span className="px-4 text-center text-sm">{error || "Cargando foto…"}</span>
            {error && <Button size="icon" variant="ghost" onClick={retry} aria-label="Reintentar cargar foto" title="Reintentar cargar foto"><RefreshCw /></Button>}
          </div>}
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs text-muted-foreground">{format(new Date(message.created_at), "d MMM yyyy · HH:mm", { locale: es })}</span>
        {url ? <Button asChild size="icon" variant="ghost"><a href={url} download={message.attachment_name || "foto"} target="_blank" rel="noreferrer" aria-label="Descargar foto" title="Descargar foto"><Download /></a></Button>
          : <Button size="icon" variant="ghost" disabled aria-label="Descargar foto"><Download /></Button>}
      </div>
    </>
  );
}