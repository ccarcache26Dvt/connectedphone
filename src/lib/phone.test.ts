import { describe, it, expect } from "vitest";
import { normalizePhone, phoneToEmail } from "./phone";

describe("phone", () => {
  it("strips formatting characters", () => {
    expect(normalizePhone("+505 8888-1234")).toBe("50588881234");
  });
  it("rejects too short numbers", () => {
    expect(normalizePhone("1234")).toBeNull();
  });
  it("same number always maps to the same account", () => {
    expect(phoneToEmail(normalizePhone("+505 8888 1234")!)).toBe(
      phoneToEmail(normalizePhone("50588881234")!),
    );
  });
});
