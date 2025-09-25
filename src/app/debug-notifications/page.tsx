"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertTriangle, Send, Settings, Bell } from "lucide-react";

const NOTIFS_ENABLED = process.env.NEXT_PUBLIC_NOTIFS_ENABLED === "true";
const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || "";

export default function NotificationDebugPage() {
  const [testResults, setTestResults] = useState<any>({});
  const [loading, setLoading] = useState("");
  const [customTitle, setCustomTitle] = useState("Test Notification");
  const [customMessage, setCustomMessage] = useState("This is a test notification from the debug page");

  const getOneSignalUserId = () => {
    try {
      return localStorage.getItem('tcapp_anon_uid') || 'not-found';
    } catch {
      return 'localStorage-error';
    }
  };

  const testOneSignalConnection = async () => {
    setLoading("onesignal");
    try {
      // Test if OneSignal is loaded
      const oneSignalLoaded = typeof window !== 'undefined' && (window as any).OneSignal;
      const isPushEnabled = oneSignalLoaded ? await (window as any).OneSignal?.isPushNotificationsEnabled() : false;
      const playerId = oneSignalLoaded ? await (window as any).OneSignal?.getExternalUserId() : null;

      setTestResults(prev => ({
        ...prev,
        onesignal: {
          success: true,
          loaded: !!oneSignalLoaded,
          pushEnabled: isPushEnabled,
          playerId: playerId,
          localStorageId: getOneSignalUserId(),
          appId: APP_ID,
          notifsEnabled: NOTIFS_ENABLED
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        onesignal: {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }));
    }
    setLoading("");
  };

  const testBroadcastAPI = async () => {
    setLoading("broadcast");
    try {
      const response = await fetch('/api/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: customTitle,
          message: customMessage,
          url: window.location.origin
        })
      });
      const result = await response.json();

      setTestResults(prev => ({
        ...prev,
        broadcast: {
          success: response.ok,
          status: response.status,
          result: result
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        broadcast: {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }));
    }
    setLoading("");
  };

  const testImmediateNotification = async () => {
    setLoading("immediate");
    try {
      const response = await fetch('/api/notifications/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: "debug-test-" + Date.now(),
          startsAtISO: new Date().toISOString(),
          sessionUrl: window.location.origin + "/training",
          rosterUserIds: [getOneSignalUserId()],
          testMode: false,
          immediateNotification: true
        })
      });
      const result = await response.json();

      setTestResults(prev => ({
        ...prev,
        immediate: {
          success: response.ok,
          status: response.status,
          result: result,
          targetUserId: getOneSignalUserId()
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        immediate: {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }));
    }
    setLoading("");
  };

  const testGetBroadcast = async () => {
    setLoading("getBroadcast");
    try {
      const response = await fetch('/api/notifications/broadcast');
      const result = await response.json();

      setTestResults(prev => ({
        ...prev,
        getBroadcast: {
          success: response.ok,
          status: response.status,
          result: result
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        getBroadcast: {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }));
    }
    setLoading("");
  };

  const ResultCard = ({ title, result, icon: Icon }: { title: string, result: any, icon: any }) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon size={16} />
          {title}
          {result && (
            <Badge variant={result.success ? "default" : "destructive"}>
              {result.success ? "Success" : "Failed"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {result && (
          <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">🐛 OneSignal Debug Page</h1>
        <p className="text-gray-600">Test OneSignal connections and notifications</p>
        <div className="mt-2 flex gap-2">
          <Badge variant={NOTIFS_ENABLED ? "default" : "secondary"}>
            Notifications: {NOTIFS_ENABLED ? "Enabled" : "Disabled"}
          </Badge>
          <Badge variant="outline">
            App ID: {APP_ID || "Not Set"}
          </Badge>
        </div>
      </div>

      {/* Custom Test Message */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings size={16} />
            Custom Test Message
          </CardTitle>
          <CardDescription>
            Customize the test notification content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Notification Title"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
          />
          <textarea
            className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Notification Message"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows={2}
          />
        </CardContent>
      </Card>

      {/* Test Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Button
          onClick={testOneSignalConnection}
          disabled={loading === "onesignal"}
          className="h-auto p-4"
        >
          <div className="text-center">
            <CheckCircle className="mx-auto mb-2" size={20} />
            <div>Test OneSignal Status</div>
            <div className="text-xs opacity-70">Check SDK & permissions</div>
          </div>
        </Button>

        <Button
          onClick={testBroadcastAPI}
          disabled={loading === "broadcast"}
          variant="outline"
          className="h-auto p-4"
        >
          <div className="text-center">
            <Send className="mx-auto mb-2" size={20} />
            <div>Test Broadcast (POST)</div>
            <div className="text-xs opacity-70">Send to all users</div>
          </div>
        </Button>

        <Button
          onClick={testImmediateNotification}
          disabled={loading === "immediate"}
          variant="outline"
          className="h-auto p-4"
        >
          <div className="text-center">
            <Bell className="mx-auto mb-2" size={20} />
            <div>Test Immediate</div>
            <div className="text-xs opacity-70">Send to current user</div>
          </div>
        </Button>

        <Button
          onClick={testGetBroadcast}
          disabled={loading === "getBroadcast"}
          variant="outline"
          className="h-auto p-4"
        >
          <div className="text-center">
            <AlertTriangle className="mx-auto mb-2" size={20} />
            <div>Test Broadcast (GET)</div>
            <div className="text-xs opacity-70">Default test message</div>
          </div>
        </Button>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="text-sm text-gray-500">Testing {loading}...</div>
        </div>
      )}

      {/* Results */}
      <div className="space-y-4">
        {testResults.onesignal && (
          <ResultCard title="OneSignal Status" result={testResults.onesignal} icon={CheckCircle} />
        )}
        {testResults.broadcast && (
          <ResultCard title="Broadcast API (POST)" result={testResults.broadcast} icon={Send} />
        )}
        {testResults.immediate && (
          <ResultCard title="Immediate Notification" result={testResults.immediate} icon={Bell} />
        )}
        {testResults.getBroadcast && (
          <ResultCard title="Broadcast API (GET)" result={testResults.getBroadcast} icon={AlertTriangle} />
        )}
      </div>

      <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
        <h3 className="font-medium text-yellow-800 mb-2">💡 How to Use</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>1. Test OneSignal Status first to check SDK loading and permissions</li>
          <li>2. Try Immediate notification to test user-specific targeting</li>
          <li>3. Try Broadcast to test sending to all users</li>
          <li>4. Check browser console for detailed logs</li>
          <li>5. If tests fail, check Vercel environment variables</li>
        </ul>
      </div>
    </div>
  );
}