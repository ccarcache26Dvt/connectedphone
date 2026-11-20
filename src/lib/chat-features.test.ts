import { describe, expect, it } from "vitest";
import { contactName, conversationPhotos, findReplyTarget, type DisplayMessage } from "./chat-features";
import type { Profile } from "./chat-data";

const profile: Profile = { id: "contact", phone: "50588881234", display_name: "Ana", public_key: null, last_seen: "2026-11-20T14:00:00Z", created_at: "2026-11-20T14:00:00Z" };
const base: DisplayMessage = {
  id: "original", conversation_id: "chat-one", sender_id: "contact", body: "Llegué bien",
  created_at: "2026-11-20T14:00:00Z", read_at: null, attachment_path: null, attachment_type: null,
  attachment_name: null, encryption_version: 0, reply_to_message_id: null,
};

describe("contact nicknames", () => {
  it("uses the personal nickname without changing the contact profile", () => {
    expect(contactName(profile, "  Anita  ")).toBe("Anita");
    expect(profile.display_name).toBe("Ana");
  });
  it("restores the registered name when the nickname is removed", () => {
    expect(contactName(profile, "")).toBe("Ana");
  });
});

describe("selected-message replies", () => {
  it("retrieves the selected original message within this conversation", () => {
    expect(findReplyTarget([base], "chat-one", "original")).toBe(base);
  });
  it("does not quote an original message from a different conversation", () => {
    expect(findReplyTarget([base], "chat-two", "original")).toBeNull();
  });
});

describe("conversation photo gallery", () => {
  it("includes photos but not documents, voice notes or text", () => {
    const photo = { ...base, id: "photo", attachment_path: "chat-one/photo.jpg", attachment_type: "image/jpeg" };
    const audio = { ...photo, id: "voice", attachment_type: "audio/webm" };
    const document = { ...photo, id: "document", attachment_type: "application/pdf" };
    expect(conversationPhotos([base, photo, audio, document])).toEqual([photo]);
  });
  it("includes encrypted photos only after their metadata has been decrypted", () => {
    const photo = { ...base, id: "private-photo", attachment_path: "chat-one/photo.enc", attachment_type: "image/jpeg", encryption_version: 1, fileIv: "file-iv" };
    expect(conversationPhotos([photo, { ...photo, id: "failed", decryptError: true }, { ...base, attachment_path: "locked.enc", attachment_type: "application/octet-stream", encryption_version: 1 }])).toEqual([photo]);
  });
});