export type WallpaperPreset = {
  id: string;
  name: string;
  previewGradient: string;
  style: React.CSSProperties;
};

export const wallpaperPresets: WallpaperPreset[] = [
  {
    id: "stellar-nebula",
    name: "Nebulosa Estelar",
    previewGradient: "radial-gradient(circle at 20% 30%, #581c87, #0f172a, #020617)",
    style: {
      backgroundImage: `
        radial-gradient(circle at 15% 25%, rgba(147, 51, 234, 0.45) 0%, transparent 45%),
        radial-gradient(circle at 85% 75%, rgba(59, 130, 246, 0.35) 0%, transparent 50%),
        radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.15) 0%, transparent 60%)
      `,
      backgroundColor: "#08070d",
      backgroundSize: "cover",
      backgroundPosition: "center",
    },
  },
  {
    id: "cyber-grid",
    name: "Matriz Cyber",
    previewGradient: "linear-gradient(135deg, #18181b 25%, #27272a 25%, #27272a 50%, #18181b 50%)",
    style: {
      backgroundImage: `
        linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
      `,
      backgroundColor: "#09090b",
      backgroundSize: "32px 32px",
    },
  },
  {
    id: "sunset-glow",
    name: "Atardecer Violeta",
    previewGradient: "linear-gradient(180deg, #3b0764 0%, #1e1b4b 60%, #030712 100%)",
    style: {
      backgroundImage: `
        radial-gradient(ellipse at top, rgba(217, 70, 239, 0.3) 0%, transparent 60%),
        radial-gradient(ellipse at bottom, rgba(99, 102, 241, 0.25) 0%, transparent 60%)
      `,
      backgroundColor: "#07060c",
      backgroundSize: "cover",
    },
  },
  {
    id: "deep-forest",
    name: "Bosque Oscuro",
    previewGradient: "radial-gradient(circle at 70% 30%, #064e3b, #022c22, #020617)",
    style: {
      backgroundImage: `
        radial-gradient(circle at 75% 20%, rgba(16, 185, 129, 0.3) 0%, transparent 50%),
        radial-gradient(circle at 20% 80%, rgba(20, 184, 166, 0.25) 0%, transparent 50%)
      `,
      backgroundColor: "#05130f",
      backgroundSize: "cover",
    },
  },
];

export type ChatWallpaperConfig = {
  mode: "none" | "preset" | "custom";
  presetId?: string;
  customUrl?: string;
  opacity: number; // 0.05 to 0.90
  blur?: number; // 0 to 10px
};

const DEFAULT_CONFIG: ChatWallpaperConfig = {
  mode: "none",
  opacity: 0.3,
  blur: 0,
};

export function getWallpaperStorageKey(userId: string): string {
  return `connected-chat-wallpaper:${userId}`;
}

function getStorage(): Storage | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== "undefined") {
      return localStorage;
    }
  } catch {
    // ignore
  }
  return null;
}

export function loadWallpaperConfig(userId: string): ChatWallpaperConfig {
  const storage = getStorage();
  if (!storage) return DEFAULT_CONFIG;
  try {
    const raw = storage.getItem(getWallpaperStorageKey(userId));
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      mode: parsed.mode ?? "none",
      presetId: parsed.presetId,
      customUrl: parsed.customUrl,
      opacity: typeof parsed.opacity === "number" ? parsed.opacity : 0.3,
      blur: typeof parsed.blur === "number" ? parsed.blur : 0,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveWallpaperConfig(userId: string, config: ChatWallpaperConfig): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(getWallpaperStorageKey(userId), JSON.stringify(config));
  } catch (error) {
    console.error("No se pudo guardar la configuración del fondo", error);
  }
}

export function removeWallpaperConfig(userId: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(getWallpaperStorageKey(userId));
  } catch {
    // ignore
  }
}

/**
 * Comprime y redimensiona una foto elegida por el usuario para optimizar almacenamiento en localStorage.
 */
export async function compressImageForWallpaper(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Formato de imagen no compatible"));
      img.onload = () => {
        const maxDim = 1280;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo procesar el lienzo de la imagen"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Calidad 0.78 JPEG para excelente balance visual y tamaño ligero
        const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
