import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { decryptFile } from "@/lib/message-encryption";
import type { DisplayMessage } from "@/lib/chat-features";

// Shared by chat attachments and gallery; decrypted URLs stay on this device.
export function useAttachmentUrl(message: DisplayMessage, chatKey: CryptoKey | null) {
  const signed = useQuery({
    queryKey: ["signed", message.attachment_path],
    enabled: Boolean(message.attachment_path),
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      if (!message.attachment_path) return null;
      const { data, error } = await supabase.storage.from("attachments").createSignedUrl(message.attachment_path, 3600);
      if (error) throw error;
      return data?.signedUrl ?? null;
    },
  });
  const [decrypted, setDecrypted] = useState<{ source: string; url: string } | null>(null);
  const [decryptionError, setDecryptionError] = useState<string | null>(null);
  const source = `${signed.data ?? ""}:${message.fileIv ?? ""}`;

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    const controller = new AbortController();
    setDecrypted(null);
    setDecryptionError(null);
    const url = signed.data;
    const iv = message.fileIv;
    const mime = message.attachment_type;
    if (!url || message.encryption_version === 0 || !chatKey || !iv || !mime) return;
    void fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("No se pudo descargar el archivo.");
        return response.arrayBuffer();
      })
      .then((encrypted) => decryptFile(encrypted, iv, chatKey))
      .then((bytes) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
        setDecrypted({ source, url: objectUrl });
      })
      .catch((error: unknown) => {
        if (!cancelled) setDecryptionError(error instanceof Error ? error.message : "No se pudo descifrar el archivo.");
      });
    return () => {
      cancelled = true;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [signed.data, message.encryption_version, message.fileIv, message.attachment_type, chatKey, source]);

  return {
    url: message.encryption_version === 0 ? signed.data ?? null : decrypted?.source === source ? decrypted.url : null,
    error: signed.error?.message ?? decryptionError,
    retry: () => { void signed.refetch(); },
  };
}