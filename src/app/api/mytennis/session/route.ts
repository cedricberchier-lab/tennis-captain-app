import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("mytennis_token")?.value;
  const res = NextResponse.json({ authenticated: !!token });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
