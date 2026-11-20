import type { Message, Profile } from "@/lib/chat-data";
import { formatPhone } from "@/lib/phone";

export type DisplayMessage = Message & {
  legacyHistory?: boolean;
  decryptError?: boolean;
  fileIv?: string;
};

export function contactName(profile: Profile | null, nickname?: string | null): string {
  return nickname?.trim() || profile?.display_name || (profile ? formatPhone(profile.phone) : "Usuario");
}

export function conversationPhotos(messages: DisplayMessage[]): DisplayMessage[] {
  return messages.filter((message) =>
    Boolean(message.attachment_path && message.attachment_type?.startsWith("image/") &&
      !message.decryptError && (message.encryption_version === 0 || message.fileIv)),
  );
}

export function findReplyTarget(messages: DisplayMessage[], conversationId: string, targetId: string | null): DisplayMessage | null {
  if (!targetId) return null;
  return messages.find((message) => message.id === targetId && message.conversation_id === conversationId) ?? null;
}

export function messageExcerpt(message: DisplayMessage): string {
  if (message.decryptError) return "Mensaje no disponible";
  if (message.body) return message.body;
  if (message.attachment_type?.startsWith("image/")) return "Foto";
  if (message.attachment_type?.startsWith("audio/")) return "Nota de voz";
  if (message.attachment_path) return message.attachment_name || "Archivo";
  return "Mensaje cifrado";
}