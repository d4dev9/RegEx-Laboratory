import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { REFRESH_COOKIE, SESSION_COOKIE } from "@/lib/auth/cookies";
import { refreshIfExpired } from "@/lib/auth/session";
import {
  AuthError,
  currentUser,
  oauthUrl,
  revokeSession,
  type OAuthProvider,
} from "@/lib/auth/supabase";
import { trustedOrigin } from "@/lib/auth/origin";
import { BodyTooLargeError, readJsonBody } from "@/lib/request-body";

export const dynamic = "force-dynamic";

interface Body {
  action?: "oauth";
  provider?: string;
}

function statusFor(error: AuthError): number {
  if (error.status === 429) return 429;
  if (error.status === 0 || error.status >= 500) return 502;
  return 400;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await readJsonBody(request)) as Body;
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return NextResponse.json(
        { error: "Cuerpo de la petición demasiado grande" },
        { status: 413 }
      );
    }
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  try {
    if (body.action === "oauth") {
      const provider = body.provider as OAuthProvider;
      if (provider !== "google" && provider !== "github") {
        return NextResponse.json(
          { error: "Proveedor no admitido." },
          { status: 400 }
        );
      }
      const origin = trustedOrigin(request);
      return NextResponse.json({
        url: oauthUrl(provider, `${origin}/auth/callback`),
      });
    }

    return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: statusFor(e) }
      );
    }
    return NextResponse.json(
      { error: "No se pudo iniciar sesión." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  store.delete(SESSION_COOKIE);
  store.delete(REFRESH_COOKIE);

  if (token) {
    try {
      await revokeSession(token);
    } catch (error) {

      console.error("[api] no se pudo revocar la sesión:", error);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ user: null });

  const user = await currentUser(token);
  if (user) return NextResponse.json({ user });

  const refreshed = await refreshIfExpired();
  return NextResponse.json({ user: refreshed });
}
