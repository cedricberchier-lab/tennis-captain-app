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
        // Initialize SDK first
        await OneSignal.init({
          appId: APP_ID,
          allowLocalhostAsSecureOrigin: true,
          notifyButton: { enable: false },
        });

        // Mark globally that SDK is ready (so debug page can wait)
        (window as any).__onesignal_ready = true;

        // OPTIONAL: log a stable external id so laptop + phone share the same ID
        // await OneSignal.login("demo-user"); // replace with your real user id
      } catch (e) {
        console.error("OneSignal init failed:", e);
        (window as any).__onesignal_ready = false;
      }
    })();
  }, []);

  return null;
}