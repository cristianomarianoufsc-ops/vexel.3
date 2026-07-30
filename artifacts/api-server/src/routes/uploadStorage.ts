import { Router, type IRouter } from "express";
import { db, assetsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { RequestUploadUrlBody } from "@workspace/api-zod";
import {
  getUploadUrl,
  downloadObject,
  isUsingSupabaseStorage,
} from "../lib/storageProvider";

const router: IRouter = Router();

router.post("/storage/uploads/request-url", requireAuth, async (req, res): Promise<void> => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, size, contentType } = parsed.data;

  const { uploadURL, objectPath, publicURL } = await getUploadUrl(name, contentType);

  // Register asset in DB after upload intent
  await db.insert(assetsTable).values({
    userId: req.userId,
    name,
    objectPath,
    publicUrl: publicURL,
    mimeType: contentType,
    size,
  });

  res.json({ uploadURL, objectPath, publicURL });
});

// Serve stored objects (works for both Replit Object Storage and Supabase Storage)
router.get("/storage/objects/{*objectPath}", requireAuth, async (req, res): Promise<void> => {
  const rawPath = (req.params as Record<string, string>)["objectPath"];
  const objectPath = rawPath.startsWith("supabase/")
    ? `/${rawPath}`
    : `/objects/${rawPath}`;

  try {
    const { buffer, contentType } = await downloadObject(objectPath);
    res.setHeader("Content-Type", contentType || "application/octet-stream");
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(buffer);
  } catch {
    res.status(404).json({ error: "Object not found" });
  }
});

export default router;
