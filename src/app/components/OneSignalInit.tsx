"use client";
import { useEffect } from "react";
import OneSignal from "react-onesignal";

const NOTIFS_ENABLED = process.env.NEXT_PUBLIC_NOTIFS_ENABLED === "true";
const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || "";

export default function OneSignalInit() {
  useEffect(() => {
    (async () => {
      if (!NOTIFS_ENABLED || !APP_ID) return;
      try {
        await OneSignal.init({
          appId: APP_ID,
          allowLocalhostAsSecureOrigin: true,
          notifyButton: { enable: false },
        });

        // Show permission prompt if not already enabled
        const supported = OneSignal.Notifications.isPushSupported();
        if (supported && OneSignal.Notifications.permission === "default") {
          await OneSignal.Slidedown.promptPush({ force: true });
        }
      } catch (e) {
        console.error("OneSignal init error:", e);
      }
    })();
  }, []);
  return null;
}