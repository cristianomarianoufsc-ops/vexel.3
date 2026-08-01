---
name: Clerk proxy on Replit dev
description: How to configure Clerk in the VexelHub frontend for Replit dev vs production
---

## Rule
In `artifacts/vexelhub/src/App.tsx`, do NOT use `publishableKeyFromHost` or `proxyUrl` when running on Replit dev. Use `import.meta.env.VITE_CLERK_PUBLISHABLE_KEY` directly.

**Why:** `publishableKeyFromHost(window.location.hostname, ...)` detects the Replit dev domain and infers a clerk subdomain proxy URL (`clerk.{replit-dev-domain}`) that doesn't exist, causing Clerk JS to fail to load. The `clerkProxyMiddleware` in the API server is also a no-op in dev (`NODE_ENV !== 'production'`).

**How to apply:** For dev, skip `publishableKeyFromHost` and remove `proxyUrl={clerkProxyUrl}` from `<ClerkProvider>`. The proxy path `/api/__clerk` and middleware in `artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts` are only active in production builds.
