import { describe, expect, it } from "vitest";
import { applyChatPalette, getChatPalette } from "./chat-themes";

describe("chat color palettes", () => {
  it("includes the dark black and dark gray palette", () => {
    const palette = getChatPalette("black-gray");

    expect(palette.name).toBe("Oscuro");
    expect(palette.background).toBe("#050505");
    expect(palette.primary).toBe("#27272a");
  });

  it("supports black-green as a backwards-compatible alias for black-gray", () => {
    const palette = getChatPalette("black-green");

    expect(palette.id).toBe("black-gray");
    expect(palette.name).toBe("Oscuro");
  });

  it("applies and restores dark surface colors when switching palettes", () => {
    applyChatPalette("black-gray");
    expect(document.documentElement.style.getPropertyValue("--background")).toBe("#050505");

    applyChatPalette("violet");
    expect(document.documentElement.style.getPropertyValue("--background")).toBe("oklch(0.105 0 0)");
  });
});
