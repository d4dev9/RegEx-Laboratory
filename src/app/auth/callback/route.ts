import { NextResponse } from "next/server";

import {
  REFRESH_COOKIE,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth/cookies";
import { AuthError, exchangeCodeForSession } from "@/lib/auth/supabase";
import { hasJsonContentType, isAllowedOrigin } from "@/lib/auth/origin";
import { BodyTooLargeError, readJsonBody } from "@/lib/request-body";

export const dynamic = "force-dynamic";

const DEFAULT_DESTINATION = "/lab";

function safeDestination(next: string | null): string {
  if (!next) return DEFAULT_DESTINATION;
  if (!next.startsWith("/")) return DEFAULT_DESTINATION;
  if (next.startsWith("//")) return DEFAULT_DESTINATION;
  if (next.includes("\\")) return DEFAULT_DESTINATION;
  if (/[\u0000-\u001f\u007f]/.test(next)) return DEFAULT_DESTINATION;
  return next;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";

  if (!code) {
    const error = url.searchParams.get("error");
    const failed = new URL("/signin", url.origin);
    if (error) failed.searchParams.set("error", "oauth");
    return NextResponse.redirect(failed);
  }

  const destination = safeDestination(url.searchParams.get("next"));

  const target = new URL(destination, url.origin);
  target.searchParams.set("exchange", "1");
  target.hash = new URLSearchParams({
    code,
    ...(state ? { state } : {}),
  }).toString();

  return NextResponse.redirect(target);
}

export async function POST(request: Request) {
  if (!hasJsonContentType(request)) {
    return NextResponse.json(
      { error: "Se esperaba un cuerpo JSON." },
      { status: 415 }
    );
  }

  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }

  let body: { code?: string; code_verifier?: string };
  try {
    body = (await readJsonBody(request)) as {
      code?: string;
      code_verifier?: string;
    };
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return NextResponse.json(
        { error: "Cuerpo de la petición demasiado grande" },
        { status: 413 }
      );
    }
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  if (!body.code || !body.code_verifier) {
    return NextResponse.json(
      { error: "Faltan el código o el verificador." },
      { status: 400 }
    );
  }

  try {
    const tokens = await exchangeCodeForSession(body.code, body.code_verifier);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, tokens.access_token, SESSION_COOKIE_OPTIONS);
    response.cookies.set(REFRESH_COOKIE, tokens.refresh_token, SESSION_COOKIE_OPTIONS);
    return response;
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "No se pudo completar el inicio de sesión." },
      { status: 500 }
    );
  }
}
