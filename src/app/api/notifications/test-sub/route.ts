export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";

const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!;
const REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY!;
const BASE = "https://onesignal.com/api/v1/notifications";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscriptionId, title, message, url } = body;

    if (!subscriptionId) {
      return NextResponse.json(
        { ok: false, error: "subscriptionId is required" },
        { status: 400 }
      );
    }

    if (!APP_ID || !REST_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "OneSignal environment variables not configured" },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || "";
    const finalUrl = url || (baseUrl ? `${baseUrl}/` : "/");

    const payload = {
      app_id: APP_ID,
      include_subscription_ids: [subscriptionId],
      // Explicitly target ALL platforms to fix mobile device exclusion
      isAnyWeb: true,
      isChrome: true,
      isSafari: true,
      isFirefox: true,
      headings: { en: title || "Direct test" },
      contents: { en: message || "Sent to this device only" },
      url: finalUrl,
    };

    const response = await fetch(BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${REST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OneSignal ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || String(error) },
      { status: 500 }
    );
  }
}