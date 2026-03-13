import { NextRequest, NextResponse } from "next/server";

const B2C_DOMAIN = "swisstennisch.b2clogin.com";
const B2C_TENANT = "swisstennisch.onmicrosoft.com";
const B2C_POLICY = "B2C_1A_B2C_1_SIGNUP-SIGNIN";
const CLIENT_ID = "05437a81-854a-4cbb-826a-0aed542be8d0";
const TOKEN_ENDPOINT = `https://${B2C_DOMAIN}/${B2C_TENANT}/${B2C_POLICY}/oauth2/v2.0/token`;

// ── PKCE helpers ──────────────────────────────────────────────────────────────

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

// ── Simple cookie jar for server-side navigation ──────────────────────────────

class CookieJar {
  private jar = new Map<string, string>();

  absorb(headers: Headers) {
    // getSetCookie() is available in Node 18+ / Edge runtime
    const all: string[] =
      typeof (headers as any).getSetCookie === "function"
        ? (headers as any).getSetCookie()
        : [headers.get("set-cookie") ?? ""].filter(Boolean);

    for (const raw of all) {
      const [nameVal] = raw.split(";");
      const eq = nameVal.indexOf("=");
      if (eq > 0) {
        this.jar.set(nameVal.slice(0, eq).trim(), nameVal.slice(eq + 1).trim());
      }
    }
  }

  toString() {
    return [...this.jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

// ── Follow HTTP redirects manually (collect cookies, stop at a prefix) ────────

async function followRedirects(
  startUrl: string,
  cookies: CookieJar,
  stopPrefix?: string
): Promise<{ html: string; url: string }> {
  let url = startUrl;

  for (let i = 0; i < 10; i++) {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: {
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Cookie: cookies.toString(),
      },
    });

    cookies.absorb(res.headers);

    if (res.status === 301 || res.status === 302 || res.status === 303) {
      let loc = res.headers.get("location") ?? "";
      if (!loc) break;
      if (loc.startsWith("/")) {
        const u = new URL(url);
        loc = `${u.protocol}//${u.host}${loc}`;
      }
      if (stopPrefix && loc.startsWith(stopPrefix)) {
        return { html: "", url: loc };
      }
      url = loc;
    } else {
      const html = await res.text();
      return { html, url };
    }
  }

  return { html: "", url };
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json(
      { error: "License number and password required" },
      { status: 400 }
    );
  }

  const host = req.headers.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${protocol}://${host}`;
  const redirectUri = `${appUrl}/api/mytennis/callback`;

  try {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const authUrl =
      `https://${B2C_DOMAIN}/${B2C_TENANT}/${B2C_POLICY}/oauth2/v2.0/authorize?` +
      new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: "code",
        redirect_uri: redirectUri,
        scope: "openid profile offline_access",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        response_mode: "query",
        ui_locales: "fr",
      });

    const cookies = new CookieJar();

    // ── Step 1: Load the Azure B2C login page ──────────────────────────────
    const { html: loginHtml, url: loginUrl } = await followRedirects(authUrl, cookies);

    if (!loginHtml) {
      return NextResponse.json(
        { error: "Could not load Azure B2C login page" },
        { status: 502 }
      );
    }

    // ── Step 2: Parse SETTINGS from the page JS ────────────────────────────
    // Azure B2C pages embed:  var SETTINGS = { "csrf": "...", "transId": "...", ... };
    const settingsMatch = loginHtml.match(/var SETTINGS\s*=\s*(\{[\s\S]*?\});\s*(?:\/\/|var |$)/m);
    if (!settingsMatch) {
      return NextResponse.json(
        {
          error: "Could not parse Azure B2C SETTINGS — page structure may have changed.",
          hint: loginHtml.slice(0, 800),
        },
        { status: 502 }
      );
    }

    let settings: Record<string, any>;
    try {
      settings = JSON.parse(settingsMatch[1]);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse SETTINGS JSON from login page" },
        { status: 502 }
      );
    }

    const csrf = settings.csrf as string ?? "";
    const transId = settings.transId as string ?? "";
    const apiName = settings.api as string ?? "selfasserted";

    // tx can be in the SETTINGS transId or in the login URL query params
    const loginUrlObj = new URL(loginUrl);
    const tx = loginUrlObj.searchParams.get("tx") ?? transId;
    const p = loginUrlObj.searchParams.get("p") ?? B2C_POLICY;

    if (!csrf || !tx) {
      return NextResponse.json(
        { error: "Missing csrf or tx from login page", settings },
        { status: 502 }
      );
    }

    // ── Step 3: Submit credentials to SelfAsserted ─────────────────────────
    const selfAssertedUrl =
      `https://${B2C_DOMAIN}/${B2C_TENANT}/${p}/api/SelfAsserted` +
      `?tx=${encodeURIComponent(tx)}&p=${encodeURIComponent(p)}`;

    const credRes = await fetch(selfAssertedUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-CSRF-TOKEN": csrf,
        Cookie: cookies.toString(),
        Referer: loginUrl,
        Origin: `https://${B2C_DOMAIN}`,
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },
      body: new URLSearchParams({
        request_type: "RESPONSE",
        logonIdentifier: username,
        password,
      }),
    });

    cookies.absorb(credRes.headers);

    let credData: any = {};
    try {
      credData = await credRes.json();
    } catch {
      /* non-JSON response */
    }

    if (credData.status !== "200" && credData.status !== 200) {
      return NextResponse.json(
        { error: credData.message ?? "Invalid credentials" },
        { status: 401 }
      );
    }

    // ── Step 4: Navigate to confirmed endpoint to get auth code ────────────
    const confirmedUrl =
      `https://${B2C_DOMAIN}/${B2C_TENANT}/${p}/api/${apiName}/confirmed` +
      `?csrf_token=${encodeURIComponent(csrf)}&tx=${encodeURIComponent(tx)}&p=${encodeURIComponent(p)}`;

    const { url: codeUrl } = await followRedirects(confirmedUrl, cookies, redirectUri);

    if (!codeUrl.startsWith(redirectUri)) {
      return NextResponse.json(
        { error: "Auth flow did not return to callback URL", got: codeUrl },
        { status: 502 }
      );
    }

    const code = new URL(codeUrl).searchParams.get("code");
    if (!code) {
      return NextResponse.json({ error: "No authorization code in callback" }, { status: 502 });
    }

    // ── Step 5: Exchange code for tokens ───────────────────────────────────
    const tokenRes = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({}));
      const msg = err.error_description?.split("\r\n")[0] ?? "Token exchange failed";
      return NextResponse.json({ error: msg }, { status: 401 });
    }

    const tokens = await tokenRes.json();
    const isSecure = !host.includes("localhost");

    const response = NextResponse.json({ ok: true });

    response.cookies.set("mytennis_token", tokens.access_token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: tokens.expires_in ?? 3600,
      path: "/",
    });

    if (tokens.refresh_token) {
      response.cookies.set("mytennis_refresh", tokens.refresh_token, {
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
    }

    return response;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
