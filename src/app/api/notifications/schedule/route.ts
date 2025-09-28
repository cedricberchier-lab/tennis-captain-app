export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { scheduleTrainingNotifications, sendImmediateAll, sendToDevice } from "@/lib/scheduleNotifications";

const NOTIFS_ENABLED = process.env.NEXT_PUBLIC_NOTIFS_ENABLED === "true";

const QuerySchema = z.object({
  sessionId: z.string().min(1),
  startsAtISO: z.string().min(1).optional(), // not needed for immediate
  sessionUrl: z.string().optional(), // Remove .url() validation - we handle URL formatting manually
  testMode: z.enum(["0", "1"]).optional(),
  immediate: z.enum(["all"]).optional(),     // simplified
});

export async function GET(req: NextRequest) {
  if (!NOTIFS_ENABLED) return NextResponse.json({ ok: true, skipped: true, reason: "notifications disabled" });

  const url = new URL(req.url);
  const parse = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parse.success) return NextResponse.json({ ok: false, error: parse.error.flatten() }, { status: 400 });

  const { sessionId, startsAtISO, sessionUrl, testMode, immediate } = parse.data;
  const base = process.env.NEXT_PUBLIC_APP_BASE_URL || "https://tennis-captain-app-xz42.vercel.app";

  // Ensure we always have a full URL
  let finalUrl: string;
  if (sessionUrl) {
    finalUrl = sessionUrl.startsWith('http') ? sessionUrl : `${base}${sessionUrl}`;
  } else {
    finalUrl = `${base}/session/${sessionId}`;
  }

  try {
    if (immediate === "all") {
      const out = await sendImmediateAll({
        sessionId,
        sessionUrl: finalUrl,
        title: url.searchParams.get("title") ?? undefined,
        message: url.searchParams.get("message") ?? undefined,
      });
      return NextResponse.json(out, { status: out.ok ? 200 : 400 });
    }

    if (!startsAtISO) {
      return NextResponse.json({ ok: false, error: "startsAtISO required for scheduled sends" }, { status: 400 });
    }
    const out = await scheduleTrainingNotifications({
      sessionId,
      startsAtISO,
      sessionUrl: finalUrl,
      testMode: testMode === "1",
    });
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!NOTIFS_ENABLED) return NextResponse.json({ ok: true, skipped: true, reason: "notifications disabled" });
  try {
    const body = await req.json();
    const { sessionId, startsAtISO, sessionUrl, immediate, title, message, testMode } = body || {};
    const base = process.env.NEXT_PUBLIC_APP_BASE_URL || "https://tennis-captain-app-xz42.vercel.app";

    // Ensure we always have a full URL
    let finalUrl: string;
    if (sessionUrl) {
      finalUrl = sessionUrl.startsWith('http') ? sessionUrl : `${base}${sessionUrl}`;
    } else {
      finalUrl = `${base}/session/${sessionId}`;
    }

    if (immediate === "all") {
      const out = await sendImmediateAll({ sessionId, sessionUrl: finalUrl, title, message });
      return NextResponse.json(out, { status: out.ok ? 200 : 400 });
    }

    if (immediate === "device" && body.deviceId) {
      const out = await sendToDevice({ deviceId: body.deviceId, sessionUrl: finalUrl, title, message });
      return NextResponse.json(out, { status: out.ok ? 200 : 400 });
    }

    if (!sessionId || !startsAtISO) return NextResponse.json({ ok: false, error: "sessionId and startsAtISO required" }, { status: 400 });

    const out = await scheduleTrainingNotifications({
      sessionId,
      startsAtISO,
      sessionUrl: finalUrl,
      testMode: !!testMode,
    });
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}