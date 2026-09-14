import type { NextConfig } from "next";

// The Supabase session (and any other auth state) lives in a cookie that
// client-side JS can read, because the Supabase browser SDK needs that
// access to attach the token to its own requests. That means the real
// protection against session theft via XSS is stopping injected/foreign
// SCRIPT FILES from loading in the first place — this policy only allows
// scripts from our own origin and Paystack's checkout script.
//
// 'unsafe-inline' is required for script-src because Next.js injects its
// own inline bootstrap/hydration scripts on every page; without it the
// app fails to hydrate at all (no click handlers ever attach). The
// alternative is a per-request nonce (see Next.js's CSP guide), but that
// forces every page in the app into fully dynamic rendering (no static
// generation/ISR/CDN caching anywhere), which is a bigger tradeoff than
// this app needs. The app never renders raw/attacker-controlled HTML
// (no dangerouslySetInnerHTML), so the realistic inline-injection surface
// this gives up is small, and connect-src still limits any injected
// script to talking only to our own origin, Supabase, and Paystack.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.paystack.co",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  // Paystack's script/API live on the .co domain, but the actual checkout
  // popup it opens (card entry form) is served from checkout.paystack.com
  // — a different TLD, not covered by *.paystack.co. Both connect-src and
  // frame-src need the .com domain too, or the popup iframe gets silently
  // blocked by the browser ("This content is blocked" with no console
  // context beyond the CSP violation).
  "connect-src 'self' https://*.supabase.co https://*.paystack.co https://*.paystack.com",
  "frame-src https://*.paystack.co https://*.paystack.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');


const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Applies to every route.
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
        ],
      },
    ];
  },
};

export default nextConfig;
