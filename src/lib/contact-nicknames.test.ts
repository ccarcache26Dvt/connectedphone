import { beforeEach, describe, expect, it, vi } from "vitest";
const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));
import { fetchContactNicknames, saveContactNickname } from "./contact-nicknames";

describe("private contact nickname storage", () => {
  beforeEach(() => from.mockReset());
  it("loads only the current user's nicknames", async () => {
    const eq = vi.fn().mockResolvedValue({ data: [{ contact_id: "contact-a", nickname: "Anita" }], error: null });
    const select = vi.fn().mockReturnValue({ eq });
    from.mockReturnValue({ select });
    expect(await fetchContactNicknames("owner-a")).toEqual({ "contact-a": "Anita" });
    expect(eq).toHaveBeenCalledWith("owner_id", "owner-a");
  });
  it("saves the nickname with the current user as owner, not on the shared profile", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    from.mockReturnValue({ upsert });
    await saveContactNickname("owner-a", "contact-a", "  Anita  ");
    expect(from).toHaveBeenCalledWith("contact_nicknames");
    expect(upsert).toHaveBeenCalledWith({ owner_id: "owner-a", contact_id: "contact-a", nickname: "Anita" }, { onConflict: "owner_id,contact_id" });
  });
  it("removes only this owner's nickname for the selected contact", async () => {
    const eq = vi.fn();
    eq.mockReturnValueOnce({ eq }).mockResolvedValueOnce({ error: null });
    from.mockReturnValue({ delete: vi.fn().mockReturnValue({ eq }) });
    await saveContactNickname("owner-a", "contact-a", " ");
    expect(eq.mock.calls).toEqual([["owner_id", "owner-a"], ["contact_id", "contact-a"]]);
  });
});