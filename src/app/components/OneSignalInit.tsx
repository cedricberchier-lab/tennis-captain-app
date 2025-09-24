"use client";

import { useEffect } from "react";
import OneSignal from "react-onesignal";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/contexts/AuthContext";

const NOTIFS_ENABLED = process.env.NEXT_PUBLIC_NOTIFS_ENABLED === "true";
const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || "";

function getOrCreateUserId(userEmail?: string): string {
  try {
    // If user is logged in and has email, use email as external user ID
    if (userEmail) {
      console.log('🆔 Using user email as OneSignal external user ID:', userEmail);
      return userEmail;
    }

    // Fallback to anonymous UUID
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
  const { user } = useAuth();

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

        const userId = getOrCreateUserId(user?.email);
        console.log('🆔 OneSignal User ID set to:', userId);

        // Set external user id for targeting specific users
        // Use email if available, otherwise fallback to UUID
        if ((OneSignal as any).login) {
          // Newer SDKs support login(userId)
          await (OneSignal as any).login(userId);
          console.log('✅ OneSignal login successful with ID:', userId);
        } else if ((OneSignal as any).setExternalUserId) {
          await (OneSignal as any).setExternalUserId(userId);
          console.log('✅ OneSignal external user ID set:', userId);
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
  }, [user]); // Re-run when user changes

  return null;
}