import { Router, type IRouter } from "express";
import { db, ideasTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { CreateIdeaBody, UpdateIdeaBody } from "@workspace/api-zod";

const router: IRouter = Router();

function formatIdea(i: typeof ideasTable.$inferSelect) {
  return {
    id: i.id,
    title: i.title,
    description: i.description,
    tags: (i.tags as string[]) || [],
    createdAt: i.createdAt.toISOString(),
  };
}

router.get("/ideas", requireAuth, async (req, res): Promise<void> => {
  const ideas = await db
    .select()
    .from(ideasTable)
    .where(eq(ideasTable.userId, req.userId))
    .orderBy(desc(ideasTable.createdAt));

  res.json(ideas.map(formatIdea));
});

router.post("/ideas", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateIdeaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [idea] = await db
    .insert(ideasTable)
    .values({
      userId: req.userId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      tags: (parsed.data.tags as string[]) || [],
    })
    .returning();

  res.status(201).json(formatIdea(idea));
});

router.put("/ideas/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid idea ID" });
    return;
  }

  const parsed = UpdateIdeaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Partial<typeof ideasTable.$inferInsert> = { updatedAt: new Date() };
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description ?? null;
  if (parsed.data.tags !== undefined) updates.tags = parsed.data.tags as string[];

  const [idea] = await db
    .update(ideasTable)
    .set(updates)
    .where(and(eq(ideasTable.id, id), eq(ideasTable.userId, req.userId)))
    .returning();

  if (!idea) {
    res.status(404).json({ error: "Idea not found" });
    return;
  }

  res.json(formatIdea(idea));
});

router.delete("/ideas/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid idea ID" });
    return;
  }

  const [deleted] = await db
    .delete(ideasTable)
    .where(and(eq(ideasTable.id, id), eq(ideasTable.userId, req.userId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Idea not found" });
    return;
  }

  res.json({ success: true });
});

export default router;
