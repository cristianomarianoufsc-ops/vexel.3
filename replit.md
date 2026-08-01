# VexelHub

Hub de publicação de vídeos curtos para YouTube Shorts, Instagram Reels e TikTok.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required backend env includes database, Clerk, YouTube, Instagram and Supabase settings. Never commit their values.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/vexelhub` — React/Vite frontend.
- `artifacts/api-server` — Express API and platform integrations.
- `lib/db/src/schema` — Drizzle database schema.
- `lib/api-zod` — shared API validation/contracts.
- `PROJECT_HANDOFF.md` — detailed project status, architecture, deployment notes and next steps.

## Architecture decisions

- Frontend stays on Vercel and the API stays on Fly at `https://vexelhub-api.fly.dev`.
- Clerk `userId` is the tenant boundary for posts, assets and social-platform connections.
- Supabase signed video URLs are required when Instagram or another external platform must fetch a video.
- YouTube and Instagram OAuth connections are stored per authenticated user.
- TikTok has initial OAuth scaffolding but no real publishing flow yet.

## Product

Users authenticate with Clerk, upload short videos, write captions, choose platforms, publish, and view per-platform results. YouTube Shorts and Instagram Reels are implemented; TikTok is the next integration.

## User preferences

- Preserve the current Vercel/Fly/Clerk/Neon/Supabase architecture unless explicitly asked to migrate it.
- Keep platform credentials in secure environment secrets, never in Git or chat.

## Gotchas

- Use pnpm, not npm or yarn.
- Build the API before deploying and prefer `flyctl deploy ... --local-only .` if the Fly remote builder returns registry `401`.
- Do not restore the old global Instagram-token bootstrap; new users must connect their own Instagram account.
- Read `PROJECT_HANDOFF.md` before continuing platform integration work.

## Pointers

- See `PROJECT_HANDOFF.md` for the complete handoff.
- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
