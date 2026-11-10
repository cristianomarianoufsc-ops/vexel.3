import express, { Router, type IRouter } from "express";
import fs from "fs/promises";
import path from "path";
import { db, assetsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { RequestUploadUrlBody } from "@workspace/api-zod";
import {
  getUploadUrl,
  downloadObject,
  getLocalStorageDir,
  LOCAL_PUBLIC_STORAGE_DIR,
} from "../lib/storageProvider";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/storage/uploads/request-url", requireAuth, async (req, res): Promise<void> => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const { name, size, contentType } = parsed.data;
    const { uploadURL, objectPath, publicURL } = await getUploadUrl(name, contentType);

    try {
      await db.insert(assetsTable).values({
        userId: req.userId,
        name,
        objectPath,
        publicUrl: publicURL,
        mimeType: contentType,
        size,
      });
    } catch (dbErr) {
      logger.warn({ err: dbErr }, "Non-fatal error recording asset row during upload URL request");
    }

    res.json({ uploadURL, objectPath, publicURL });
  } catch (error) {
    logger.error({ err: error }, "Failed to generate upload URL");
    res.status(500).json({
      error: error instanceof Error ? error.message : "Falha ao gerar URL de upload",
    });
  }
});

router.put(
  "/storage/direct-upload/:key",
  express.raw({ type: "*/*", limit: "500mb" }),
  async (req, res): Promise<void> => {
    try {
      const rawKey = Array.isArray(req.params.key) ? req.params.key[0] : req.params.key;
      const safeKey = path.basename(decodeURIComponent(rawKey || ""));
      if (!safeKey) {
        res.status(400).json({ error: "Invalid upload key" });
        return;
      }

      const storageDir = getLocalStorageDir();
      await fs.mkdir(storageDir, { recursive: true });
      const filePath = path.join(storageDir, safeKey);
      const bodyBuffer = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(req.body || "");

      await fs.writeFile(filePath, bodyBuffer);
      const contentType = req.headers["content-type"] || "video/mp4";
      await fs.writeFile(
        `${filePath}.meta.json`,
        JSON.stringify({ contentType, size: bodyBuffer.length }),
        "utf8",
      );

      res.status(200).json({ ok: true });
    } catch (error) {
      logger.error({ err: error }, "Direct upload failed");
      res.status(500).json({ error: "Falha ao salvar arquivo enviado" });
    }
  },
);

router.get("/storage/public-media/:key", async (req, res): Promise<void> => {
  try {
    const rawKey = Array.isArray(req.params.key) ? req.params.key[0] : req.params.key;
    const safeKey = path.basename(decodeURIComponent(rawKey || ""));
    const storageDir = getLocalStorageDir();
    const filePath = path.join(storageDir, safeKey);
    const metaPath = `${filePath}.meta.json`;

    await fs.access(filePath);
    let contentType = "video/mp4";
    try {
      const meta = JSON.parse(await fs.readFile(metaPath, "utf8")) as { contentType?: string };
      if (meta.contentType) contentType = meta.contentType;
    } catch {
      if (safeKey.endsWith(".jpg") || safeKey.endsWith(".jpeg")) contentType = "image/jpeg";
      else if (safeKey.endsWith(".png")) contentType = "image/png";
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.sendFile(filePath);
  } catch {
    res.status(404).json({ error: "Media not found" });
  }
});

// Serve stored objects (works for both Replit Object Storage and Supabase Storage)
router.get("/storage/objects/{*objectPath}", requireAuth, async (req, res): Promise<void> => {
  const rawPath = (req.params as Record<string, string>)["objectPath"];
  const objectPath = rawPath.startsWith("supabase/")
    ? `/${rawPath}`
    : rawPath.startsWith("local-public/")
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
