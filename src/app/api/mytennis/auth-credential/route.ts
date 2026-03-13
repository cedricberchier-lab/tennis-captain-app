import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const B2C_DOMAIN = "swisstennisch.b2clogin.com";
const B2C_TENANT = "swisstennisch.onmicrosoft.com";
const B2C_POLICY = "b2c_1a_b2c_1_signup-signin";
// mytennis PWA client — redirect_uri https://www.mytennis.ch/ is registered for this client
const CLIENT_ID = "5c8c6e4e-a017-49d4-a9c0-f89fe08614f3";
const REDIRECT_URI = "https://www.mytennis.ch/";
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

// ── Safely resolve a potentially-relative URL against a base ──────────────────

function resolveUrl(loc: string, base: string): string | null {
  if (!loc) return null;
  if (loc.startsWith("http://") || loc.startsWith("https://")) return loc;
  if (loc.startsWith("//")) {
    try { return `${new URL(base).protocol}${loc}`; } catch { return null; }
  }
  if (loc.startsWith("/")) {
    try {
      const u = new URL(base);
      return `${u.protocol}//${u.host}${loc}`;
    } catch { return null; }
  }
  try { return new URL(loc, base).toString(); } catch { return null; }
}

// ── Follow HTTP redirects manually, stop when location starts with stopPrefix ──

type RedirectResult = { html: string; url: string; error?: string };

async function followRedirects(
  startUrl: string,
  cookies: CookieJar,
  stopPrefix?: string
): Promise<RedirectResult> {
  let url = startUrl;

  for (let i = 0; i < 15; i++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(15_000),
        headers: {
          Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
          Cookie: cookies.toString(),
        },
      });
    } catch (e: any) {
      return { html: "", url, error: `fetch failed at step ${i} for "${url}": ${e.message}` };
    }

    cookies.absorb(res.headers);

    if (res.status === 301 || res.status === 302 || res.status === 303 || res.status === 307 || res.status === 308) {
      const rawLoc = res.headers.get("location") ?? "";
      if (!rawLoc) break;

      const resolved = resolveUrl(rawLoc, url);
      if (!resolved) {
        return { html: "", url, error: `Cannot resolve redirect: "${rawLoc}" from "${url}"` };
      }

      if (stopPrefix && resolved.startsWith(stopPrefix)) {
        return { html: "", url: resolved };
      }
      url = resolved;
    } else {
      let html = "";
      try { html = await res.text(); } catch { /* ignore */ }
      return { html, url };
    }
  }

  return { html: "", url, error: "Too many redirects" };
}

// ── Extract a JSON object from a JS variable assignment in HTML ───────────────

function extractJsonVar(html: string, varName: string): string | null {
  const marker = `var ${varName} = `;
  const markerIdx = html.indexOf(marker);
  if (markerIdx === -1) return null;

  const jsonStart = html.indexOf("{", markerIdx);
  if (jsonStart === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = jsonStart; i < html.length; i++) {
    const ch = html[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\" && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return html.slice(jsonStart, i + 1);
    }
  }
  return null;
}

// ── Parse authorization code from fragment or query params ────────────────────

