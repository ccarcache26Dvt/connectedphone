/**
 * Manejo de notificaciones nativas del sistema/teléfono.
 * Regla: Únicamente se activan y muestran si la aplicación está instalada como PWA (modo standalone).
 * Si no está instalada como PWA, no se solicitan permisos ni se emiten notificaciones nativas.
 */

export function isPwaInstalled(): boolean {
  if (typeof window === "undefined") return false;
  const isStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches ?? false;
  const isIosStandalone = (window.navigator as unknown as { standalone?: boolean })?.standalone === true;
  const isAndroidApp = typeof document !== "undefined" && document.referrer.startsWith("android-app://");
  return Boolean(isStandalone || isIosStandalone || isAndroidApp);
}

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getPwaNotificationStatus(): {
  isPwa: boolean;
  supported: boolean;
  permission: NotificationPermission | "unsupported";
} {
  const isPwa = isPwaInstalled();
  const supported = isNotificationSupported();
  if (!supported) {
    return { isPwa, supported: false, permission: "unsupported" };
  }
  return {
    isPwa,
    supported: true,
    permission: Notification.permission,
  };
}

export async function requestPwaNotificationPermission(): Promise<NotificationPermission | "not-pwa"> {
  if (!isPwaInstalled()) {
    return "not-pwa";
  }
  if (!isNotificationSupported()) {
    return "denied";
  }
  return await Notification.requestPermission();
}

export type ShowNotificationOptions = {
  title: string;
  body: string;
  conversationId?: string;
};

export async function showPwaSystemNotification({
  title,
  body,
  conversationId,
}: ShowNotificationOptions): Promise<boolean> {
  // Solo se envían notificaciones si la app está instalada como PWA
  if (!isPwaInstalled() || !isNotificationSupported()) {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  const notificationOptions: NotificationOptions = {
    body,
    icon: "/pwa-icon.svg",
    badge: "/pwa-icon.svg",
    tag: conversationId ? `connected-conv-${conversationId}` : "connected-general",
    vibrate: [120, 60, 120] as unknown as number[],
    data: {
      url: conversationId ? `/_authenticated/chats?c=${conversationId}` : "/_authenticated/chats",
      conversationId,
    },
  };

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, notificationOptions);
      return true;
    }
    // Respaldo con constructor nativo en standalone
    new Notification(title, notificationOptions);
    return true;
  } catch (error) {
    console.error("No se pudo mostrar la notificación PWA:", error);
    return false;
  }
}
