CREATE TABLE public.contact_nicknames (
  owner_id uuid NOT NULL,
  contact_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  PRIMARY KEY (owner_id, contact_id),
  CONSTRAINT contact_nickname_not_self CHECK (owner_id <> contact_id),
  CONSTRAINT contact_nickname_valid CHECK (char_length(btrim(nickname)) BETWEEN 1 AND 80)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_nicknames TO authenticated;
GRANT ALL ON public.contact_nicknames TO service_role;
ALTER TABLE public.contact_nicknames ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners read private contact nicknames" ON public.contact_nicknames FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "owners add nicknames for chat partners" ON public.contact_nicknames FOR INSERT TO authenticated WITH CHECK (
  owner_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE (c.user_a = auth.uid() AND c.user_b = contact_id) OR (c.user_b = auth.uid() AND c.user_a = contact_id)
  )
);
CREATE POLICY "owners edit nicknames for chat partners" ON public.contact_nicknames FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (
  owner_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE (c.user_a = auth.uid() AND c.user_b = contact_id) OR (c.user_b = auth.uid() AND c.user_a = contact_id)
  )
);
CREATE POLICY "owners remove private contact nicknames" ON public.contact_nicknames FOR DELETE TO authenticated USING (owner_id = auth.uid());
ALTER TABLE public.messages ADD COLUMN reply_to_message_id uuid;
CREATE UNIQUE INDEX messages_conversation_message_unique ON public.messages (conversation_id, id);
ALTER TABLE public.messages ADD CONSTRAINT messages_reply_same_conversation FOREIGN KEY (conversation_id, reply_to_message_id) REFERENCES public.messages (conversation_id, id);
ALTER TABLE public.messages ADD CONSTRAINT messages_cannot_reply_to_self CHECK (reply_to_message_id IS NULL OR reply_to_message_id <> id);
CREATE INDEX messages_reply_target_idx ON public.messages (reply_to_message_id) WHERE reply_to_message_id IS NOT NULL;