import { FileText, Image, Mic, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { messageExcerpt, type DisplayMessage } from "@/lib/chat-features";

export function MessageReference({ message, senderName, onClick, disabled = false }: {
  message: DisplayMessage | null;
  senderName: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const Icon = message?.attachment_type?.startsWith("image/") ? Image
    : message?.attachment_type?.startsWith("audio/") ? Mic : message?.attachment_path ? FileText : Reply;
  return (
    <Button type="button" variant="ghost" onClick={onClick} disabled={disabled || !message}
      aria-label="Ver mensaje original"
      className="mb-1 grid h-auto w-full min-w-0 grid-cols-[auto_minmax(0,1fr)] justify-start gap-2 whitespace-normal rounded-md border-l-2 border-primary bg-background/20 px-2 py-2 text-left">
      <Icon className="h-4 w-4 shrink-0 text-primary" />
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold text-foreground">{senderName}</span>
        <span className="line-clamp-2 text-xs font-normal text-foreground [overflow-wrap:anywhere]">
          {message ? messageExcerpt(message) : "Mensaje original no disponible"}
        </span>
      </span>
    </Button>
  );
}