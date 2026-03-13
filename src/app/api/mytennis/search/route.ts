import { NextRequest, NextResponse } from "next/server";

const SEARCH_ENDPOINT = "https://high-scalability.microservices.swisstennis.ch/player-autocomplete-query";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("mytennis_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { query } = await req.json();

  if (!query?.trim()) {
    return NextResponse.json({ error: "Search query required" }, { status: 400 });
  }

  try {
    const res = await fetch(SEARCH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "X-DP-Access-Token": token,
        "Origin": "https://www.mytennis.ch",
        "Referer": "https://www.mytennis.ch/",
      },
      body: JSON.stringify({
        keyword: query.trim(),
        filters: { licenseStatus: "1,2" },
        offset: 0,
        limit: 50,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Search failed (${res.status}): ${text}` }, { status: res.status });
    }

    const data = await res.json();
    const players = normalizeResponse(data);
    return NextResponse.json({ players, raw: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function normalizeResponse(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.players)) return data.players;
  if (Array.isArray(data?.data?.players)) return data.data.players;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}
