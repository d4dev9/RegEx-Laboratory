export const SESSION_COOKIE = "rl-session";

export const REFRESH_COOKIE = "rl-refresh";

export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE,
} as const;
