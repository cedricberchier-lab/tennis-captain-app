import { NextRequest, NextResponse } from 'next/server';

const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!;
const REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY!;
const BASE_ONE_SIGNAL_API = "https://onesignal.com/api/v1/notifications";

async function sendBroadcastNotification(title: string, message: string, url?: string) {
  const res = await fetch(BASE_ONE_SIGNAL_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${REST_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: APP_ID,
      included_segments: ["Subscribed Users"], // 📢 Send to ALL subscribed users
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
    const { title, message, url } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 }
      );
    }

    console.log('📢 Sending broadcast notification to ALL users...');
    console.log('Title:', title);
    console.log('Message:', message);

    const result = await sendBroadcastNotification(title, message, url);
    console.log('✅ Broadcast notification sent:', result);

    return NextResponse.json({
      success: true,
      message: "Broadcast notification sent to all users!",
      oneSignalResponse: result,
    });
  } catch (error) {
    console.error("❌ Broadcast notification failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Simple test broadcast
  try {
    if (!APP_ID || !REST_API_KEY) {
      return NextResponse.json(
        { error: "OneSignal not configured" },
        { status: 500 }
      );
    }

    console.log('📢 Sending test broadcast to ALL users...');
    const result = await sendBroadcastNotification(
      "Tennis Captain Announcement",
      "This is a test broadcast notification to all tennis team members!",
      "https://tennis-captain-app-xz42.vercel.app/"
    );
    console.log('✅ Test broadcast sent:', result);

    return NextResponse.json({
      success: true,
      message: "Test broadcast sent to all users!",
      oneSignalResponse: result,
    });
  } catch (error) {
    console.error("❌ Test broadcast failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}