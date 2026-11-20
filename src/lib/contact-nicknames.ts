import { supabase } from "@/integrations/supabase/client";

export async function fetchContactNicknames(ownerId: string): Promise<Record<string, string>> {
  const { data, error } = await supabase.from("contact_nicknames").select("contact_id,nickname").eq("owner_id", ownerId);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((row) => [row.contact_id, row.nickname]));
}

export async function saveContactNickname(ownerId: string, contactId: string, value: string): Promise<void> {
  const nickname = value.trim();
  const { error } = nickname
    ? await supabase.from("contact_nicknames").upsert({ owner_id: ownerId, contact_id: contactId, nickname }, { onConflict: "owner_id,contact_id" })
    : await supabase.from("contact_nicknames").delete().eq("owner_id", ownerId).eq("contact_id", contactId);
  if (error) throw error;
}