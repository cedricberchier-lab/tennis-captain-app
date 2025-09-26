"use client";

import { useEffect } from "react";
import OneSignal from "react-onesignal";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/contexts/AuthContext";

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
      '1. Tap the Share button (⬆️) at the bottom\n' +
      '2. Scroll down and tap "Add to Home Screen"\n' +
      '3. Tap "Add" to install the app\n' +
      '4. Open "Tennis Captain" from your home screen\n' +
      '5. Allow notifications when prompted\n\n' +
      '⚠️ Notifications only work from the installed app, not Safari!\n\n' +
      'Install the app now?'
    )) {
      localStorage.setItem('ios-install-prompt-shown', 'true');
      console.log('📱 User accepted iOS install prompt - they should install the PWA');
    } else {
      console.log('📱 User declined iOS install prompt');
      localStorage.setItem('ios-install-prompt-shown', 'declined');
    }
  };

  // Show prompt after a delay to let the page fully load
  setTimeout(showPrompt, 2000);
}

export default function OneSignalInit() {
  // Safely use auth context with fallback for SSR/prerendering
  let user, isAuthenticated, isLoading;
  try {
    const authContext = useAuth();
    user = authContext.user;
    isAuthenticated = authContext.isAuthenticated;
    isLoading = authContext.isLoading;
  } catch (error) {
    // Fallback for SSR or when not wrapped in AuthProvider
    user = null;
    isAuthenticated = false;
    isLoading = true; // Prevent initialization during SSR
  }

  useEffect(() => {
    if (typeof window === 'undefined') return; // Skip during SSR
    if (!NOTIFS_ENABLED) return;
    if (!APP_ID) return;
    if (isLoading) return; // Wait for auth to load

    (async () => {
      try {
        await OneSignal.init({
          appId: APP_ID,
          allowLocalhostAsSecureOrigin: true, // enables http://localhost testing
          notifyButton: { enable: false },
        });

        // Use authenticated user ID or fallback to anonymous ID
        const userId = isAuthenticated && user?.id ? user.id : getOrCreateAnonId();
        console.log('🆔 OneSignal User ID set to:', userId);
        console.log('👤 User authenticated:', isAuthenticated);
        console.log('🔗 Using real user ID:', isAuthenticated && user?.id ? 'Yes' : 'No (anonymous)');

        // Set external user ID for targeting specific users
        if ((OneSignal as any).login) {
          // Newer SDKs support login(userId)
          await (OneSignal as any).login(userId);
          console.log('✅ OneSignal login successful with ID:', userId);
        } else if ((OneSignal as any).setExternalUserId) {
          await (OneSignal as any).setExternalUserId(userId);
          console.log('✅ OneSignal external user ID set:', userId);
        }

        // Check if we're on iOS Safari
        const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) &&
                           !window.navigator.standalone &&
                           navigator.userAgent.indexOf('Safari') > -1 &&
                           navigator.userAgent.indexOf('Chrome') === -1;

        console.log('🔍 Device detection:', {
          isIOSSafari,
          isStandalone: window.navigator.standalone,
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          maxTouchPoints: navigator.maxTouchPoints
        });

        // Additional iOS Safari debugging
        if (isIOSSafari) {
          console.log('📱 iOS Safari detected - checking notification permissions...');

          // Check if service worker is supported
          if ('serviceWorker' in navigator) {
            console.log('✅ Service Worker supported');

            // Check if Push is supported
            if ('PushManager' in window) {
              console.log('✅ Push Manager supported');

              // Check current permission state
              const permission = await Notification.requestPermission();
              console.log('🔔 Notification permission:', permission);

              if (permission === 'denied') {
                console.log('❌ Notifications denied - user must enable in browser settings');
              }
            } else {
              console.log('❌ Push Manager NOT supported');
            }
          } else {
            console.log('❌ Service Worker NOT supported');
          }

          // Check if app is installed as PWA
          if (window.navigator.standalone) {
            console.log('✅ Running as standalone PWA');
          } else {
            console.log('⚠️ Not running as standalone PWA - install required for iOS notifications');
          }
        }

        // Prompt for permission if not subscribed yet
        const isEnabled = OneSignal.User.PushSubscription.optedIn;
        console.log('🔔 Push notifications enabled:', isEnabled);

        if (!isEnabled) {
          if (isIOSSafari) {
            console.log('📱 iOS Safari detected - showing PWA install prompt first');
            // For iOS Safari, show custom install prompt
            showIOSInstallPrompt();

            // If running as standalone app (PWA), try OneSignal prompt
            if (window.navigator.standalone) {
              console.log('📱 PWA detected - attempting OneSignal prompt for iOS');
              try {
                await OneSignal.showSlidedownPrompt();
              } catch (e) {
                console.log('📱 OneSignal prompt failed on iOS PWA:', e);
                // iOS Safari in PWA mode might still have restrictions
              }
            }
          } else {
            console.log('🖥️ Desktop/other browser - showing OneSignal prompt');
            await OneSignal.showSlidedownPrompt();
          }
        } else {
          console.log('✅ Push notifications already enabled');
        }
      } catch (e) {
        console.error("OneSignal init error:", e);
      }
    })();
  }, [isAuthenticated, isLoading, user?.id]);

  return null;
}