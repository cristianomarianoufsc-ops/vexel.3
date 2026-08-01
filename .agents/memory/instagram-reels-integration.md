---
name: Instagram Reels integration
description: Meta Instagram Login setup, token roles, and production publishing constraints for VexelHub.
---

The Instagram Login flow uses the access token generated for the professional account separately from the Meta app secret. The token belongs in `INSTAGRAM_ACCESS_TOKEN`; the app secret is only used for OAuth token exchange and long-lived token handling. The production app now stores Instagram connections per authenticated VexelHub user; the server does not bootstrap a global token into new users.

**Why:** Meta's dashboard presents both values near the same setup, and treating them as interchangeable causes authorization failures.

**How to apply:** Never ask for either value in chat or screenshots. Use the secure secrets flow. Existing authorized users keep their database connection, while new users must complete Instagram OAuth themselves.

Instagram Reels publishing requires Meta to fetch the video from a publicly reachable URL. Supabase Storage signed URLs are used for this; private Replit object URLs and development domains are not suitable for Meta's media fetch.

**Why:** The Instagram API creates a media container from `video_url`, so the source must be reachable by Meta rather than only by the authenticated VexelHub session.

**How to apply:** Preserve Supabase storage configuration when changing the publishing flow, and verify the signed URL is generated before creating a Reel container.

Fly deploys for this API may fail through the remote builder with a registry 401 even after registry authentication. The local Docker builder path can successfully push and deploy the image.

**Why:** The failure is in the remote build/registry path, not in the application image or Instagram integration.

**How to apply:** When the remote deploy returns registry 401, authenticate the Fly Docker registry and retry with the local-only deploy path before changing application code.