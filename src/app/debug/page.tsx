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
  const [notifTitle, setNotifTitle] = useState("Test Notification");
  const [notifMessage, setNotifMessage] = useState("This is a test notification to all subscribed users");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string>("");

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

  const sendNotificationToAll = async () => {
    setSending(true);
    setSendResult("");
    try {
      const response = await fetch("/api/notifications/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "debug-test",
          immediate: "all",
          title: notifTitle,
          message: notifMessage,
        }),
      });
      const result = await response.json();
      setSendResult(JSON.stringify(result, null, 2));
    } catch (error: any) {
      setSendResult(`Error: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const sendToThisDevice = async () => {
    if (!info.onesignalId) {
      setSendResult("No OneSignal ID available");
      return;
    }
    setSending(true);
    setSendResult("");
    try {
      const response = await fetch("/api/notifications/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "debug-test",
          immediate: "device",
          deviceId: info.onesignalId,
          title: notifTitle,
          message: notifMessage,
        }),
      });
      const result = await response.json();
      setSendResult(JSON.stringify(result, null, 2));
    } catch (error: any) {
      setSendResult(`Error: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const sendNowToAll = async () => {
    setSending(true);
    setSendResult("");
    try {
      const response = await fetch("/api/notifications/schedule?sessionId=DEBUG&sessionUrl=/&immediate=all", {
        method: "GET",
      });
      const result = await response.json();
      console.log("Send NOW to ALL result:", result);
      alert(`Send NOW to ALL: ${JSON.stringify(result, null, 2)}`);
      setSendResult(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error("Send NOW to ALL error:", error);
      alert(`Error: ${error.message}`);
      setSendResult(`Error: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const sendNowToThisDevice = async () => {
    try {
      // Get live subscription ID from OneSignal
      const liveSubscriptionId = OneSignal.User.PushSubscription.id;

      if (!liveSubscriptionId) {
        alert("No subscription ID available from OneSignal");
        return;
      }

      setSending(true);
      setSendResult("");

      const response = await fetch("/api/notifications/test-sub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId: liveSubscriptionId,
          title: notifTitle,
          message: notifMessage,
          url: "/",
        }),
      });

      const result = await response.json();
      console.log("Send NOW to THIS device result:", result);
      alert(`Send NOW to THIS device: ${JSON.stringify(result, null, 2)}`);
      setSendResult(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error("Send NOW to THIS device error:", error);
      alert(`Error: ${error.message}`);
      setSendResult(`Error: ${error.message}`);
    } finally {
      setSending(false);
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

      <div style={{ marginTop: 24, padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
        <h3>Send Notification to All Subscribed Users</h3>
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          <div>
            <label htmlFor="title">Title:</label>
            <input
              id="title"
              type="text"
              value={notifTitle}
              onChange={(e) => setNotifTitle(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 4 }}
            />
          </div>
          <div>
            <label htmlFor="message">Message:</label>
            <textarea
              id="message"
              value={notifMessage}
              onChange={(e) => setNotifMessage(e.target.value)}
              rows={3}
              style={{ width: "100%", padding: 8, marginTop: 4, resize: "vertical" }}
            />
          </div>
          <button
            onClick={sendNotificationToAll}
            disabled={sending}
            style={{
              padding: 12,
              backgroundColor: sending ? "#ccc" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: sending ? "not-allowed" : "pointer"
            }}
          >
            {sending ? "Sending..." : "Send to All Subscribed Users"}
          </button>
          <button
            onClick={sendToThisDevice}
            disabled={sending || !info.onesignalId}
            style={{
              padding: 12,
              backgroundColor: sending || !info.onesignalId ? "#ccc" : "#28a745",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: sending || !info.onesignalId ? "not-allowed" : "pointer"
            }}
          >
            {sending ? "Sending..." : "Send to This Device Only"}
          </button>

          {/* NEW DIAGNOSTIC BUTTONS */}
          <button
            onClick={sendNowToAll}
            disabled={sending}
            style={{
              padding: 12,
              backgroundColor: sending ? "#ccc" : "#ff6b6b",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: sending ? "not-allowed" : "pointer"
            }}
          >
            {sending ? "Sending..." : "Send NOW to ALL"}
          </button>
          <button
            onClick={sendNowToThisDevice}
            disabled={sending}
            style={{
              padding: 12,
              backgroundColor: sending ? "#ccc" : "#51cf66",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: sending ? "not-allowed" : "pointer"
            }}
          >
            {sending ? "Sending..." : "Send NOW to THIS device"}
          </button>

          {sendResult && (
            <div style={{ marginTop: 8 }}>
              <strong>Result:</strong>
              <pre style={{
                whiteSpace: "pre-wrap",
                fontSize: 12,
                backgroundColor: "#f5f5f5",
                padding: 8,
                borderRadius: 4,
                marginTop: 4
              }}>
                {sendResult}
              </pre>
            </div>
          )}
        </div>
      </div>

      <p style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
        If <code>hasSDK</code> is false, check that <code>&lt;OneSignalInit /&gt;</code> runs on this page and reload the PWA.
      </p>
    </div>
  );
}