import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];

export type ConversationItem = {
  conv: Conversation;
  other: Profile | null;
  last: Message | null;
  unread: number;
};

export async function fetchConversations(me: string): Promise<ConversationItem[]> {
  const { data: convs, error } = await supabase
    .from("conversations")
    .select("*")
    .order("last_message_at", { ascending: false });
  if (error) throw error;
  if (!convs.length) return [];
  const otherIds = convs.map((c) => (c.user_a === me ? c.user_b : c.user_a));
  const [{ data: profiles }, { data: msgs }] = await Promise.all([
    supabase.from("profiles").select("*").in("id", otherIds),
    supabase
      .from("messages")
      .select("*")
      .in("conversation_id", convs.map((c) => c.id))
      .order("created_at", { ascending: false })
      .limit(500),
  ]);
  return convs.map((conv) => {
    const otherId = conv.user_a === me ? conv.user_b : conv.user_a;
    const own = (msgs ?? []).filter((m) => m.conversation_id === conv.id);
    return {
      conv,
      other: profiles?.find((p) => p.id === otherId) ?? null,
      last: own[0] ?? null,
      unread: own.filter((m) => m.sender_id !== me && !m.read_at).length,
    };
  });
}

export async function fetchMessages(convId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function openConversationWith(me: string, phone: string): Promise<string> {
  const { data: other } = await supabase.from("profiles").select("id").eq("phone", phone).maybeSingle();
  if (!other) throw new Error("Ese número aún no está registrado en Chatline");
  if (other.id === me) throw new Error("No puedes chatear contigo mismo");
  const [a, b] = [me, other.id].sort();
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_a", a)
    .eq("user_b", b)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase.from("conversations").insert({ user_a: a, user_b: b }).select("id").single();
  if (error) throw error;
  return data.id;
}

export function initials(name: string) {
  return name
    .replace(/^\+/, "")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
