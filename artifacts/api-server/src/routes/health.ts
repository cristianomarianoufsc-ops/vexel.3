import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

import { isSupabaseStorageAvailable } from "../lib/supabaseStorage";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/diagnostics", async (_req, res) => {
  let supabaseTestError: string | null = null;
  let supabaseTestCause: string | null = null;
  let supabaseHost: string | null = null;
  let supabaseTestSuccess = false;
  try {
    if (process.env.SUPABASE_URL) {
      try {
        supabaseHost = new URL(process.env.SUPABASE_URL).host;
      } catch {
        supabaseHost = "invalid-url";
      }
    }
    const { getSupabaseUploadUrl } = await import("../lib/supabaseStorage");
    await getSupabaseUploadUrl("test-probe.mp4", "video/mp4");
    supabaseTestSuccess = true;
  } catch (err: any) {
    supabaseTestError = err?.message || String(err);
    if (err?.cause) {
      try {
        supabaseTestCause = JSON.stringify(err.cause, Object.getOwnPropertyNames(err.cause));
      } catch {
        supabaseTestCause = String(err.cause);
      }
    }
  }

  res.json({
    supabaseConfigured: isSupabaseStorageAvailable(),
    hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
    supabaseHost,
    hasSupabaseKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    bucket: process.env.SUPABASE_STORAGE_BUCKET || "videos",
    supabaseTestSuccess,
    supabaseTestError,
    supabaseTestCause,
  });
});

export default router;
