import { describe, it, expect } from "vitest";
import { normalizePhone, phoneCountries, phoneToEmail } from "./phone";

describe("phone", () => {
  it("strips formatting characters", () => {
    expect(normalizePhone("+505 8888-1234")).toBe("50588881234");
  });
  it("rejects too short numbers", () => {
    expect(normalizePhone("1234")).toBeNull();
  });
  it("accepts valid Central American calling codes", () => {
    expect(normalizePhone("+505 8888 1234")).toBe("50588881234");
    expect(normalizePhone("+504 8888 1234")).toBe("50488881234");
  });
  it("combines registration numbers with the selected country calling code", () => {
    for (const code of ["NI", "HN", "MX", "CO", "CR", "ES", "AR", "US"]) {
      const country = phoneCountries.find((entry) => entry.code === code);
      expect(country).toBeDefined();
      expect(normalizePhone(`${country?.callingCode} 8888 1234`)).not.toBeNull();
    }
  });
  it("rejects unassigned calling codes", () => {
    expect(normalizePhone("+999 8888 1234")).toBeNull();
  });
  it("same number always maps to the same account", () => {
    expect(phoneToEmail(normalizePhone("+505 8888 1234")!)).toBe(
      phoneToEmail(normalizePhone("50588881234")!),
    );
  });
});
