import { beforeEach, describe, expect, it, vi } from "vitest";

const { from, rpc } = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from, rpc } }));
import { openConversationWith } from "./chat-data";

function chain(result: object) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    insert: vi.fn(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.insert.mockReturnValue(query);
  query.maybeSingle.mockResolvedValue(result);
  query.single.mockResolvedValue(result);
  return query;
}

describe("phone-number conversations", () => {
  beforeEach(() => {
    from.mockReset();
    rpc.mockReset();
  });

  it("reopens an existing conversation instead of losing its history", async () => {
    rpc.mockResolvedValueOnce({ data: "b", error: null });
    from.mockReturnValueOnce(chain({ data: { id: "saved-conversation" }, error: null }));
    expect(await openConversationWith("a", "50588881234")).toBe("saved-conversation");
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("creates a conversation for the registered phone number", async () => {
    rpc.mockResolvedValueOnce({ data: "a", error: null });
    const insert = chain({ data: { id: "new-conversation" }, error: null });
    from.mockReturnValueOnce(chain({ data: null, error: null })).mockReturnValueOnce(insert);
    expect(await openConversationWith("b", "50588881234")).toBe("new-conversation");
    expect(rpc).toHaveBeenCalledWith("find_user_by_phone", { _phone: "50588881234" });
    expect(insert.insert).toHaveBeenCalledWith({ user_a: "a", user_b: "b" });
  });

  it("reuses the same conversation when both people start it simultaneously", async () => {
    rpc.mockResolvedValueOnce({ data: "b", error: null });
    from
      .mockReturnValueOnce(chain({ data: null, error: null }))
      .mockReturnValueOnce(chain({ data: null, error: { code: "23505" } }))
      .mockReturnValueOnce(chain({ data: { id: "shared-conversation" }, error: null }));
    expect(await openConversationWith("a", "50588881234")).toBe("shared-conversation");
  });
});
