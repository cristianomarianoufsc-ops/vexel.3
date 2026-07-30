# VexelHub

VexelHub is a cross-platform social media publishing app: upload a short-form video, add a caption, and publish to YouTube, Instagram, and TikTok at once.

## Run & Operate

### Local development (Replit)

- `pnpm install` — install dependencies.
- `pnpm run typecheck` — full TypeScript check across all packages.
- `pnpm run build` — typecheck + build all packages.
- `pnpm --filter @workspace/api-server run dev` — run the API server.
- `pnpm --filter @workspace/vexelhub run dev` — run the web app.
- Required env: `NEON_DATABASE_URL` (or `DATABASE_URL`), `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.

### Deploy to Vercel + Fly.io

1. **Set up the database** on Neon and run `pnpm --filter @workspace/db run push` (with `NEON_DATABASE_URL` set).
2. **Create a Supabase Storage bucket** named `videos` (or set `SUPABASE_STORAGE_BUCKET`) and make it public.
3. **Set environment variables** in `.env` (see `.env.example`):
   - `VITE_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` from Clerk.
   - `NEON_DATABASE_URL` from Neon.
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` from Supabase.
   - `USE_SUPABASE_STORAGE=true` when not running on Replit.
4. **Deploy the backend to Fly.io**:
   - Update `artifacts/api-server/fly.toml` with your app name.
   - `cd artifacts/api-server && fly launch --name your-app-name` (or `fly deploy`).
   - Set secrets: `fly secrets set NEON_DATABASE_URL=... CLERK_SECRET_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...`.
5. **Deploy the frontend to Vercel**:
   - Update `vercel.json` rewrite destination to `https://YOUR_FLY_APP_NAME.fly.dev/api/:path*`.
   - Set `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_API_BASE_URL=https://YOUR_FLY_APP_NAME.fly.dev` in Vercel project settings.
   - Push the repo and import it on Vercel.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19, Vite, Tailwind CSS, Radix UI, Clerk, Wouter, TanStack Query
- Backend: Express 5, esbuild
- Database: PostgreSQL + Drizzle ORM
- Validation: Zod v4, drizzle-zod
- Storage: Replit Object Storage (dev) or Supabase Storage (production/Vercel)
- Auth: Clerk
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/vexelhub/` — React web app (the main product).
- `artifacts/api-server/` — Express API server.
- `lib/db/` — Drizzle schema and database client.
- `lib/api-spec/` — OpenAPI spec and Orval codegen config.
- `lib/api-zod/` — generated Zod schemas from OpenAPI.
- `lib/api-client-react/` — generated TanStack Query hooks.

## Architecture decisions

- The backend is deployed as a Docker container on Fly.io so it can handle long video uploads without serverless payload/timeout limits.
- Supabase Storage is used as temporary video hosting outside Replit because Replit Object Storage is only available inside the Replit environment.
- The frontend on Vercel rewrites `/api/*` calls to the Fly.io backend, so the generated API client can keep using relative `/api/...` paths.
- Real publishing to YouTube/Instagram/TikTok is still a stub; the routes, schema, and OAuth setup exist, but the actual API calls are not implemented yet.

## Product

Authenticated users can connect their YouTube, Instagram, and TikTok accounts, upload a short-form video, write a caption, and publish (or schedule) the same post across all selected platforms from a single dashboard.

## User preferences

- Communication language: Brazilian Portuguese (pt-BR).
- Preferred deployment target: Vercel frontend + Fly.io backend, with free-tier services (Neon, Supabase Storage, Clerk).

## Gotchas

- The backend throws at startup if `NEON_DATABASE_URL` (or `DATABASE_URL`) is missing. Set it before running.
- `VITE_CLERK_PUBLISHABLE_KEY` is required both for the dev server and the Vercel build.
- The `vercel.json` rewrite destination must be updated to match your Fly.io app URL.
- The Replit Object Storage client only works inside Replit; outside Replit, set `USE_SUPABASE_STORAGE=true`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
- See `.env.example` for the full list of required environment variables.
