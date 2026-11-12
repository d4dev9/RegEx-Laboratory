export function canonicalOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  return configured || "https://regexlab.indevs.in";
}

export function allowedOrigins(): string[] {
  const origins = new Set<string>([canonicalOrigin()]);

  const deployment = process.env.VERCEL_URL;
  if (deployment) {
    const host = deployment.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (host) origins.add(`https://${host}`);
  }

  return [...origins];
}

function requestHost(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-host");
  const host = forwarded ?? request.headers.get("host");
  if (!host) return null;
  return host.split(",")[0].trim().toLowerCase();
}

export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const normalized = origin.replace(/\/+$/, "");
  if (
    allowedOrigins().some((allowed) => allowed.replace(/\/+$/, "") === normalized)
  ) {
    return true;
  }

  try {
    const originHost = new URL(normalized).host.toLowerCase();
    const host = requestHost(request);
    if (host && originHost === host) return true;
  } catch {

  }

  if (process.env.NODE_ENV !== "production") {
    try {
      const host = new URL(normalized).hostname;
      if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
        return true;
      }
    } catch {

    }
  }

  return false;
}

export function hasJsonContentType(request: Request): boolean {
  const contentType = request.headers.get("content-type") ?? "";
  return contentType.split(";")[0].trim().toLowerCase() === "application/json";
}

export function trustedOrigin(request: Request): string {
  const canonical = canonicalOrigin();

  let origin: string;
  try {
    origin = new URL(request.url).origin;
  } catch {
    return canonical;
  }

  if (origin === canonical) return origin;

  try {
    const host = new URL(origin).hostname;
    if (host.endsWith(".vercel.app")) return origin;
  } catch {
    return canonical;
  }

  return canonical;
}
