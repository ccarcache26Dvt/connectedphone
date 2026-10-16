import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPwaButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function install() {
    if (!installPrompt) {
      toast.info(
        "En iPhone: toca Compartir y luego «Añadir a pantalla de inicio». En Android, abre el menú del navegador y elige «Instalar app».",
      );
      return;
    }
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") toast.success("Connected se está instalando");
      setInstallPrompt(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? `No se pudo instalar la app: ${error.message}`
          : "No se pudo iniciar la instalación.",
      );
    }
  }

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={install}
      aria-label="Instalar Connected"
      title="Instalar Connected"
    >
      <Download className="h-5 w-5" />
    </Button>
  );
}
