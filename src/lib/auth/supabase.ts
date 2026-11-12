const URL_BASE = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;

export interface AuthUser {
  id: string;
  email: string;

  alias: string;

  avatarUrl?: string;

  provider?: OAuthProvider;

  createdAt?: string;

  lastSignInAt?: string;
}

export type OAuthProvider = "google" | "github";

export class AuthError extends Error {
  constructor(
    message: string,
    readonly code: string,

    readonly status: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}

function requireConfig(): { url: string; key: string } {
  if (!URL_BASE || !ANON_KEY) {
    throw new AuthError(
      "Supabase no está configurado: faltan SUPABASE_URL o SUPABASE_ANON_KEY.",
      "not_configured",
      0
    );
  }
  return { url: URL_BASE.replace(/\/+$/, ""), key: ANON_KEY };
}

interface SessionIdentity {
  id?: string;
  user_id?: string;
  provider?: string;
  identity_data?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_sign_in_at?: string | null;
}

export interface SessionUser {
  id: string;
  email?: string | null;

  created_at?: string | null;

  last_sign_in_at?: string | null;
  user_metadata?: Record<string, unknown> | null;

  identities?: SessionIdentity[] | null;

  app_metadata?: { provider?: string; providers?: string[] } | null;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

export async function refreshSession(
  refreshToken: string
): Promise<TokenResponse> {
  const { url, key } = requireConfig();
  const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {

    throw new AuthError(
      "La sesión ha caducado.",
      response.status === 400 || response.status === 401
        ? "refresh_invalid"
        : `refresh_failed_${response.status}`,
      response.status
    );
  }

  return (await response.json()) as TokenResponse;
}

async function authFetch<T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string
): Promise<T> {
  const { url, key } = requireConfig();

  const response = await fetch(`${url}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: key,
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {

    payload = null;
  }

  if (!response.ok) {
    const body = payload as
      | { error_description?: string; msg?: string; message?: string; error_code?: string }
      | null;

    const status = response.status;
    const message =
      body?.error_description ??
      body?.msg ??
      body?.message ??
      (status === 429
        ? "Demasiados intentos. Espera antes de volver a intentarlo."
        : status === 403
          ? "Ese código no es correcto o ha caducado."
          : `Error ${status}`);
    throw new AuthError(message, body?.error_code ?? String(status), status);
  }

  return payload as T;
}

export function oauthUrl(provider: OAuthProvider, redirectTo: string): string {
  const { url, key } = requireConfig();
  const params = new URLSearchParams({
    provider,
    redirect_to: redirectTo,
    "x-redirect-to": redirectTo,
  });
  return `${url}/auth/v1/authorize?${params.toString()}&apikey=${encodeURIComponent(key)}`;
}

export async function exchangeCodeForSession(
  code: string,
  codeVerifier: string
): Promise<TokenResponse> {
  const { url, key } = requireConfig();
  const response = await fetch(`${url}/auth/v1/token?grant_type=pkce`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ auth_code: code, code_verifier: codeVerifier }),
  });

  const text = await response.text();
  if (!response.ok) {
    let message = `Error ${response.status}`;
    try {
      const body = JSON.parse(text) as {
        error_description?: string;
        error?: string;
        msg?: string;
      };

      message = body.error_description ?? body.msg ?? body.error ?? message;
    } catch {

    }
    throw new AuthError(message, "oauth_exchange", response.status);
  }

  return JSON.parse(text) as TokenResponse;
}

export async function deleteAuthIdentity(userId: string): Promise<void> {
  const { url } = requireConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new AuthError(
      "Falta SUPABASE_SERVICE_ROLE_KEY: no se puede borrar la identidad.",
      "service_key_missing",
      500
    );
  }

  const response = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });

  if (!response.ok && response.status !== 404) {
    throw new AuthError(
      `No se pudo borrar la identidad (${response.status}).`,
      "identity_delete_failed",
      response.status
    );
  }
}

export async function revokeSession(accessToken: string): Promise<void> {
  const { url, key } = requireConfig();

  const response = await fetch(`${url}/auth/v1/logout`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok && response.status !== 401 && response.status !== 404) {
    throw new AuthError(
      `No se pudo revocar la sesión (${response.status}).`,
      "session_revoke_failed",
      response.status
    );
  }
}

export async function currentUser(accessToken: string): Promise<AuthUser | null> {
  try {

    const user = await authFetch<SessionUser>("/user", {}, accessToken);

    return toAuthUser(user, accessToken);
  } catch {

    return null;
  }
}

function isOAuthProvider(value: unknown): value is OAuthProvider {
  return value === "google" || value === "github";
}

function tokenProvider(accessToken: string | undefined): OAuthProvider | undefined {
  const segment = accessToken?.split(".")[1];
  if (!segment) return undefined;

  let claims: { amr?: { provider?: string }[]; identity?: string };
  try {
    claims = JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
  } catch {

    return undefined;
  }

  const fromAmr = claims.amr?.map((m) => m.provider).find(isOAuthProvider);
  if (fromAmr) return fromAmr;
  return isOAuthProvider(claims.identity) ? claims.identity : undefined;
}

function mostRecentIdentity(
  identities: SessionIdentity[]
): SessionIdentity | undefined {
  return [...identities]
    .filter((identity) => identity.provider)
    .sort(
      (a, b) =>
        Date.parse(b.updated_at ?? b.last_sign_in_at ?? b.created_at ?? "") -
        Date.parse(a.updated_at ?? a.last_sign_in_at ?? a.created_at ?? "")
    )[0];
}

function resolveProvider(
  user: SessionUser,
  accessToken: string | undefined
): { provider?: OAuthProvider; identity?: SessionIdentity } {
  const identities = (user.identities ?? []).filter((i) => isOAuthProvider(i.provider));
  const find = (name: OAuthProvider) =>
    identities.find((i) => i.provider === name);

  const fromToken = tokenProvider(accessToken);
  if (fromToken) {
    return { provider: fromToken, identity: find(fromToken) };
  }

  const recent = mostRecentIdentity(identities);
  if (isOAuthProvider(recent?.provider)) {
    return { provider: recent.provider, identity: recent };
  }

  const declared = user.app_metadata?.provider;
  if (isOAuthProvider(declared)) {
    return { provider: declared, identity: find(declared) };
  }

  const first = user.app_metadata?.providers?.find(isOAuthProvider);
  return first ? { provider: first, identity: find(first) } : {};
}

function safePictureUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;

  return value.startsWith("https://") || value.startsWith("data:image/")
    ? value
    : undefined;
}

export function toAuthUser(user: SessionUser, accessToken?: string): AuthUser {
  const metadata = user.user_metadata ?? {};
  const alias =
    (typeof metadata.preferred_username === "string" && metadata.preferred_username) ||
    (typeof metadata.user_name === "string" && metadata.user_name) ||
    (typeof metadata.full_name === "string" && metadata.full_name) ||
    (typeof metadata.name === "string" && metadata.name) ||
    (user.email ?? "").split("@")[0] ||
    "usuario";

  const { provider, identity } = resolveProvider(user, accessToken);

  const identityData = identity?.identity_data ?? {};
  const picture =
    safePictureUrl(
      (typeof identityData.picture === "string" && identityData.picture) ||
        (typeof identityData.avatar_url === "string" && identityData.avatar_url) ||
        undefined
    ) ??
    safePictureUrl(
      (typeof metadata.picture === "string" && metadata.picture) ||
        (typeof metadata.avatar_url === "string" && metadata.avatar_url) ||
        undefined
    );

  return {
    id: user.id,
    email: user.email ?? "",
    alias,
    ...(picture ? { avatarUrl: picture } : {}),
    ...(provider ? { provider } : {}),
    ...(user.created_at ? { createdAt: user.created_at } : {}),
    ...(user.last_sign_in_at ? { lastSignInAt: user.last_sign_in_at } : {}),
  };
}
