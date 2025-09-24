export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const NOTIFS_ENABLED = process.env.NEXT_PUBLIC_NOTIFS_ENABLED === "true";
  const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;
  const BASE_URL = process.env.NEXT_PUBLIC_APP_BASE_URL;
  const isProduction = process.env.NODE_ENV === 'production';
  const isVercel = !!process.env.VERCEL;

  // Validate App ID format (should be UUID)
  const appIdValid = APP_ID ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(APP_ID) : false;

  const config = {
    notificationsEnabled: NOTIFS_ENABLED,
    appIdSet: !!APP_ID,
    appIdValid,
    appIdLength: APP_ID?.length || 0,
    restApiKeySet: !!REST_API_KEY,
    restApiKeyLength: REST_API_KEY?.length || 0,
    baseUrlSet: !!BASE_URL,
    baseUrl: BASE_URL || 'not set',
    environment: process.env.NODE_ENV || 'unknown',
    isVercel,
    timestamp: new Date().toISOString()
  };

  const isComplete = NOTIFS_ENABLED && APP_ID && REST_API_KEY && appIdValid;

  let nextSteps: string[] = [];

  if (!NOTIFS_ENABLED) {
    nextSteps = isProduction ? [
      'Set NEXT_PUBLIC_NOTIFS_ENABLED=true in Vercel environment variables',
      'Redeploy after adding environment variables'
    ] : [
      'Set NEXT_PUBLIC_NOTIFS_ENABLED=true in your environment',
      'Restart your development server'
    ];
  } else if (!APP_ID) {
    nextSteps = isProduction ? [
      'Set NEXT_PUBLIC_ONESIGNAL_APP_ID in Vercel environment variables',
      'Get App ID from OneSignal dashboard → Settings → Keys & IDs'
    ] : [
      'Set NEXT_PUBLIC_ONESIGNAL_APP_ID in your environment',
      'Get App ID from OneSignal dashboard'
    ];
  } else if (!appIdValid) {
    nextSteps = [
      'App ID format is invalid - should be UUID format',
      'Example: 12345678-1234-1234-1234-123456789012',
      'Get correct App ID from OneSignal dashboard → Settings → Keys & IDs'
    ];
  } else if (!REST_API_KEY) {
    nextSteps = isProduction ? [
      'Set ONESIGNAL_REST_API_KEY in Vercel environment variables',
      'Get REST API Key from OneSignal dashboard → Settings → Keys & IDs'
    ] : [
      'Set ONESIGNAL_REST_API_KEY in your environment',
      'Get REST API Key from OneSignal dashboard'
    ];
  } else {
    nextSteps = [
      'Configuration looks complete!',
      'Test in browser: Allow notification permissions when prompted',
      'Test API: POST /api/notifications/schedule',
      'Monitor: OneSignal dashboard → Delivery → All Messages'
    ];
  }

  return NextResponse.json({
    config,
    status: {
      notifications: NOTIFS_ENABLED ? 'enabled' : 'disabled',
      configuration: isComplete ? 'complete' : 'incomplete',
      ready: isComplete
    },
    nextSteps,
    testEndpoints: {
      debug: `${BASE_URL || 'https://your-domain.com'}/api/notifications/debug`,
      schedule: `${BASE_URL || 'https://your-domain.com'}/api/notifications/schedule`
    }
  });
}