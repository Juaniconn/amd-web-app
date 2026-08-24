import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Endurecimiento (Fase 12.5):
 * 1. Cabeceras de seguridad en todas las respuestas.
 * 2. Rate limit en memoria para rutas sensibles (login, API).
 *
 * El CSP no bloquea nada: Next inyecta estilos/scripts inline, así que
 * se permiten con 'unsafe-inline' hasta migrar a nonces.
 */

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-DNS-Prefetch-Control": "off",
};

// Rate limit en memoria por IP+ruta. Suficiente para un solo nodo;
// detrás de Cloudflare se puede mover al edge más adelante.
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= max;
}

// Limpieza periódica para no crecer sin límite
let lastSweep = Date.now();

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (Date.now() - lastSweep > 60_000) {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt < now) buckets.delete(key);
    }
    lastSweep = now;
  }

  // Rutas sensibles: login y APIs de escritura
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local";

  let limited = false;
  if (pathname.startsWith("/api/auth")) {
    // login/registro: estricto — 10 intentos por minuto por IP
    limited = !rateLimit(`auth:${ip}`, 10, 60_000);
  } else if (pathname.startsWith("/api/") && request.method !== "GET") {
    // escrituras de API: 60 por minuto por IP
    limited = !rateLimit(`api:${ip}`, 60, 60_000);
  }

  if (limited) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta en un minuto." },
      { status: 429, headers: SECURITY_HEADERS },
    );
  }

  const response = NextResponse.next();
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value);
  }
  return response;
}

export const config = {
  matcher: [
    // Todo excepto estáticos de Next
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
