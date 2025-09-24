export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { scheduleTrainingNotifications } from "@/lib/scheduleNotifications";

const NOTIFS_ENABLED = process.env.NEXT_PUBLIC_NOTIFS_ENABLED === "true";

const QuerySchema = z.object({
  sessionId: z.string().min(1),
  startsAtISO: z.string().min(1),
  sessionUrl: z.string().url().optional(),
  roster: z.string().optional(), // comma-separated user ids
  testMode: z.enum(["0", "1"]).optional(),
});

export async function GET(req: NextRequest) {
  if (!NOTIFS_ENABLED) {
    return NextResponse.json({ ok: true, skipped: true, reason: "notifications disabled" });
  }

  const url = new URL(req.url);
  const parse = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parse.success) {
    return NextResponse.json({ ok: false, error: parse.error.flatten() }, { status: 400 });
  }
  const { sessionId, startsAtISO, sessionUrl, roster, testMode } = parse.data;

  // Derive default URL if not passed
  const base = process.env.NEXT_PUBLIC_APP_BASE_URL || "";
  const finalUrl = sessionUrl || (base ? `${base}/session/${sessionId}` : `/session/${sessionId}`);

  const rosterUserIds = roster ? roster.split(",").map((s) => s.trim()).filter(Boolean) : [];

  try {
    const out = await scheduleTrainingNotifications({
      sessionId,
      startsAtISO,
      sessionUrl: finalUrl,
      rosterUserIds,
      testMode: testMode === "1",
    });
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!NOTIFS_ENABLED) {
    return NextResponse.json({ ok: true, skipped: true, reason: "notifications disabled" });
  }
  try {
    const body = await req.json();
    // Accept same fields via POST JSON
    const { sessionId, startsAtISO, sessionUrl, rosterUserIds, testMode, immediateNotification } = body || {};
    if (!sessionId || !startsAtISO) {
      return NextResponse.json({ ok: false, error: "sessionId and startsAtISO required" }, { status: 400 });
    }
    const out = await scheduleTrainingNotifications({
      sessionId,
      startsAtISO,
      sessionUrl: sessionUrl || (process.env.NEXT_PUBLIC_APP_BASE_URL ? `${process.env.NEXT_PUBLIC_APP_BASE_URL}/session/${sessionId}` : `/session/${sessionId}`),
      rosterUserIds: Array.isArray(rosterUserIds) ? rosterUserIds : [],
      testMode: !!testMode,
      immediateNotification: !!immediateNotification,
    });
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}