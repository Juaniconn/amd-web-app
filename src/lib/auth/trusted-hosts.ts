const PRIVATE_LAN_HOST_PATTERNS = [
  "localhost:*",
  "127.0.0.1:*",
  "[::1]:*",
  "10.*:*",
  "192.168.*:*",
  ...Array.from({ length: 16 }, (_, index) => `172.${16 + index}.*:*`),
  "*.local:*",
];

function envList(name: string) {
  return (process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function getAllowedAuthHosts() {
  return [...PRIVATE_LAN_HOST_PATTERNS, ...envList("BETTER_AUTH_ALLOWED_HOSTS")];
}

export function getFallbackAuthUrl() {
  return process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
}

/**
 * ¿Deben las cookies de sesión llevar la marca `Secure`?
 *
 * Solo cuando el ERP se sirve por HTTPS. Con `Secure` activo el navegador
 * descarta la cookie en conexiones HTTP —incluido el acceso por IP de LAN de
 * la beta interna—, con lo que el login responde 200 pero la sesión no se
 * guarda y el usuario vuelve al formulario.
 *
 * Se decide por `BETTER_AUTH_URL`: si declara https, las cookies son seguras.
 * Así la Fase 13 (dominio con TLS) no necesita cambiar código.
 */
export function useSecureAuthCookies() {
  return getFallbackAuthUrl().toLowerCase().startsWith("https://");
}

export function isLocalNetworkOrigin(origin: string) {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }

    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local")
    ) {
      return true;
    }

    const octets = host.split(".").map((part) => Number(part));
    if (
      octets.length !== 4 ||
      octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
    ) {
      return false;
    }

    const [first, second] = octets;
    return (
      first === 10 ||
      (first === 192 && second === 168) ||
      (first === 172 && second >= 16 && second <= 31)
    );
  } catch {
    return false;
  }
}

export async function resolveTrustedOrigins(request?: Request) {
  const origins = new Set<string>([
    getFallbackAuthUrl(),
    ...envList("BETTER_AUTH_TRUSTED_ORIGINS"),
  ]);

  const headerOrigin = request?.headers.get("origin") ?? "";
  if (headerOrigin && isLocalNetworkOrigin(headerOrigin)) {
    origins.add(headerOrigin);
  }

  return [...origins];
}
