import { NextRequest, NextResponse } from "next/server";

// TODO: Fill this in from browser devtools (Network tab while searching a player on mytennis.ch)
// Look for a POST request to a GraphQL endpoint — URL will contain /graphql or /v1/graphql
const GRAPHQL_ENDPOINT = process.env.MYTENNIS_GRAPHQL_ENDPOINT ?? "TODO";

// TODO: Replace with the actual GraphQL query captured from devtools
// (look at the "Payload" tab of the search request in Network)
const PLAYER_SEARCH_QUERY = `
  query SearchPlayers($search: String!) {
    players(where: { name: { _ilike: $search } }, limit: 20) {
      id
      firstName
      lastName
      ranking
      club
    }
  }
`;

export async function POST(req: NextRequest) {
  const { query, token } = await req.json();

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!query?.trim()) {
    return NextResponse.json({ error: "Search query required" }, { status: 400 });
  }

  if (GRAPHQL_ENDPOINT === "TODO") {
    return NextResponse.json({
      error: "GraphQL endpoint not configured. See src/app/api/mytennis/search/route.ts for instructions.",
    }, { status: 501 });
  }

  try {
    const res = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: PLAYER_SEARCH_QUERY,
        variables: { search: `%${query}%` },
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Search failed" }, { status: res.status });
    }

    const data = await res.json();

    if (data.errors) {
      return NextResponse.json({ error: data.errors[0]?.message ?? "GraphQL error" }, { status: 400 });
    }

    return NextResponse.json({ players: data.data?.players ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
