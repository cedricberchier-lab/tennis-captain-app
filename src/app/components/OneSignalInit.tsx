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

function showIOSInstallPrompt(): void {
  // Show a custom prompt for iOS Safari users to add to home screen
  const promptShown = localStorage.getItem('ios-install-prompt-shown');
  if (promptShown) return;

  const showPrompt = () => {
    if (confirm(
      '📱 To receive push notifications on iOS Safari:\n\n' +
      '1. Tap the Share button (⬆️) below\n' +
      '2. Scroll down and tap "Add to Home Screen"\n' +
      '3. Open the app from your home screen\n' +
      '4. Enable notifications when prompted\n\n' +
      'Would you like to continue?'
    )) {
      localStorage.setItem('ios-install-prompt-shown', 'true');
    }
  };

  // Show prompt after a delay to let the page fully load
  setTimeout(showPrompt, 2000);
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

        // Check if we're on iOS Safari
        const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) &&
                           !window.navigator.standalone &&
                           navigator.userAgent.indexOf('Safari') > -1 &&
                           navigator.userAgent.indexOf('Chrome') === -1;

        console.log('🔍 Device detection:', {
          isIOSSafari,
          isStandalone: window.navigator.standalone,
          userAgent: navigator.userAgent
        });

        // Prompt for permission if not subscribed yet
        const isEnabled = await OneSignal.isPushNotificationsEnabled();
        console.log('🔔 Push notifications enabled:', isEnabled);

        if (!isEnabled) {
          if (isIOSSafari) {
            console.log('📱 iOS Safari detected - showing PWA install prompt first');
            // For iOS Safari, show custom install prompt
            showIOSInstallPrompt();
          } else {
            console.log('🖥️ Desktop/other browser - showing OneSignal prompt');
            await OneSignal.showSlidedownPrompt();
          }
        }
      } catch (e) {
        console.error("OneSignal init error:", e);
      }
    })();
  }, []);

  return null;
}