import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  isPwaInstalled,
  requestPwaNotificationPermission,
  showPwaSystemNotification,
} from "./pwa-notifications";

describe("pwa-notifications", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("detects non-PWA browser context correctly", () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    expect(isPwaInstalled()).toBe(false);
  });

  it("detects standalone display-mode as PWA", () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === "(display-mode: standalone)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    expect(isPwaInstalled()).toBe(true);
  });

  it("refuses to request permission if not installed as PWA", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false } as MediaQueryList);
    const result = await requestPwaNotificationPermission();
    expect(result).toBe("not-pwa");
  });

  it("refuses to show notification if not installed as PWA", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false } as MediaQueryList);
    const shown = await showPwaSystemNotification({
      title: "Test",
      body: "Mensaje",
    });
    expect(shown).toBe(false);
  });
});
