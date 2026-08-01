---
name: Fly monorepo runtime dependencies
description: Runtime packaging constraint for the VexelHub API deployed from the pnpm monorepo
---

## Rule
When deploying `artifacts/api-server` from the pnpm monorepo to Fly, the final image must contain the API workspace's production dependency tree. Copying only the root `node_modules` is insufficient because pnpm keeps workspace dependency links under the API package.

**Why:** The local build can succeed while the Fly container fails at startup with `ERR_MODULE_NOT_FOUND` for externalized packages such as Google Cloud Storage, Clerk, or Supabase.

**How to apply:** Build the API, run the pnpm workspace production deploy with legacy mode when using pnpm 10, and copy that output into the runtime image. Validate imports inside the final container before deploying.