import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchConversations } from "@/lib/chat-data";
import { fetchContactNicknames } from "@/lib/contact-nicknames";
import { isActivePublication, validatePublication, type Mention, type PublicationKind } from "@/lib/social-features";

export function socialFeedOptions(me: string, kind: PublicationKind) {
  return queryOptions({
    queryKey: ["social-feed", me, kind],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [{ data: rows, error }, conversations, nicknames, own] = await Promise.all([
        supabase.from("social_publications").select("*").eq("kind", kind).order("created_at", { ascending: false }),
        fetchConversations(me),
        fetchContactNicknames(me),
        supabase.from("profiles").select("*").eq("id", me).single(),
      ]);
      if (error) throw error;
      if (own.error) throw own.error;
      const contacts = conversations.flatMap((conversation) => conversation.other ? [conversation.other] : []);
      return { publications: (rows ?? []).filter((row) => isActivePublication(row, Date.now())), contacts, nicknames, profile: own.data };
    },
  });
}

export async function createPublication(me: string, kind: PublicationKind, caption: string, dedication: string, mentions: Mention[], file: File | null) {
  validatePublication(kind, caption, dedication, file);
  let path: string | null = null;
  if (file) {
    path = `${me}/${crypto.randomUUID()}`;
    const { error } = await supabase.storage.from("social-media").upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
  }
  const { data, error } = await supabase.from("social_publications").insert({ author_id: me, kind, caption: caption.trim(), dedication: dedication.trim(), mentions, media_path: path, media_type: file?.type ?? null }).select("*").single();
  if (error) {
    if (path) await supabase.storage.from("social-media").remove([path]);
    throw error;
  }
  return data;
}

export async function deletePublication(id: string, me: string, path: string | null) {
  const { error } = await supabase.from("social_publications").delete().eq("id", id).eq("author_id", me);
  if (error) throw error;
  if (path) {
    const { error: mediaError } = await supabase.storage.from("social-media").remove([path]);
    if (mediaError) throw new Error("La publicación se eliminó, pero no se pudo retirar el archivo.");
  }
}