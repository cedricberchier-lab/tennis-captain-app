import { NextRequest, NextResponse } from "next/server";

const B2C_DOMAIN = "swisstennisch.b2clogin.com";
const B2C_TENANT = "swisstennisch.onmicrosoft.com";
const B2C_POLICY = "B2C_1A_B2C_1_SIGNUP-SIGNIN";
const CLIENT_ID = "05437a81-854a-4cbb-826a-0aed542be8d0";

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function getAppUrl(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const host = req.headers.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export async function GET(req: NextRequest) {
  const appUrl = getAppUrl(req);
  const redirectUri = `${appUrl}/api/mytennis/callback`;

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const authUrl = new URL(
    `https://${B2C_DOMAIN}/${B2C_TENANT}/${B2C_POLICY}/oauth2/v2.0/authorize`
  );
  authUrl.searchParams.set("client_id", CLIENT_ID);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "openid profile offline_access");
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("ui_locales", "fr");

  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set("mytennis_cv", codeVerifier, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 300, // 5 minutes
    path: "/",
  });
  return res;
}
