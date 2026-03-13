"use client";

import { useEffect, useState } from "react";
import OneSignal from "react-onesignal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bug, RefreshCw, Bell, Send, Smartphone, Users } from "lucide-react";

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
        permission: OneSignal.Notifications.permission as unknown as "default" | "granted" | "denied" | undefined,
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
    console.log("=== Send NOW to THIS device clicked ===");
    try {
      console.log("OneSignal object:", OneSignal);
      console.log("OneSignal.User:", OneSignal?.User);
      console.log("OneSignal.User.PushSubscription:", OneSignal?.User?.PushSubscription);

      const liveSubscriptionId = OneSignal.User.PushSubscription.id;

      console.log("Debug info subscription ID:", info.subscriptionId);
      console.log("Live OneSignal subscription ID:", liveSubscriptionId);

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

  const permissionColor = {
    granted: "text-green-600 dark:text-green-400",
    denied: "text-red-600 dark:text-red-400",
    default: "text-yellow-600 dark:text-yellow-400",
  }[info.permission ?? "default"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-4">
      <div className="max-w-2xl mx-auto px-4 pb-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full">
            <Bug className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Push Debug</h1>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>OneSignal Status</span>
              <button
                onClick={refresh}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">SDK Ready</div>
                <div className={`font-semibold ${info.ready ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {info.ready ? "Yes" : "No"}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Has SDK</div>
                <div className={`font-semibold ${info.hasSDK ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {info.hasSDK ? "Yes" : "No"}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Push Supported</div>
                <div className={`font-semibold ${info.isPushSupported ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {info.isPushSupported == null ? "—" : info.isPushSupported ? "Yes" : "No"}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Permission</div>
                <div className={`font-semibold capitalize ${permissionColor}`}>
                  {info.permission ?? "—"}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Subscribed</div>
                <div className={`font-semibold ${info.subscribed ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {info.subscribed == null ? "—" : info.subscribed ? "Yes" : "No"}
                </div>
              </div>
            </div>
            {info.onesignalId && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">OneSignal ID</div>
                <div className="font-mono text-xs text-gray-900 dark:text-white break-all">{info.onesignalId}</div>
              </div>
            )}
            {info.subscriptionId && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Subscription ID</div>
                <div className="font-mono text-xs text-gray-900 dark:text-white break-all">{info.subscriptionId}</div>
              </div>
            )}
            {info.notes && info.notes.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                {info.notes.map((note, i) => (
                  <p key={i} className="text-xs text-yellow-800 dark:text-yellow-300">{note}</p>
                ))}
              </div>
            )}
            {info.ts && (
              <p className="text-xs text-gray-400 dark:text-gray-500">Last updated: {info.ts}</p>
            )}
          </CardContent>
        </Card>

        {/* Permission Actions Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-purple-500" />
              Permission Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2">
            <button
              onClick={request}
              className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Show Push Prompt (force)
            </button>
            <button
              onClick={() => OneSignal.Notifications.requestPermission().finally(refresh)}
              className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Request Native Permission
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => OneSignal.User.PushSubscription.optIn().finally(refresh)}
                className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Opt-In
              </button>
              <button
                onClick={() => OneSignal.User.PushSubscription.optOut().finally(refresh)}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Opt-Out
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Send Notification Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4 text-purple-500" />
              Send Test Notification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
              <input
                type="text"
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Message</label>
              <textarea
                value={notifMessage}
                onChange={(e) => setNotifMessage(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-vertical"
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={sendNotificationToAll}
                disabled={sending}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Users className="h-4 w-4" />
                {sending ? "Sending..." : "Send to All Subscribed Users"}
              </button>
              <button
                onClick={sendToThisDevice}
                disabled={sending || !info.onesignalId}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Smartphone className="h-4 w-4" />
                {sending ? "Sending..." : "Send to This Device Only"}
              </button>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={sendNowToAll}
                  disabled={sending}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                  {sending ? "..." : "NOW → All"}
                </button>
                <button
                  onClick={sendNowToThisDevice}
                  disabled={sending}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  {sending ? "..." : "NOW → Me"}
                </button>
              </div>
            </div>

            {sendResult && (
              <div className="mt-2">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Result:</p>
                <pre className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 overflow-auto whitespace-pre-wrap text-gray-900 dark:text-gray-100">
                  {sendResult}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          If <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">hasSDK</code> is false, check that <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">&lt;OneSignalInit /&gt;</code> runs on this page and reload the PWA.
        </p>
      </div>
    </div>
  );
}
