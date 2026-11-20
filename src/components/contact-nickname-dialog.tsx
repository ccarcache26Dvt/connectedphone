import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveContactNickname } from "@/lib/contact-nicknames";
import { formatPhone } from "@/lib/phone";
import type { Profile } from "@/lib/chat-data";

export function ContactNicknameDialog({ open, onOpenChange, ownerId, contact, nickname }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerId: string;
  contact: Profile;
  nickname: string;
}) {
  const [value, setValue] = useState(nickname);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  useEffect(() => { if (open) setValue(nickname); }, [open, nickname]);

  async function save(next: string) {
    setBusy(true);
    try {
      await saveContactNickname(ownerId, contact.id, next);
      await qc.invalidateQueries({ queryKey: ["contact-nicknames", ownerId] });
      onOpenChange(false);
      toast.success(next.trim() ? "Apodo guardado" : "Apodo eliminado");
    } catch {
      toast.error("No se pudo guardar el apodo. Inténtalo de nuevo.");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}>
      <DialogContent className="w-[calc(100%-2rem)] rounded-lg bg-panel">
        <DialogHeader className="pr-5 text-left">
          <DialogTitle>Apodo privado</DialogTitle>
          <DialogDescription className="break-words">{contact.display_name} · {formatPhone(contact.phone)}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => { event.preventDefault(); void save(value); }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact-nickname">Apodo</Label>
            <Input id="contact-nickname" value={value} onChange={(event) => setValue(event.target.value)}
              maxLength={80} autoComplete="off" disabled={busy} placeholder={contact.display_name || "Apodo"} />
          </div>
          <div className="flex justify-between gap-2">
            <Button type="button" variant="ghost" size="icon" title="Quitar apodo" aria-label="Quitar apodo"
              disabled={busy || !nickname} onClick={() => void save("")}><Trash2 className="h-4 w-4" /></Button>
            <Button type="submit" disabled={busy}><Check className="h-4 w-4" />{busy ? "Guardando…" : "Guardar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}