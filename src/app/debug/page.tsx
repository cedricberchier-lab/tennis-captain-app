"use client";

import { useEffect, useState } from "react";
import OneSignal from "react-onesignal";

type Info = {
  ready: boolean;
  hasSDK: boolean;
  notes?: string[];
  isPushSupported?: boolean;
  permission?: "default" | "granted" | "denied";
  subscribed?: boolean;
  onesignalId?: string | null;
  externalId?: string | null;
  subscriptionId?: string | null;
  ts?: string;
};

export default function DebugPage() {
  const [info, setInfo] = useState<Info>({ ready: false, hasSDK: false, notes: [] });

  const refresh = () => {
    const notes: string[] = [];
    try {
      // Guard against undefined SDK surface
      const hasSDK =
        !!(OneSignal as any) &&
        !!(OneSignal as any).Notifications &&
        !!(OneSignal as any).User &&
        !!(OneSignal as any).User.PushSubscription;

      if (!hasSDK) {
        notes.push("SDK surface not ready. Ensure OneSignalInit ran and app reloaded.");
        setInfo((p) => ({ ...p, hasSDK: false, notes, ready: !!(window as any).__onesignal_ready }));
        return;
      }

      setInfo({
        ready: !!(window as any).__onesignal_ready,
        hasSDK: true,
        notes,
        isPushSupported: OneSignal.Notifications.isPushSupported(),
        permission: OneSignal.Notifications.permission,
        subscribed: OneSignal.User.PushSubscription.optedIn === true,
        onesignalId: OneSignal.User.onesignalId ?? null,
        externalId: OneSignal.User.externalId ?? null,
        subscriptionId: OneSignal.User.PushSubscription.id ?? null,
        ts: new Date().toISOString(),
      });
    } catch (e: any) {
      notes.push(`Error: ${String(e?.message || e)}`);
      setInfo((p) => ({ ...p, notes, ready: !!(window as any).__onesignal_ready, hasSDK: false }));
    }
  };

  useEffect(() => {
    // Wait a tick to let init finish, especially on iOS PWA
    const t = setTimeout(refresh, 300);
    return () => clearTimeout(t);
  }, []);

  const request = async () => {
    try {
      await OneSignal.Slidedown.promptPush({ force: true });
    } finally {
      refresh();
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Push Debug</h2>
      <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(info, null, 2)}</pre>
      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        <button onClick={request}>Show Push Prompt (force)</button>
        <button onClick={() => OneSignal.Notifications.requestPermission().finally(refresh)}>
          Request Native Permission
        </button>
        <button onClick={() => OneSignal.User.PushSubscription.optIn().finally(refresh)}>
          Opt-In (this device)
        </button>
        <button onClick={() => OneSignal.User.PushSubscription.optOut().finally(refresh)}>
          Opt-Out (this device)
        </button>
        <button onClick={refresh}>Refresh</button>
      </div>
      <p style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
        If <code>hasSDK</code> is false, check that <code>&lt;OneSignalInit /&gt;</code> runs on this page and reload the PWA.
      </p>
    </div>
  );
}