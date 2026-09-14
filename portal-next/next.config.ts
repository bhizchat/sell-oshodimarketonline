import type { NextConfig } from "next";

// The Supabase session (and any other auth state) lives in a cookie that
// client-side JS can read, because the Supabase browser SDK needs that
// access to attach the token to its own requests. That means the real
// protection against session theft via XSS is stopping injected/foreign
// scripts from running in the first place — this policy only allows
// scripts from our own origin and Paystack's checkout script.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' https://js.paystack.co",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://*.paystack.co",
  "frame-src https://*.paystack.co",
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
