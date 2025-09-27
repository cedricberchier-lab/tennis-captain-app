"use client";
import { useEffect, useState } from "react";
import OneSignal from "react-onesignal";

export default function DebugPage() {
  const [info, setInfo] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const isEnabled = await OneSignal.isPushNotificationsEnabled();
        const id = await OneSignal.getExternalUserId?.();
        const deviceState = await OneSignal.getDeviceState?.();

        setInfo({
          isEnabled,
          id,
          deviceState,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        });
      } catch (error) {
        setInfo({
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
      }
    })();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">OneSignal Debug</h1>
      <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
        {JSON.stringify(info, null, 2)}
      </pre>
    </div>
  );
}