import { NextRequest, NextResponse } from 'next/server';

const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!;
const REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY!;
const BASE_ONE_SIGNAL_API = "https://onesignal.com/api/v1/notifications";

async function sendTestNotification() {
  const res = await fetch(BASE_ONE_SIGNAL_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${REST_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: APP_ID,
      // Target specific user by email
      include_external_user_ids: ["cedric.berchier@gmail.com"],
      headings: { en: "Test Notification for Cedric" },
      contents: { en: "This notification is targeted specifically to cedric.berchier@gmail.com!" },
      url: "https://tennis-captain-app-xz42.vercel.app/",
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OneSignal error ${res.status}: ${txt}`);
  }

  return res.json();
}

export async function GET() {
  try {
    if (!APP_ID || !REST_API_KEY) {
      return NextResponse.json(
        { error: "OneSignal not configured" },
        { status: 500 }
      );
    }

    console.log('🧪 Sending test notification to cedric.berchier@gmail.com...');
    const result = await sendTestNotification();
    console.log('✅ Test notification sent to cedric.berchier@gmail.com:', result);

    return NextResponse.json({
      success: true,
      message: "Test notification sent successfully!",
      oneSignalResponse: result,
    });
  } catch (error) {
    console.error("❌ Test notification failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET(); // Same logic for POST requests
}