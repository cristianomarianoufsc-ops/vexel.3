import { Router, type IRouter } from "express";
import { db, assetsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

function formatAsset(a: typeof assetsTable.$inferSelect) {
  return {
    id: a.id,
    name: a.name,
    objectPath: a.objectPath,
    mimeType: a.mimeType,
    size: a.size,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/assets", requireAuth, async (req, res): Promise<void> => {
  const assets = await db
    .select()
    .from(assetsTable)
    .where(eq(assetsTable.userId, req.userId))
    .orderBy(desc(assetsTable.createdAt));

  res.json(assets.map(formatAsset));
});

router.delete("/assets/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid asset ID" });
    return;
  }

  const [deleted] = await db
    .delete(assetsTable)
    .where(and(eq(assetsTable.id, id), eq(assetsTable.userId, req.userId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }

  res.json({ success: true });
});

export default router;
