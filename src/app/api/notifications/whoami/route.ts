export const runtime = "nodejs";
import { NextResponse } from "next/server";

export async function GET() {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || "missing";
  const restKeyPresent = !!process.env.ONESIGNAL_REST_API_KEY;

  return NextResponse.json({
    appId,
    appId_tail: appId.length >= 8 ? appId.slice(-8) : appId,
    restKey_present: restKeyPresent,
  });
}