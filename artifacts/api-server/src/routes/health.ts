import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

import { isSupabaseStorageAvailable } from "../lib/supabaseStorage";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/diagnostics", (_req, res) => {
  res.json({
    supabaseConfigured: isSupabaseStorageAvailable(),
    hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
    hasSupabaseKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    bucket: process.env.SUPABASE_STORAGE_BUCKET || "videos",
  });
});

export default router;
