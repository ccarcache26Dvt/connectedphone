CREATE TABLE public.social_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('status', 'post')),
  caption text NOT NULL DEFAULT '',
  dedication text NOT NULL DEFAULT '',
  mentions jsonb NOT NULL DEFAULT '[]'::jsonb,
  media_path text,
  media_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  CONSTRAINT publication_media_pair CHECK ((media_path IS NULL) = (media_type IS NULL)),
  CONSTRAINT publication_media_type CHECK (media_type IS NULL OR media_type LIKE 'image/%' OR media_type LIKE 'video/%')
);
GRANT SELECT, INSERT, DELETE ON public.social_publications TO authenticated;
GRANT ALL ON public.social_publications TO service_role;
ALTER TABLE public.social_publications ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.social_is_contact(_owner uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT _owner = auth.uid() OR EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE (c.user_a = auth.uid() AND c.user_b = _owner)
       OR (c.user_b = auth.uid() AND c.user_a = _owner)
  );
$$;
REVOKE ALL ON FUNCTION public.social_is_contact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.social_is_contact(uuid) TO authenticated, service_role;

CREATE FUNCTION public.validate_social_publication() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE item jsonb; mentioned uuid; registered_name text; safe_mentions jsonb := '[]'::jsonb;
BEGIN
  NEW.created_at := now();
  IF NEW.kind = 'status' THEN
    IF NEW.media_path IS NULL THEN RAISE EXCEPTION 'Un estado necesita una foto o un video'; END IF;
    NEW.expires_at := NEW.created_at + interval '24 hours';
  ELSE
    NEW.expires_at := NULL;
    IF NEW.media_path IS NULL AND btrim(NEW.caption) = '' AND btrim(NEW.dedication) = '' THEN
      RAISE EXCEPTION 'La publicación está vacía';
    END IF;
  END IF;
  IF NEW.media_path IS NOT NULL AND split_part(NEW.media_path, '/', 1) <> NEW.author_id::text THEN
    RAISE EXCEPTION 'El archivo debe pertenecer al autor';
  END IF;
  IF jsonb_typeof(NEW.mentions) <> 'array' THEN RAISE EXCEPTION 'Menciones inválidas'; END IF;
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.mentions) LOOP
    mentioned := (item->>'id')::uuid;
    IF NOT EXISTS (SELECT 1 FROM public.conversations c WHERE
       (c.user_a = NEW.author_id AND c.user_b = mentioned) OR (c.user_b = NEW.author_id AND c.user_a = mentioned)) THEN
      RAISE EXCEPTION 'Solo puedes mencionar a tus contactos del chat';
    END IF;
    SELECT p.display_name INTO registered_name FROM public.profiles p WHERE p.id = mentioned;
    registered_name := btrim(coalesce(registered_name, ''));
    IF registered_name = '' OR regexp_replace(registered_name, '[+() .-]', '', 'g') ~ '^[0-9]+$' THEN
      registered_name := 'Usuario';
    END IF;
    safe_mentions := safe_mentions || jsonb_build_array(jsonb_build_object('id', mentioned, 'name', registered_name));
  END LOOP;
  NEW.mentions := safe_mentions;
  RETURN NEW;
END;
$$;
CREATE TRIGGER validate_social_publication_before_insert BEFORE INSERT ON public.social_publications
FOR EACH ROW EXECUTE FUNCTION public.validate_social_publication();

CREATE POLICY "authors and chat contacts read active publications" ON public.social_publications
FOR SELECT TO authenticated USING (
  author_id = auth.uid() OR (public.social_is_contact(author_id) AND (expires_at IS NULL OR expires_at > now()))
);
CREATE POLICY "authors create publications" ON public.social_publications
FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "authors delete publications" ON public.social_publications
FOR DELETE TO authenticated USING (author_id = auth.uid());
CREATE INDEX social_publications_feed_idx ON public.social_publications(kind, created_at DESC);
CREATE INDEX social_publications_author_idx ON public.social_publications(author_id);

CREATE POLICY "authors upload social media" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'social-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "contacts read active social media" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'social-media' AND (
  (storage.foldername(name))[1] = auth.uid()::text OR EXISTS (
    SELECT 1 FROM public.social_publications p WHERE p.media_path = name
    AND public.social_is_contact(p.author_id) AND (p.expires_at IS NULL OR p.expires_at > now())
  )
));
CREATE POLICY "authors remove social media" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'social-media' AND (storage.foldername(name))[1] = auth.uid()::text);