"use client";
import { useEffect, useState } from "react";
import OneSignal from "react-onesignal";

type DebugInfo = {
  sdkLoaded: boolean;
  isPushSupported?: boolean;
  permission?: "default" | "granted" | "denied";
  subscribed?: boolean;             // current device subscribed?
  onesignalId?: string | null;      // user-level id
  externalId?: string | null;       // your login() id
  subscriptionId?: string | null;   // device-level id
  errors?: string[];
};

export default function DebugPage() {
  const [info, setInfo] = useState<DebugInfo>({ sdkLoaded: false, errors: [] });

  useEffect(() => {
    (async () => {
      const errors: string[] = [];
      try {
        // v16 API surface:
        const isPushSupported = OneSignal.Notifications.isPushSupported();
        const permission = OneSignal.Notifications.permission; // "default" | "granted" | "denied"

        // user/subscription state
        const onesignalId = OneSignal.User.onesignalId ?? null;
        const externalId  = OneSignal.User.externalId ?? null;

        // subscribed = whether this device (subscription) is opted-in
        const subscribed = OneSignal.User.PushSubscription.optedIn === true;

        // subscription id (this device)
        const subscriptionId = OneSignal.User.PushSubscription.id ?? null;

        setInfo({
          sdkLoaded: true,
          isPushSupported,
          permission,
          subscribed,
          onesignalId,
          externalId,
          subscriptionId,
          errors,
        });
      } catch (e: any) {
        errors.push(String(e?.message || e));
        setInfo((p) => ({ ...p, sdkLoaded: true, errors }));
      }
    })();
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2>Push Debug</h2>
      <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(info, null, 2)}</pre>

      <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
        <button onClick={() => OneSignal.Slidedown.promptPush({ force: true })}>
          Show Push Prompt (force)
        </button>
        <button onClick={() => OneSignal.Notifications.requestPermission()}>
          Request Native Permission
        </button>
        <button onClick={() => OneSignal.User.PushSubscription.optIn()}>
          Opt-In (this device)
        </button>
        <button onClick={() => OneSignal.User.PushSubscription.optOut()}>
          Opt-Out (this device)
        </button>
      </div>
    </div>
  );
}