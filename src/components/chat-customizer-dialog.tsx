import { useRef, useState, useEffect } from "react";
import {
  Palette,
  Image as ImageIcon,
  Bell,
  Upload,
  Trash2,
  Check,
  Smartphone,
  Info,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { chatPalettes, type ChatPaletteId } from "@/lib/chat-themes";
import {
  wallpaperPresets,
  type ChatWallpaperConfig,
  compressImageForWallpaper,
} from "@/lib/chat-wallpaper";
import {
  isPwaInstalled,
  getPwaNotificationStatus,
  requestPwaNotificationPermission,
  showPwaSystemNotification,
} from "@/lib/pwa-notifications";

interface ChatCustomizerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paletteId: ChatPaletteId;
  onSelectPalette: (id: ChatPaletteId) => void;
  wallpaper: ChatWallpaperConfig;
  onSaveWallpaper: (config: ChatWallpaperConfig) => void;
}

export function ChatCustomizerDialog({
  open,
  onOpenChange,
  paletteId,
  onSelectPalette,
  wallpaper,
  onSaveWallpaper,
}: ChatCustomizerDialogProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState("wallpaper");
  const [localWallpaper, setLocalWallpaper] = useState<ChatWallpaperConfig>(wallpaper);
  const [notificationState, setNotificationState] = useState(getPwaNotificationStatus());
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  useEffect(() => {
    setLocalWallpaper(wallpaper);
  }, [wallpaper]);

  useEffect(() => {
    if (open) {
      setNotificationState(getPwaNotificationStatus());
    }
  }, [open]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecciona un archivo de imagen válido.");
      return;
    }

    setIsProcessingImage(true);
    try {
      const compressedDataUrl = await compressImageForWallpaper(file);
      const nextConfig: ChatWallpaperConfig = {
        mode: "custom",
        customUrl: compressedDataUrl,
        opacity: localWallpaper.opacity ?? 0.35,
        blur: localWallpaper.blur ?? 0,
      };
      setLocalWallpaper(nextConfig);
      onSaveWallpaper(nextConfig);
      toast.success("Foto de fondo aplicada al chat.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar la imagen de fondo.");
    } finally {
      setIsProcessingImage(false);
      e.target.value = "";
    }
  }

  function handleSelectPreset(presetId: string) {
    const nextConfig: ChatWallpaperConfig = {
      mode: "preset",
      presetId,
      opacity: localWallpaper.opacity ?? 0.35,
      blur: localWallpaper.blur ?? 0,
    };
    setLocalWallpaper(nextConfig);
    onSaveWallpaper(nextConfig);
  }

  function handleRemoveWallpaper() {
    const nextConfig: ChatWallpaperConfig = {
      mode: "none",
      opacity: 0.3,
      blur: 0,
    };
    setLocalWallpaper(nextConfig);
    onSaveWallpaper(nextConfig);
    toast.info("Fondo de chat restablecido al original.");
  }

  function handleOpacityChange(values: number[]) {
    const val = values[0] / 100;
    const nextConfig = { ...localWallpaper, opacity: val };
    setLocalWallpaper(nextConfig);
    onSaveWallpaper(nextConfig);
  }

  async function handleRequestNotifications() {
    if (!notificationState.isPwa) {
      toast.info("Las notificaciones en el teléfono solo están disponibles si instalas Connected como PWA.");
      return;
    }
    const result = await requestPwaNotificationPermission();
    setNotificationState(getPwaNotificationStatus());
    if (result === "granted") {
      toast.success("¡Notificaciones de Connected activadas en tu teléfono!");
      await showPwaSystemNotification({
        title: "Connected",
        body: "Las notificaciones en la bandeja de tu teléfono están activadas.",
      });
    } else if (result === "denied") {
      toast.error("Permiso denegado en el sistema.");
    }
  }

  async function handleTestNotification() {
    const shown = await showPwaSystemNotification({
      title: "Connected — Notificación de prueba",
      body: "¡Funciona! Los mensajes nuevos llegarán a tu bandeja de notificaciones.",
    });
    if (shown) {
      toast.success("Notificación enviada a la bandeja de tu teléfono.");
    } else {
      toast.error("No se pudo emitir la notificación. Revisa los permisos.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden bg-panel border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Personalización de Connected
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/60">
            <TabsTrigger value="wallpaper" className="gap-1.5 text-xs sm:text-sm">
              <ImageIcon className="h-4 w-4" />
              Foto de Fondo
            </TabsTrigger>
            <TabsTrigger value="palette" className="gap-1.5 text-xs sm:text-sm">
              <Palette className="h-4 w-4" />
              Colores
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5 text-xs sm:text-sm">
              <Bell className="h-4 w-4" />
              Notificaciones
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: FONDO DE PANTALLA */}
          <TabsContent value="wallpaper" className="space-y-4 pt-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold">Foto de fondo del chat</h4>
                <p className="text-xs text-muted-foreground">
                  Personaliza el fondo de tus conversaciones con tu propia foto o estilos predefinidos.
                </p>
              </div>
              {localWallpaper.mode !== "none" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveWallpaper}
                  className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Quitar fondo
                </Button>
              )}
            </div>

            {/* Subir foto propia */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingImage}
              className="w-full gap-2 border-dashed border-primary/50 py-6 hover:bg-primary/5"
            >
              <Upload className="h-4 w-4 text-primary" />
              {isProcessingImage
                ? "Procesando foto..."
                : localWallpaper.mode === "custom"
                ? "Cambiar por otra foto de tu galería"
                : "Elegir foto de fondo desde tu dispositivo"}
            </Button>

            {/* Presets visuales */}
            <div>
              <span className="text-xs font-medium text-muted-foreground">O elige un estilo predefinido:</span>
              <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {wallpaperPresets.map((preset) => {
                  const isSelected =
                    localWallpaper.mode === "preset" && localWallpaper.presetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset.id)}
                      className={cn(
                        "relative flex h-20 flex-col items-center justify-end rounded-lg p-2 text-center text-xs font-medium text-white transition hover:scale-102 overflow-hidden border",
                        isSelected ? "border-primary ring-2 ring-primary/40" : "border-border/60",
                      )}
                      style={{ background: preset.previewGradient }}
                    >
                      <span className="relative z-10 drop-shadow">{preset.name}</span>
                      {isSelected && (
                        <div className="absolute right-1.5 top-1.5 z-10 rounded-full bg-primary p-0.5 text-primary-foreground">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Control de opacidad / oscuridad */}
            {localWallpaper.mode !== "none" && (
              <div className="space-y-2 rounded-xl bg-card/60 p-3.5 border border-border/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">Intensidad del fondo</span>
                  <span className="text-muted-foreground">
                    {Math.round((localWallpaper.opacity ?? 0.3) * 100)}%
                  </span>
                </div>
                <Slider
                  min={5}
                  max={85}
                  step={5}
                  value={[Math.round((localWallpaper.opacity ?? 0.3) * 100)]}
                  onValueChange={handleOpacityChange}
                />
                <p className="text-[11px] text-muted-foreground">
                  Ajusta la intensidad para que las burbujas y mensajes sigan leyéndose cómodamente.
                </p>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: COLORES */}
          <TabsContent value="palette" className="space-y-4 pt-3">
            <p className="text-xs text-muted-foreground">
              Selecciona el esquema de acento y colores para toda la interfaz de Connected.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {chatPalettes.map((palette) => (
                <Button
                  key={palette.id}
                  variant="outline"
                  className={cn(
                    "h-auto justify-start gap-3 py-3",
                    paletteId === palette.id && "border-primary ring-1 ring-primary",
                  )}
                  onClick={() => onSelectPalette(palette.id)}
                >
                  <span className="flex -space-x-1">
                    <span
                      className="h-5 w-5 rounded-full border-2 border-panel"
                      style={{ backgroundColor: palette.primary }}
                    />
                    <span
                      className="h-5 w-5 rounded-full border-2 border-panel"
                      style={{ backgroundColor: palette.bubbleOut }}
                    />
                    <span
                      className="h-5 w-5 rounded-full border-2 border-panel"
                      style={{ backgroundColor: palette.bubbleIn }}
                    />
                  </span>
                  {palette.name}
                </Button>
              ))}
            </div>
          </TabsContent>

          {/* TAB 3: NOTIFICACIONES */}
          <TabsContent value="notifications" className="space-y-4 pt-3">
            <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-3.5">
              <Smartphone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-semibold block text-sm">
                  Notificaciones del sistema / teléfono
                </span>
                <p className="text-muted-foreground leading-relaxed">
                  Las notificaciones nativas en la cortina de tu teléfono se habilitan
                  <strong> únicamente si la aplicación está instalada como PWA</strong>. Si abres
                  Connected desde el navegador web normal, no se emitirán notificaciones nativas.
                </p>
              </div>
            </div>

            <div className="space-y-3 rounded-xl bg-panel p-4 border border-border/50">
              <div className="flex items-center justify-between text-sm">
                <span>¿Instalada como PWA?</span>
                <span
                  className={cn(
                    "font-semibold text-xs px-2.5 py-0.5 rounded-full",
                    notificationState.isPwa
                      ? "bg-online/20 text-online border border-online/30"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {notificationState.isPwa ? "Sí (Modo App)" : "No (Navegador web)"}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span>Permiso de notificaciones:</span>
                <span className="font-semibold text-xs capitalize text-muted-foreground">
                  {notificationState.permission === "granted"
                    ? "Permitidas"
                    : notificationState.permission === "denied"
                    ? "Bloqueadas"
                    : "No solicitadas"}
                </span>
              </div>

              {notificationState.isPwa ? (
                <div className="pt-2 flex flex-col gap-2">
                  {notificationState.permission !== "granted" ? (
                    <Button onClick={handleRequestNotifications} className="gap-2">
                      <Bell className="h-4 w-4" />
                      Activar notificaciones en el teléfono
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={handleTestNotification}
                      className="gap-2 text-xs"
                    >
                      <Bell className="h-4 w-4" />
                      Enviar notificación de prueba al teléfono
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-400">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Instala Connected como aplicación en tu pantalla de inicio para recibir
                    notificaciones de mensajes nuevos en la bandeja de tu teléfono.
                  </span>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
