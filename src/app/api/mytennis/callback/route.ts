import { NextRequest, NextResponse } from "next/server";

const B2C_DOMAIN = "swisstennisch.b2clogin.com";
const B2C_TENANT = "swisstennisch.onmicrosoft.com";
const B2C_POLICY = "B2C_1A_B2C_1_SIGNUP-SIGNIN";
const CLIENT_ID = "05437a81-854a-4cbb-826a-0aed542be8d0";
const TOKEN_ENDPOINT = `https://${B2C_DOMAIN}/${B2C_TENANT}/${B2C_POLICY}/oauth2/v2.0/token`;

function getAppUrl(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const host = req.headers.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const returnUrl = new URL("/debug", req.url);

  const error = searchParams.get("error");
  if (error) {
    const desc = searchParams.get("error_description") ?? error;
    returnUrl.searchParams.set("auth_error", desc.split("\r\n")[0]);
    return NextResponse.redirect(returnUrl);
  }

  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect(returnUrl);

  const codeVerifier = req.cookies.get("mytennis_cv")?.value;
  if (!codeVerifier) {
    returnUrl.searchParams.set("auth_error", "Session expired, please try again");
    return NextResponse.redirect(returnUrl);
  }

  const appUrl = getAppUrl(req);
  const redirectUri = `${appUrl}/api/mytennis/callback`;

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: CLIENT_ID,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const tokenRes = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.json().catch(() => ({}));
    const msg = err.error_description?.split("\r\n")[0] ?? err.error ?? "Login failed";
    returnUrl.searchParams.set("auth_error", msg);
    const res = NextResponse.redirect(returnUrl);
    res.cookies.delete("mytennis_cv");
    return res;
  }

  const tokens = await tokenRes.json();
  const res = NextResponse.redirect(returnUrl);

  const isSecure = !req.headers.get("host")?.includes("localhost");

  res.cookies.set("mytennis_token", tokens.access_token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: tokens.expires_in ?? 3600,
    path: "/",
  });

  if (tokens.refresh_token) {
    res.cookies.set("mytennis_refresh", tokens.refresh_token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });
  }

  res.cookies.delete("mytennis_cv");
  return res;
}
