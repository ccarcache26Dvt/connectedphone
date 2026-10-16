export const chatPalettes = [
  {
    id: "violet",
    name: "Violeta",
    primary: "oklch(0.53 0.235 300)",
    primaryForeground: "oklch(0.94 0.004 285)",
    ring: "oklch(0.65 0.21 300)",
    accent: "oklch(0.25 0.04 300)",
    bubbleOut: "oklch(0.39 0.155 300)",
    bubbleIn: "oklch(0.23 0.008 285)",
    background: "oklch(0.105 0 0)",
    panel: "oklch(0.145 0.006 285)",
    card: "oklch(0.18 0.008 285)",
  },
  {
    id: "ocean",
    name: "Océano",
    primary: "oklch(0.58 0.17 235)",
    primaryForeground: "oklch(0.97 0.01 235)",
    ring: "oklch(0.68 0.16 235)",
    accent: "oklch(0.25 0.045 235)",
    bubbleOut: "oklch(0.4 0.13 235)",
    bubbleIn: "oklch(0.23 0.025 235)",
    background: "oklch(0.105 0 0)",
    panel: "oklch(0.145 0.006 285)",
    card: "oklch(0.18 0.008 285)",
  },
  {
    id: "forest",
    name: "Bosque",
    primary: "oklch(0.62 0.16 155)",
    primaryForeground: "oklch(0.97 0.01 155)",
    ring: "oklch(0.7 0.16 155)",
    accent: "oklch(0.25 0.045 155)",
    bubbleOut: "oklch(0.4 0.12 155)",
    bubbleIn: "oklch(0.23 0.025 155)",
    background: "oklch(0.105 0 0)",
    panel: "oklch(0.145 0.006 285)",
    card: "oklch(0.18 0.008 285)",
  },
  {
    id: "rose",
    name: "Rosa",
    primary: "oklch(0.61 0.21 15)",
    primaryForeground: "oklch(0.97 0.01 15)",
    ring: "oklch(0.69 0.18 15)",
    accent: "oklch(0.25 0.05 15)",
    bubbleOut: "oklch(0.41 0.15 15)",
    bubbleIn: "oklch(0.23 0.025 15)",
    background: "oklch(0.105 0 0)",
    panel: "oklch(0.145 0.006 285)",
    card: "oklch(0.18 0.008 285)",
  },
  {
    id: "sunset",
    name: "Atardecer",
    primary: "oklch(0.68 0.18 55)",
    primaryForeground: "oklch(0.19 0.02 55)",
    ring: "oklch(0.75 0.16 55)",
    accent: "oklch(0.27 0.05 55)",
    bubbleOut: "oklch(0.47 0.15 55)",
    bubbleIn: "oklch(0.24 0.03 55)",
    background: "oklch(0.105 0 0)",
    panel: "oklch(0.145 0.006 285)",
    card: "oklch(0.18 0.008 285)",
  },
  {
    id: "black-gray",
    name: "Negro y gris oscuro",
    primary: "#27272a",
    primaryForeground: "#f4f4f5",
    ring: "#71717a",
    accent: "#18181b",
    bubbleOut: "#27272a",
    bubbleIn: "#141416",
    background: "#050505",
    panel: "#0e0e11",
    card: "#18181b",
  },
] as const;

export type ChatPaletteId = (typeof chatPalettes)[number]["id"];

export function getChatPalette(id: string) {
  const targetId = id === "black-green" ? "black-gray" : id;
  return chatPalettes.find((palette) => palette.id === targetId) ?? chatPalettes[0];
}

export function applyChatPalette(id: string) {
  const palette = getChatPalette(id);
  const root = document.documentElement.style;
  root.setProperty("--primary", palette.primary);
  root.setProperty("--primary-foreground", palette.primaryForeground);
  root.setProperty("--ring", palette.ring);
  root.setProperty("--accent", palette.accent);
  root.setProperty("--bubble-out", palette.bubbleOut);
  root.setProperty("--bubble-in", palette.bubbleIn);
  root.setProperty("--background", palette.background);
  root.setProperty("--panel", palette.panel);
  root.setProperty("--card", palette.card);
}
