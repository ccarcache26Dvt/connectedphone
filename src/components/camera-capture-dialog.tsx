import { useEffect, useRef, useState } from "react";
import { Camera, Check, RefreshCw, X, AlertCircle, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CameraCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void;
}

export function CameraCaptureDialog({
  open,
  onOpenChange,
  onCapture,
}: CameraCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied" | "unsupported">("prompt");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  async function startCamera(mode: "environment" | "user") {
    stopStream();
    setErrorMessage(null);

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setPermissionState("unsupported");
      setErrorMessage("Tu navegador o dispositivo no soporta acceso directo a la cámara.");
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setPermissionState("granted");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          // autoplay policy handling
        }
      }
    } catch (error) {
      console.error("Error al iniciar cámara:", error);
      stopStream();
      const err = error as { name?: string; message?: string };
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermissionState("denied");
        setErrorMessage("Permiso denegado. Permite el acceso a la cámara en la barra de tu navegador.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setPermissionState("unsupported");
        setErrorMessage("No se encontró ninguna cámara disponible en tu dispositivo.");
      } else {
        setPermissionState("denied");
        setErrorMessage("No se pudo iniciar la cámara: " + (err.message || "error desconocido"));
      }
    }
  }

  useEffect(() => {
    if (open) {
      setCapturedPreview(null);
      setCapturedBlob(null);
      setErrorMessage(null);
      startCamera(facingMode);
    } else {
      stopStream();
      if (capturedPreview) {
        URL.revokeObjectURL(capturedPreview);
        setCapturedPreview(null);
      }
      setCapturedBlob(null);
    }
    return () => {
      stopStream();
    };
  }, [open]);

  // Manejar cambio de cámara frontal/trasera
  async function toggleFacingMode() {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    await startCamera(nextMode);
  }

  function takePhoto() {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Efecto espejo si es cámara frontal
    if (facingMode === "user") {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, width, height);

    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 150);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error("No se pudo procesar la foto.");
          return;
        }
        const url = URL.createObjectURL(blob);
        setCapturedBlob(blob);
        setCapturedPreview(url);
        stopStream();
      },
      "image/jpeg",
      0.9,
    );
  }

  function handleRetake() {
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
      setCapturedPreview(null);
    }
    setCapturedBlob(null);
    startCamera(facingMode);
  }

  function handleConfirmSend() {
    if (!capturedBlob) return;
    const fileName = `foto_${Date.now()}.jpg`;
    const file = new File([capturedBlob], fileName, { type: "image/jpeg" });
    onCapture(file);
    onOpenChange(false);
  }

  function handleNativeCameraCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onCapture(file);
      onOpenChange(false);
    }
    e.target.value = "";
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden bg-panel p-0 text-foreground border-border">
        <DialogHeader className="p-4 pb-2 border-b border-border/40">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Camera className="h-5 w-5 text-primary" />
            Tomar foto
          </DialogTitle>
        </DialogHeader>

        {/* Viewport de Cámara o Foto Capturada */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-black flex items-center justify-center">
          {isFlashing && (
            <div className="absolute inset-0 z-20 bg-white transition-opacity duration-150" />
          )}

          {capturedPreview ? (
            <img
              src={capturedPreview}
              alt="Foto capturada"
              className="h-full w-full object-contain"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${
                  facingMode === "user" ? "-scale-x-100" : ""
                }`}
              />

              {permissionState === "denied" || permissionState === "unsupported" ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/90 p-6 text-center text-sm">
                  <AlertCircle className="h-10 w-10 text-destructive" />
                  <p className="max-w-xs text-muted-foreground">{errorMessage}</p>
                  <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startCamera(facingMode)}
                    >
                      Reintentar permiso
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => nativeCameraInputRef.current?.click()}
                      className="gap-2"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Usar cámara del teléfono
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}

          {/* Botón para alternar cámara frontal / trasera */}
          {!capturedPreview && permissionState === "granted" && (
            <button
              type="button"
              onClick={toggleFacingMode}
              aria-label="Cambiar cámara frontal/trasera"
              className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2.5 text-white backdrop-blur transition hover:bg-black/80 active:scale-95"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Barra de Controles Inferior */}
        <div className="flex items-center justify-between p-4 bg-panel">
          {capturedPreview ? (
            <div className="flex w-full items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={handleRetake}
                className="flex-1 gap-2"
              >
                <X className="h-4 w-4" />
                Repetir
              </Button>
              <Button
                onClick={handleConfirmSend}
                className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Check className="h-4 w-4" />
                Enviar foto
              </Button>
            </div>
          ) : (
            <div className="flex w-full items-center justify-between">
              {/* Opción de cámara nativa del sistema */}
              <input
                ref={nativeCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleNativeCameraCapture}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => nativeCameraInputRef.current?.click()}
                className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
                title="Abrir cámara nativa del teléfono"
              >
                <ImageIcon className="h-4 w-4" />
                Cámara nativa
              </Button>

              {/* Botón Obturador Principal */}
              <button
                type="button"
                disabled={permissionState !== "granted"}
                onClick={takePhoto}
                aria-label="Disparar foto"
                className="group relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-primary p-1 transition-transform active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="h-full w-full rounded-full bg-primary transition-transform group-hover:scale-95" />
              </button>

              <div className="w-24 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
