import "server-only";

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getSkydropxToken(): Promise<string> {
  const now = Date.now();

  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }

  const clientId = process.env.SKYDROPX_API_KEY;
  const clientSecret = process.env.SKYDROPX_API_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("SkydropX API credentials not configured");
  }

  // SkydropX requiere formulario URL-encoded, NO JSON
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch("https://api-pro.skydropx.com/api/v1/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SkydropX auth failed: ${response.status} ${error}`);
  }

  const data = await response.json();

  cachedToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in ?? 7200) * 1000,
  };

  return cachedToken.token;
}

export function clearSkydropxToken() {
  cachedToken = null;
}
