import { NextRequest, NextResponse } from "next/server";

// Azure AD B2C — swisstennisch tenant
const B2C_TENANT = "swisstennisch.onmicrosoft.com";
const B2C_DOMAIN = "swisstennisch.b2clogin.com";
const B2C_POLICY = "B2C_1A_B2C_1_SIGNUP-SIGNIN";
const CLIENT_ID = "05437a81-854a-4cbb-826a-0aed542be8d0";

// ROPC token endpoint (Resource Owner Password Credentials — no browser redirect needed)
const TOKEN_ENDPOINT = `https://${B2C_DOMAIN}/${B2C_TENANT}/${B2C_POLICY}/oauth2/v2.0/token`;

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const params = new URLSearchParams({
    grant_type: "password",
    client_id: CLIENT_ID,
    scope: `openid ${CLIENT_ID} offline_access`,
    username: email,
    password,
    response_type: "token id_token",
  });

  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const data = await res.json();

    if (!res.ok) {
      const message =
        data?.error_description?.split("\r\n")?.[0] ??
        data?.error_description ??
        data?.error ??
        "Authentication failed";
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({
      access_token: data.access_token,
      id_token: data.id_token,
      expires_in: data.expires_in,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
