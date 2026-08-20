import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Guardia de rutas.
 *
 * `getSessionCookie` solo comprueba que la cookie EXISTA; no valida la sesión
 * contra la base de datos (el middleware no tiene acceso a ella). Eso abría un
 * bucle infinito con cookies caducas: el middleware veía la cookie y mandaba
 * `/login` → `/dashboard`; la página validaba la sesión, la encontraba muerta
 * y devolvía a `/login`. Resultado: ERR_TOO_MANY_REDIRECTS y el usuario sin
 * poder llegar nunca al formulario de acceso.
 *
 * Defensa en dos capas:
 *
 * 1. `requireSession()` redirige a `/login?reauth=1` cuando rechaza la sesión.
 *    Con ese marcador presente, aquí NO se vuelve a enviar al dashboard.
 * 2. Además se BORRAN las cookies de sesión en esa respuesta. Así la siguiente
 *    petición ya no lleva cookie y el bucle no puede reaparecer ni siquiera si
 *    el marcador se pierde.
 */

const SESSION_COOKIE_NAMES = [
  "better-auth.session_token",
  "better-auth.session_data",
  "__Secure-better-auth.session_token",
  "__Secure-better-auth.session_data",
];

function clearSessionCookies(response: NextResponse) {
  for (const name of SESSION_COOKIE_NAMES) {
    response.cookies.set(name, "", { maxAge: 0, path: "/" });
  }
  return response;
}

export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname, searchParams } = request.nextUrl;
  const isAuthRoute = pathname.startsWith("/login");
  const isPublic =
    isAuthRoute ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico";

  if (!sessionCookie && !isPublic) {
    const target = new URL("/login", request.url);
    target.searchParams.set("reauth", "1");
    return NextResponse.redirect(target);
  }

  if (sessionCookie && isAuthRoute) {
    // Venimos de un rechazo de sesión: mostrar el formulario y limpiar la
    // cookie inválida en vez de rebotar otra vez al dashboard.
    if (searchParams.has("reauth")) {
      return clearSessionCookies(NextResponse.next());
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.png$|.*\\.svg$|.*\\.ico$).*)"],
};
