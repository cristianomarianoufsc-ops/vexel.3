---
name: Clerk API bearer bridge
description: External Clerk sessions may need an explicit bearer token when the frontend is hosted separately from the API.
---

For this VexelHub deployment, web API requests should include the current Clerk session token through the shared API client's auth-token getter, while retaining cookie credentials.

**Why:** The Vercel frontend and Fly API are separate deployments, and production requests were reaching authenticated UI screens but arriving at protected API routes without a session the backend could validate.

**How to apply:** Keep the token getter registered from inside `ClerkProvider` via `useAuth().getToken()`. Do not hardcode tokens or expose secrets; clear the getter when the provider unmounts.