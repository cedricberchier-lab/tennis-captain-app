import { NextRequest, NextResponse } from "next/server";

const B2C_DOMAIN = "swisstennisch.b2clogin.com";
const B2C_TENANT = "swisstennisch.onmicrosoft.com";
const B2C_POLICY = "B2C_1A_B2C_1_SIGNUP-SIGNIN";
const CLIENT_ID = "05437a81-854a-4cbb-826a-0aed542be8d0";
const TOKEN_ENDPOINT = `https://${B2C_DOMAIN}/${B2C_TENANT}/${B2C_POLICY}/oauth2/v2.0/token`;

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "License number and password required" }, { status: 400 });
  }

  // Try ROPC (Resource Owner Password Credentials) — direct credential login, no browser redirect
  const params = new URLSearchParams({
    grant_type: "password",
    client_id: CLIENT_ID,
    scope: "openid profile offline_access",
    username,
    password,
    response_type: "token id_token",
  });

  let tokenRes = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  let data = await tokenRes.json();

  // If ROPC not supported by this policy, try form-based login scraping
  if (!tokenRes.ok) {
    const ropcError = data?.error ?? "";
    if (ropcError === "unsupported_grant_type" || ropcError === "invalid_request") {
      return NextResponse.json({
        error: "Direct login not supported by this policy. Please use 'Sign in with mytennis.ch' instead.",
        details: data?.error_description,
      }, { status: 422 });
    }

    const msg = data?.error_description?.split("\r\n")?.[0] ?? data?.error ?? "Login failed";
    return NextResponse.json({ error: msg }, { status: 401 });
  }

  const isSecure = !req.headers.get("host")?.includes("localhost");

  const res = NextResponse.json({ ok: true });

  res.cookies.set("mytennis_token", data.access_token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: data.expires_in ?? 3600,
    path: "/",
  });

  if (data.refresh_token) {
    res.cookies.set("mytennis_refresh", data.refresh_token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }

  return res;
}
