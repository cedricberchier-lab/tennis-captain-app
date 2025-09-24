"use client";

import { useEffect } from "react";
import OneSignal from "react-onesignal";
import { v4 as uuidv4 } from "uuid";

const NOTIFS_ENABLED = process.env.NEXT_PUBLIC_NOTIFS_ENABLED === "true";
const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || "";

function getOrCreateAnonId(): string {
  try {
    const key = "tcapp_anon_uid";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const fresh = uuidv4();
    localStorage.setItem(key, fresh);
    return fresh;
  } catch {
    // SSR or blocked storage – default a stable but anonymous ID.
    return "anon";
  }
}

export default function OneSignalInit() {
  useEffect(() => {
    if (!NOTIFS_ENABLED) return;
    if (!APP_ID) return;

    (async () => {
      try {
        await OneSignal.init({
          appId: APP_ID,
          allowLocalhostAsSecureOrigin: true, // enables http://localhost testing
          notifyButton: { enable: false },
        });

        const anonId = getOrCreateAnonId();
        console.log('🆔 OneSignal User ID set to:', anonId);

        // Set a stable external user id for targeting specific players later.
        // (If you have a real auth userId, replace anonId with that.)
        // Older SDKs: OneSignal.setExternalUserId(anonId)
        if ((OneSignal as any).login) {
          // Newer SDKs support login(userId)
          await (OneSignal as any).login(anonId);
          console.log('✅ OneSignal login successful with ID:', anonId);
        } else if ((OneSignal as any).setExternalUserId) {
          await (OneSignal as any).setExternalUserId(anonId);
          console.log('✅ OneSignal external user ID set:', anonId);
        }

        // Prompt for permission if not subscribed yet
        const isEnabled = await OneSignal.isPushNotificationsEnabled();
        if (!isEnabled) {
          await OneSignal.showSlidedownPrompt();
        }
      } catch (e) {
        console.error("OneSignal init error:", e);
      }
    })();
  }, []);

  return null;
}