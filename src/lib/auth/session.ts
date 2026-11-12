import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import {
  REFRESH_COOKIE,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth/cookies";
import { currentUser, refreshSession, type AuthUser } from "@/lib/auth/supabase";

export async function sessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function getUser() {
  const token = await sessionToken();
  if (!token) return null;
  return currentUser(token);
}

const refreshesInFlight = new Map<
  string,
  Promise<{ access_token: string; refresh_token: string } | null>
>();

export async function refreshIfExpired(): Promise<AuthUser | null> {
  const store = await cookies();
  const refresh = store.get(REFRESH_COOKIE)?.value;
  if (!refresh) return null;

  let exchange = refreshesInFlight.get(refresh);
  if (!exchange) {
    exchange = refreshSession(refresh).catch(() => null);
    refreshesInFlight.set(refresh, exchange);
    void exchange.finally(() => refreshesInFlight.delete(refresh));
  }

  const tokens = await exchange;
  if (!tokens) return null;

  store.set(SESSION_COOKIE, tokens.access_token, SESSION_COOKIE_OPTIONS);
  store.set(REFRESH_COOKIE, tokens.refresh_token, SESSION_COOKIE_OPTIONS);

  return currentUser(tokens.access_token);
}

export async function getDbUser() {
  const authUser = (await getUser()) ?? (await refreshIfExpired());
  if (!authUser) return null;

  return prisma.user.upsert({
    where: { authId: authUser.id },
    update: { email: authUser.email },
    create: { authId: authUser.id, email: authUser.email, name: authUser.alias },
  });
}

export async function requireUser(returnTo?: string): Promise<string> {
  const user = await getUser();
  if (!user) {
    redirect(`/signin${returnTo ? `?next=${encodeURIComponent(returnTo)}` : ""}`);
  }
  return user.id;
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(REFRESH_COOKIE);
}