function extractCode(url: string): string | null {
  // Fragment: https://www.mytennis.ch/#code=xxx  (response_mode=fragment)
  const hashIdx = url.indexOf("#");
  if (hashIdx !== -1) {
    const fragment = url.slice(hashIdx + 1);
    const params = new URLSearchParams(fragment);
    const code = params.get("code");
    if (code) return code;
  }
  // Query: https://example.com/?code=xxx  (response_mode=query)
  try {
    const code = new URL(url).searchParams.get("code");
    if (code) return code;
  } catch { /* ignore */ }
  return null;
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
  const isSecure = !host.includes("localhost");

  try {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Use the mytennis PWA's client_id + redirect_uri — these are registered with B2C
    const authUrl =
      `https://${B2C_DOMAIN}/${B2C_TENANT}/${B2C_POLICY}/oauth2/v2.0/authorize?` +
      new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: "code",
        redirect_uri: REDIRECT_URI,
        scope: "openid profile offline_access",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        response_mode: "fragment",
        ui_locales: "fr",
      });

    const cookies = new CookieJar();

    // ── Step 1: Load the Azure B2C login page ──────────────────────────────
    const step1 = await followRedirects(authUrl, cookies);

    if (step1.error) {
      return NextResponse.json({ error: `Step 1: ${step1.error}` }, { status: 502 });
    }
    if (!step1.html) {
      return NextResponse.json({ error: "Step 1: Empty response from B2C", url: step1.url }, { status: 502 });
    }

    const loginHtml = step1.html;
    const loginUrl = step1.url;

    // ── Step 2: Parse SETTINGS from the page JS ────────────────────────────
    const settingsJson = extractJsonVar(loginHtml, "SETTINGS");
    if (!settingsJson) {
      const varMatches = loginHtml.match(/var\s+\w+\s*=/g)?.slice(0, 10) ?? [];
      return NextResponse.json(
        {
          error: "Step 2: Could not find SETTINGS in Azure B2C page",
          loginUrl,
          htmlLength: loginHtml.length,
          htmlStart: loginHtml.slice(0, 800),
          jsVarsFound: varMatches,
        },
        { status: 502 }
      );
    }

    let settings: Record<string, any>;
    try {
      settings = JSON.parse(settingsJson);
    } catch {
      return NextResponse.json(
        { error: "Step 2: Failed to parse SETTINGS JSON", raw: settingsJson.slice(0, 500) },
        { status: 502 }
      );
    }

    const csrf = (settings.csrf as string) ?? "";
    const transId = (settings.transId as string) ?? "";
    const apiName = (settings.api as string) ?? "selfasserted";

    let tx = transId;
    let p = B2C_POLICY;
    try {
      const loginUrlObj = new URL(loginUrl);
      tx = loginUrlObj.searchParams.get("tx") ?? transId;
      p = loginUrlObj.searchParams.get("p") ?? B2C_POLICY;
    } catch { /* keep defaults */ }

    if (!csrf || !tx) {
      return NextResponse.json(
        { error: "Step 2: Missing csrf or tx", csrf: !!csrf, tx: !!tx, settings },
        { status: 502 }
      );
    }

    // ── Step 3: Submit credentials to SelfAsserted ─────────────────────────
    const selfAssertedUrl =
      `https://${B2C_DOMAIN}/${B2C_TENANT}/${p}/api/SelfAsserted` +
      `?tx=${encodeURIComponent(tx)}&p=${encodeURIComponent(p)}`;

    let credRes: Response;
    try {
      credRes = await fetch(selfAssertedUrl, {
        method: "POST",
        signal: AbortSignal.timeout(15_000),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-CSRF-TOKEN": csrf,
          Cookie: cookies.toString(),
          Referer: loginUrl,
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
    } catch (e: any) {
      return NextResponse.json({ error: `Step 3: ${e.message}` }, { status: 502 });
    }

    cookies.absorb(credRes.headers);

    let credData: any = {};
    try { credData = await credRes.json(); } catch { /* non-JSON */ }

    if (credData.status !== "200" && credData.status !== 200) {
      return NextResponse.json(
        { error: credData.message ?? "Invalid credentials" },
        { status: 401 }
      );
    }

    // ── Step 4: Follow confirmed → mytennis.ch redirect to capture auth code ──
    // With response_mode=fragment the code lands in the URL fragment:
    //   https://www.mytennis.ch/#code=xxx&...
    // The fragment IS present in the HTTP Location header, so we can read it.
    const confirmedUrl =
      `https://${B2C_DOMAIN}/${B2C_TENANT}/${p}/api/${apiName}/confirmed` +
      `?csrf_token=${encodeURIComponent(csrf)}&tx=${encodeURIComponent(tx)}&p=${encodeURIComponent(p)}`;

    const step4 = await followRedirects(confirmedUrl, cookies, REDIRECT_URI);

    if (step4.error) {
      return NextResponse.json({ error: `Step 4: ${step4.error}` }, { status: 502 });
    }

    const codeUrl = step4.url;

    if (!codeUrl.startsWith(REDIRECT_URI)) {
      return NextResponse.json(
        { error: "Step 4: Did not reach expected redirect URI", got: codeUrl },
        { status: 502 }
      );
    }

    const code = extractCode(codeUrl);
    if (!code) {
      return NextResponse.json(
        { error: "Step 4: No authorization code found", url: codeUrl },
        { status: 502 }
      );
    }

    // ── Step 5: Exchange code for tokens ───────────────────────────────────
    const tokenRes = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({}));
      const msg = err.error_description?.split("\r\n")[0] ?? "Token exchange failed";
      return NextResponse.json({ error: `Step 5: ${msg}` }, { status: 401 });
    }

    const tokens = await tokenRes.json();

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
    return NextResponse.json({ error: e.message, stack: e.stack?.slice(0, 500) }, { status: 500 });
  }
}
