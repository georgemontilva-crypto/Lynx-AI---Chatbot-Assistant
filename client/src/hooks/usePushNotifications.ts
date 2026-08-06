import { useState, useEffect, useCallback } from "react";

type PushStatus = "unsupported" | "denied" | "default" | "subscribed" | "loading";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  // Read at call-time so this hook is safe to import during SSR (no module-level import.meta.env access)
  const VAPID_PUBLIC_KEY =
    typeof import.meta !== "undefined" ? (import.meta.env?.VITE_VAPID_PUBLIC_KEY as string) : "";

  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    !!VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (!isSupported) {
      setStatus("unsupported");
      return;
    }

    const permission = Notification.permission;
    if (permission === "denied") {
      setStatus("denied");
      return;
    }

    // Check if already subscribed
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub) {
          setSubscription(sub);
          setStatus("subscribed");
        } else {
          setStatus(permission === "granted" ? "default" : "default");
        }
      })
      .catch(() => setStatus("default"));
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    setStatus("loading");
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return false;
      }

      // Get service worker registration
      const reg = await navigator.serviceWorker.ready;

      // Subscribe to push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Send subscription to backend
      const subJson = sub.toJSON();
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh,
            auth: subJson.keys?.auth,
          },
        }),
      });

      if (!response.ok) {
        await sub.unsubscribe();
        setStatus("default");
        return false;
      }

      setSubscription(sub);
      setStatus("subscribed");
      return true;
    } catch (err) {
      console.error("[Push] Subscribe error:", err);
      setStatus("default");
      return false;
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!subscription) return false;

    setStatus("loading");
    try {
      // Notify backend first
      await fetch("/api/push/unsubscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      // Unsubscribe from browser push manager
      await subscription.unsubscribe();
      setSubscription(null);
      setStatus("default");
      return true;
    } catch (err) {
      console.error("[Push] Unsubscribe error:", err);
      setStatus("subscribed");
      return false;
    }
  }, [subscription]);

  return {
    status,
    isSupported,
    isSubscribed: status === "subscribed",
    subscribe,
    unsubscribe,
  };
}
