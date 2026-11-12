"use client";

import type { AuthUser, OAuthProvider } from "./supabase";

const VERIFIER_KEY = "rl-oauth-verifier";

const NEXT_KEY = "rl-oauth-next";

export class AuthRequestError extends Error {
  constructor(
    message: string,
    readonly code?: string,

    readonly status?: number
  ) {
    super(message);
    this.name = "AuthRequestError";
  }
}

async function post<T>(body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AuthRequestError("No se pudo contactar con el servidor.");
  }

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; code?: string; url?: string }
    | null;

  if (!response.ok) {
    throw new AuthRequestError(
      payload?.error ?? `Error ${response.status}`,
      payload?.code,
      response.status
    );
  }
  return payload as T;
}

export function isRateLimited(e: unknown): boolean {
  return e instanceof AuthRequestError && e.status === 429;
}

export async function fetchSession(): Promise<AuthUser | null> {
  try {
    const response = await fetch("/api/auth", { cache: "no-store" });
    if (!response.ok) return null;
    const payload = (await response.json()) as { user: AuthUser | null };
    return payload.user;
  } catch {
    return null;
  }
}

export async function endSession(): Promise<void> {
  await fetch("/api/auth", { method: "DELETE" });
}

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createPkce(): Promise<{ verifier: string; challenge: string }> {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  return { verifier, challenge: base64url(new Uint8Array(digest)) };
}

export async function startOAuth(provider: OAuthProvider): Promise<void> {
  const { verifier, challenge } = await createPkce();
  sessionStorage.setItem(VERIFIER_KEY, verifier);

  const { url } = await post<{ url: string }>({ action: "oauth", provider });
  const target = new URL(url);

  if (
    target.protocol !== "https:" ||
    !target.pathname.endsWith("/auth/v1/authorize")
  ) {
    throw new Error("El proveedor de autenticación devolvió una URL no válida");
  }

  target.searchParams.set("code_challenge", challenge);
  target.searchParams.set("code_challenge_method", "S256");

  const origin = new URLSearchParams({
    next: `${window.location.pathname}${window.location.search}`,
  }).toString();
  sessionStorage.setItem(NEXT_KEY, origin);

  window.location.href = target.toString();
}

export async function finishOAuth(): Promise<boolean> {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const code = hash.get("code");
  if (!code) return false;

  history.replaceState(null, "", window.location.pathname + window.location.search);

  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  if (!verifier) return false;

  try {
    const response = await fetch("/auth/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, code_verifier: verifier }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function takeReturnPath(): string | null {
  const stored = sessionStorage.getItem(NEXT_KEY);
  if (!stored) return null;
  sessionStorage.removeItem(NEXT_KEY);

  try {
    return new URLSearchParams(stored).get("next");
  } catch {
    return null;
  }
}
