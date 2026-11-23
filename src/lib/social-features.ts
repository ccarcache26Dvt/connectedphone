import type { Database, Json } from "@/integrations/supabase/types";
import type { Profile } from "@/lib/chat-data";

export type Publication = Database["public"]["Tables"]["social_publications"]["Row"];
export type PublicationKind = "status" | "post";
export type Mention = { id: string; name: string };
export const SOCIAL_MEDIA_LIMIT = 50 * 1024 * 1024;

export function mentionName(name: string): string {
  const clean = name.trim();
  return !clean || /^[\d+() .-]+$/.test(clean) ? "Usuario" : clean;
}

export function readMentions(value: Json): Mention[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item) || typeof item["id"] !== "string" || typeof item["name"] !== "string") return [];
    return [{ id: item["id"], name: mentionName(item["name"]) }];
  });
}

// Typed @phone references are resolved only against the author's chat contacts.
export function resolveMentions(text: string, contacts: Profile[]): { text: string; mentions: Mention[] } {
  const mentions = new Map<string, Mention>();
  const safeText = text.replace(/@\+?\d{7,15}\b/g, (reference) => {
    const digits = reference.replace(/\D/g, "");
    const contact = contacts.find((profile) => profile.phone.replace(/\D/g, "") === digits || (digits.length >= 8 && profile.phone.replace(/\D/g, "").endsWith(digits)));
    if (!contact) throw new Error("Ese número no corresponde a uno de tus contactos del chat.");
    const mention = { id: contact.id, name: mentionName(contact.display_name) };
    mentions.set(contact.id, mention);
    return `@${mention.name}`;
  });
  return { text: safeText, mentions: [...mentions.values()] };
}

export function hashtags(text: string): string[] {
  return [...new Set([...text.matchAll(/#([\p{L}\p{N}_]+)/gu)].map((match) => match[1]?.toLocaleLowerCase() ?? ""))].filter(Boolean);
}

export function isActivePublication(publication: Publication, now: number): boolean {
  return publication.expires_at === null || new Date(publication.expires_at).getTime() > now;
}

export function matchesPublication(publication: Publication, search: string): boolean {
  const query = search.trim().toLocaleLowerCase();
  if (!query) return true;
  if (query.startsWith("#")) return hashtags(`${publication.caption} ${publication.dedication}`).some((tag) => tag === query.slice(1));
  return `${publication.caption} ${publication.dedication} ${readMentions(publication.mentions).map((mention) => mention.name).join(" ")}`.toLocaleLowerCase().includes(query);
}

export function validatePublication(kind: PublicationKind, caption: string, dedication: string, file: { type: string; size: number } | null): void {
  if (kind === "status" && !file) throw new Error("Selecciona una foto o un video para tu estado.");
  if (!file && !caption.trim() && !dedication.trim()) throw new Error("Escribe algo o selecciona una foto o un video.");
  if (file && !/^(image|video)\//.test(file.type)) throw new Error("Selecciona una foto o un video.");
  if (file && file.size > SOCIAL_MEDIA_LIMIT) throw new Error("El archivo no puede superar 50 MB.");
}