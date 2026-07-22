import { Router, type IRouter } from "express";
import { db, assetsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { ObjectStorageService } from "../lib/objectStorage";
import { RequestUploadUrlBody } from "@workspace/api-zod";

const router: IRouter = Router();
const storageService = new ObjectStorageService();

router.post("/storage/uploads/request-url", requireAuth, async (req, res): Promise<void> => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, size, contentType } = parsed.data;

  const uploadURL = await storageService.getObjectEntityUploadURL();
  // Extract the object path from the signed URL
  const url = new URL(uploadURL);
  const gcsPath = url.pathname; // e.g. /bucket-name/objects/uuid
  const objectPath = storageService.normalizeObjectEntityPath(uploadURL);

  // Register asset in DB after upload intent
  await db.insert(assetsTable).values({
    userId: req.userId,
    name,
    objectPath,
    mimeType: contentType,
    size,
  });

  res.json({ uploadURL, objectPath });
});

// Serve stored objects
router.get("/storage/objects/{*objectPath}", requireAuth, async (req, res): Promise<void> => {
  const objectPath = `/objects/${(req.params as Record<string, string>)["objectPath"]}`;

  try {
    const file = await storageService.getObjectEntityFile(objectPath);
    const response = await storageService.downloadObject(file);

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=3600");

    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  } catch {
    res.status(404).json({ error: "Object not found" });
  }
});

export default router;
