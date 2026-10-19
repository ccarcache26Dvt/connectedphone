import { describe, expect, it, beforeEach } from "vitest";
import {
  loadWallpaperConfig,
  saveWallpaperConfig,
  removeWallpaperConfig,
  wallpaperPresets,
} from "./chat-wallpaper";

describe("chat-wallpaper", () => {
  const userId = "test-user-123";

  beforeEach(() => {
    const store: Record<string, string> = {};
    const mockStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      },
      key: (i: number) => Object.keys(store)[i] ?? null,
      length: 0,
    };
    Object.defineProperty(window, "localStorage", {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
  });

  it("returns default config when storage is empty", () => {
    const config = loadWallpaperConfig(userId);
    expect(config.mode).toBe("none");
    expect(config.opacity).toBe(0.3);
  });

  it("has valid wallpaper presets defined", () => {
    expect(wallpaperPresets.length).toBeGreaterThanOrEqual(4);
    for (const preset of wallpaperPresets) {
      expect(preset.id).toBeDefined();
      expect(preset.name).toBeDefined();
      expect(preset.style).toBeDefined();
    }
  });

  it("saves and loads wallpaper configuration", () => {
    saveWallpaperConfig(userId, {
      mode: "preset",
      presetId: "cyber-grid",
      opacity: 0.45,
    });
    const loaded = loadWallpaperConfig(userId);
    expect(loaded.mode).toBe("preset");
    expect(loaded.presetId).toBe("cyber-grid");
    expect(loaded.opacity).toBe(0.45);

    removeWallpaperConfig(userId);
    const afterRemoval = loadWallpaperConfig(userId);
    expect(afterRemoval.mode).toBe("none");
  });
});
