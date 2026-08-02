---
name: Vercel repository link
description: The Vercel project can be linked to a different GitHub repository than the workspace origin.
---

The Vercel project `vexel-2` was linked to a similarly named but different GitHub repository, so pushes to the workspace's `vexel.3` repository did not trigger automatic deployments. A production deployment can be created explicitly from the correct GitHub commit while preserving the existing Vercel project and domain.

**Why:** A repository-name mismatch can look like a failed Vercel webhook even when GitHub pushes and merges succeed.

**How to apply:** When a merged `main` commit produces no Vercel deployment, compare the Vercel project's Git link repository and commit metadata with `git remote -v` before changing code or build settings.