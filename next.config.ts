import type { NextConfig } from "next";

/**
 * Content Security Policy.
 *
 * `connect-src` is `'self'` alone, and that is worth stating because it is not
 * the obvious answer: the browser never contacts the auth service. Signing in,
 * sending the code and exchanging the OAuth code all go through this origin
 * (`/api/auth`, `/auth/callback`), and it is the server that talks to Supabase.
 * So no Supabase host needs to be reachable from a script here. The full page
 * navigation to the provider's consent screen is not a fetch and is not covered
 * by any of these directives.
 *
 * The providers appear in `frame-src` only so the flow keeps working if one of
 * them ever switches back to rendering its consent screen in a popup.
 *
 * `'unsafe-inline'` in script-src is required by Next.js, which inlines the
 * flight payload and the hydration bootstrap. It is not avoidable without
 * nonce-based CSP (see the README). `style-src` needs it for Tailwind's
 * runtime-injected styles.
 */
const csp = [
  "default-src 'self'",
  // 'unsafe-eval' is required in development by React Refresh and the Next.js
  // dev overlay. It is never needed for the production build.
  ...(process.env.NODE_ENV === "development"
    ? [`script-src 'self' 'unsafe-inline' 'unsafe-eval'`]
    : [`script-src 'self' 'unsafe-inline'`]),
  "style-src 'self' 'unsafe-inline'",
  /*
   * Images.
   *
   * `data:` and `blob:` cover the app's own artwork. The two provider hosts are
   * here because the account avatar is the provider's picture, served from its CDN
   * and not from this origin: Google from `lh3.googleusercontent.com` and GitHub
   * from `avatars.githubusercontent.com`.
   *
   * Both are listed by exact host and not as a wildcard. A wildcard in `img-src`
   * is a hole in the policy that says "this page may load images from anywhere",
   * which is a large part of what `img-src 'self'` was doing for us.
   *
   * Nothing else is reachable: there is no user-supplied image URL anywhere in the
   * app, and a pattern is text.
   */
  "img-src 'self' data: blob: https://lh3.googleusercontent.com https://avatars.githubusercontent.com",
  "font-src 'self' data:",
  // Only this origin. The access token never leaves the server, and the browser
  // never holds a Supabase key, so there is nothing to connect to out there.
  "connect-src 'self'",
  "frame-src 'self' https://accounts.google.com https://github.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Content-Security-Policy", value: csp },
          {
            key: "Permissions-Policy",
            // The app needs no camera, microphone, geolocation or payment API.
            value: "camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()",
          },
        ],
      },
      {
        // Health checks must never be cached by an intermediary.
        source: "/api/health",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
