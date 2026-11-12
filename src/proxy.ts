import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/cookies";
import {
  clientIp,
  EXPENSIVE_PATH,
  hit,
  RATE_LIMITS,
  rateLimitBucket,
  rateLimitHeaders,
  type RateLimitConfig,
} from "@/lib/rate-limit";

const PROTECTED_PREFIXES = [

  "/api/patterns",
  "/api/test-cases",

  "/api/account",
];

const PUBLIC_OVERRIDES = ["/api/health"];

const MAX_API_BODY_BYTES = 256 * 1024;

function isProtectedPath(pathname: string): boolean {
  if (PUBLIC_OVERRIDES.some((route) => pathname === route)) return false;
  return PROTECTED_PREFIXES.some((route) => {
    const base = route.replace(/\/+$/, "");
    return pathname === base || pathname.startsWith(`${base}/`);
  });
}

function limitFor(pathname: string, isSignedIn: boolean): RateLimitConfig {
  if (pathname === EXPENSIVE_PATH) return RATE_LIMITS.explain;
  return isSignedIn ? RATE_LIMITS.authenticated : RATE_LIMITS.anonymous;
}

function reject(body: unknown, status: number, headers: Record<string, string>) {
  return NextResponse.json(body, { status, headers });
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (
    pathname.startsWith("/api/") &&
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_API_BODY_BYTES
  ) {
    return reject({ error: "Cuerpo de la petición demasiado grande" }, 413, {});
  }

  const signedIn = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (isProtectedPath(pathname) && !signedIn) {
    return reject({ error: "No autenticado" }, 401, {});
  }

  const ip = clientIp(request);
  const identity = `ip:${ip}`;
  const config = limitFor(pathname, signedIn);

  const result = hit(`rl:${rateLimitBucket(pathname)}:${identity}`, config);
  const headers = rateLimitHeaders(result);

  if (!result.allowed) {
    return reject(
      {
        error: "Demasiadas peticiones",
        detail: `Límite de ${config.limit} requests por minuto. Reintenta en ${result.retryAfterSeconds}s.`,
      },
      429,
      headers
    );
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: [

    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|mjs|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|txt|xml|json|csv|docx?|xlsx?|zip|webmanifest|map)).*)",
    "/(api|trpc)(.*)",
  ],
};
