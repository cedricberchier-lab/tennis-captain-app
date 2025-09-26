import { NextRequest, NextResponse } from 'next/server';

const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!;
const REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY!;
const BASE_ONE_SIGNAL_API = "https://onesignal.com/api/v1/notifications";

async function sendTargetedNotification(
  userIds: string[],
  title: string,
  message: string,
  url?: string
) {
  const res = await fetch(BASE_ONE_SIGNAL_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${REST_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: APP_ID,
      include_external_user_ids: userIds, // Target specific users by their external user IDs
      headings: { en: title },
      contents: { en: message },
      url: url || "https://tennis-captain-app-xz42.vercel.app/",
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OneSignal error ${res.status}: ${txt}`);
  }

  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    if (!APP_ID || !REST_API_KEY) {
      return NextResponse.json(
        { error: "OneSignal not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { userIds, title, message, url } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "userIds array is required" },
        { status: 400 }
      );
    }

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 }
      );
    }

    console.log('🎯 Sending targeted notification to specific users...');
    console.log('Target User IDs:', userIds);
    console.log('Title:', title);
    console.log('Message:', message);

    const result = await sendTargetedNotification(userIds, title, message, url);
    console.log('✅ Targeted notification sent:', result);

    return NextResponse.json({
      success: true,
      status: 200,
      result,
      targetUserIds: userIds,
      message: `Notification sent to ${userIds.length} specific user(s)!`,
    });
  } catch (error) {
    console.error("❌ Targeted notification failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Test targeting Cédric specifically
  try {
    if (!APP_ID || !REST_API_KEY) {
      return NextResponse.json(
        { error: "OneSignal not configured" },
        { status: 500 }
      );
    }

    const cedricUserId = "31f66967-925c-4fec-be25-f0403e34c279";

    console.log('🎯 Sending test notification to Cédric Berchier...');
    console.log('Target User ID:', cedricUserId);

    const result = await sendTargetedNotification(
      [cedricUserId],
      "Personal Test Message",
      "Hello Cédric! This notification is targeted specifically to your user ID across all your devices.",
      "https://tennis-captain-app-xz42.vercel.app/"
    );

    console.log('✅ Test notification sent to Cédric:', result);

    return NextResponse.json({
      success: true,
      status: 200,
      result,
      targetUserId: cedricUserId,
      message: "Test notification sent specifically to Cédric Berchier!",
    });
  } catch (error) {
    console.error("❌ Test notification to Cédric failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}