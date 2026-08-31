import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const EBAY_ENV_PATH = path.join(process.cwd(), "..", "ebay-automation", ".env.local");

function readEnvVar(varName: string): string {
  try {
    if (!fs.existsSync(EBAY_ENV_PATH)) return "";
    const content = fs.readFileSync(EBAY_ENV_PATH, "utf-8");
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || trimmed === "") continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.substring(0, eqIndex).trim();
      if (key === varName) {
        let value = trimmed.substring(eqIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        return value;
      }
    }
  } catch {}
  return "";
}

export async function GET() {
  const token = readEnvVar("EBAY_OAUTH_TOKEN") || readEnvVar("EBAY_AUTH_TOKEN");
  const env = readEnvVar("EBAY_ENVIRONMENT") || "sandbox";
  
  return NextResponse.json({
    connected: !!token,
    environment: env,
    hasOAuth: !!readEnvVar("EBAY_OAUTH_TOKEN"),
    hasAuth: !!readEnvVar("EBAY_AUTH_TOKEN"),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();
    
    if (action === "test") {
      const token = readEnvVar("EBAY_OAUTH_TOKEN") || readEnvVar("EBAY_AUTH_TOKEN");
      const env = readEnvVar("EBAY_ENVIRONMENT") || "sandbox";
      const baseUrl = env === "production" ? "https://api.ebay.com" : "https://api.sandbox.ebay.com";
      
      if (!token) {
        return NextResponse.json({ success: false, message: "Token no configurado" });
      }
      
      const res = await fetch(`${baseUrl}/buy/browse/v1/item_summary/search?q=test&limit=1`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        },
      });
      
      if (res.status === 200) {
        const data = await res.json();
        return NextResponse.json({ success: true, message: `Conexión exitosa (${data.total} items)` });
      } else if (res.status === 401) {
        return NextResponse.json({ success: false, message: "Token expirado o inválido" });
      } else {
        const errorData = await res.json();
        return NextResponse.json({ success: false, message: `Error ${res.status}: ${JSON.stringify(errorData)}` });
      }
    }
    
    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}