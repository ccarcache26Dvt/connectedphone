import { describe, expect, it } from "vitest";
import { hashtags, isActivePublication, matchesPublication, mentionName, readMentions, resolveMentions, validatePublication, type Publication } from "./social-features";
import type { Profile } from "./chat-data";

const ana: Profile = { id: "ana", display_name: "Ana", phone: "50588881234", created_at: "2026-11-23T16:00:00Z", last_seen: "2026-11-23T16:00:00Z", public_key: null };
const publication: Publication = { id: "post", author_id: "author", kind: "post", caption: "Para @Ana #Amistad", dedication: "Siempre juntos", mentions: [{ id: "ana", name: "Ana" }], media_path: null, media_type: null, created_at: "2026-11-23T16:00:00Z", expires_at: null };

describe("social publications", () => {
  it("hides statuses at exactly 24 hours", () => {
    const status = { ...publication, kind: "status", expires_at: "2026-11-24T16:00:00Z" };
    expect(isActivePublication(status, Date.parse("2026-11-24T15:59:59Z"))).toBe(true);
    expect(isActivePublication(status, Date.parse("2026-11-24T16:00:00Z"))).toBe(false);
  });
  it("keeps permanent posts visible after 24 hours", () => {
    expect(isActivePublication(publication, Date.parse("2027-11-23T16:00:00Z"))).toBe(true);
  });
  it("requires photo or video for a status", () => {
    expect(() => validatePublication("status", "Hola", "", null)).toThrow();
    expect(() => validatePublication("status", "", "", { type: "video/mp4", size: 10 })).not.toThrow();
  });
  it("allows a dedication-only permanent post", () => {
    expect(() => validatePublication("post", "", "Para Ana", null)).not.toThrow();
    expect(() => validatePublication("post", "", "", null)).toThrow();
  });
  it("replaces a chat contact's phone reference with their registered name", () => {
    expect(resolveMentions("Para @88881234", [ana])).toEqual({ text: "Para @Ana", mentions: [{ id: "ana", name: "Ana" }] });
    expect(resolveMentions("@+50588881234", [ana]).text).toBe("@Ana");
  });
  it("refuses phone mentions outside the chat contacts", () => {
    expect(() => resolveMentions("@77770919", [ana])).toThrow();
  });
  it("never displays phone numbers as mentioned user names", () => {
    expect(mentionName("+505 8888-1234")).toBe("Usuario");
    expect(readMentions([{ id: "ana", name: "+50588881234" }])).toEqual([{ id: "ana", name: "Usuario" }]);
  });
  it("searches exact hashtags, including accents, without partial matches", () => {
    expect(hashtags("#Amistad #amistad #Fotografía")).toEqual(["amistad", "fotografía"]);
    expect(matchesPublication(publication, "#amistad")).toBe(true);
    expect(matchesPublication(publication, "#ami")).toBe(false);
  });
  it("searches dedications and mentioned names", () => {
    expect(matchesPublication(publication, "juntos")).toBe(true);
    expect(matchesPublication(publication, "Ana")).toBe(true);
    expect(matchesPublication(publication, "Pedro")).toBe(false);
  });
});