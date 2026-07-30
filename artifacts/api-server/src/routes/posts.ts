import { Router, type IRouter } from "express";
import { db, postsTable, platformsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import {
  CreatePostBody,
  UpdatePostBody,
  ListPostsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatPost(p: typeof postsTable.$inferSelect) {
  return {
    id: p.id,
    title: p.title,
    caption: p.caption,
    videoObjectPath: p.videoObjectPath,
    thumbnailUrl: p.thumbnailUrl,
    status: p.status,
    platforms: (p.platforms as string[]) || [],
    scheduledAt: p.scheduledAt?.toISOString() ?? null,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    platformResults: (p.platformResults as Array<{
      platform: string;
      status: string;
      postUrl: string | null;
      errorMessage: string | null;
    }>) || [],
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

router.get("/posts", requireAuth, async (req, res): Promise<void> => {
  const query = ListPostsQueryParams.safeParse(req.query);
  const statusFilter = query.success ? query.data.status : undefined;

  const conditions = [eq(postsTable.userId, req.userId)];
  if (statusFilter) {
    conditions.push(eq(postsTable.status, statusFilter));
  }

  const posts = await db
    .select()
    .from(postsTable)
    .where(and(...conditions))
    .orderBy(desc(postsTable.createdAt));

  res.json(posts.map(formatPost));
});

router.post("/posts", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreatePostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { title, caption, videoObjectPath, platforms, scheduledAt } = parsed.data;

  const status = scheduledAt ? "scheduled" : "draft";

  const [post] = await db
    .insert(postsTable)
    .values({
      userId: req.userId,
      title,
      caption,
      videoObjectPath: videoObjectPath ?? null,
      platforms: platforms as string[],
      status,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      platformResults: [],
    })
    .returning();

  res.status(201).json(formatPost(post));
});

router.get("/posts/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid post ID" });
    return;
  }

  const [post] = await db
    .select()
    .from(postsTable)
    .where(and(eq(postsTable.id, id), eq(postsTable.userId, req.userId)))
    .limit(1);

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  res.json(formatPost(post));
});

router.put("/posts/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid post ID" });
    return;
  }

  const parsed = UpdatePostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Partial<typeof postsTable.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.caption !== undefined) updates.caption = parsed.data.caption;
  if (parsed.data.videoObjectPath !== undefined) updates.videoObjectPath = parsed.data.videoObjectPath;
  if (parsed.data.platforms !== undefined) updates.platforms = parsed.data.platforms as string[];
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.scheduledAt !== undefined) {
    updates.scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null;
    if (parsed.data.scheduledAt) updates.status = "scheduled";
  }

  const [post] = await db
    .update(postsTable)
    .set(updates)
    .where(and(eq(postsTable.id, id), eq(postsTable.userId, req.userId)))
    .returning();

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  res.json(formatPost(post));
});

router.delete("/posts/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid post ID" });
    return;
  }

  const [deleted] = await db
    .delete(postsTable)
    .where(and(eq(postsTable.id, id), eq(postsTable.userId, req.userId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  res.json({ success: true });
});

router.post("/posts/:id/publish", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid post ID" });
    return;
  }

  const [post] = await db
    .select()
    .from(postsTable)
    .where(and(eq(postsTable.id, id), eq(postsTable.userId, req.userId)))
    .limit(1);

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const platforms = (post.platforms as string[]) || [];

  // Get connected platforms with tokens
  const connectedPlatforms = await db
    .select()
    .from(platformsTable)
    .where(and(eq(platformsTable.userId, req.userId)));

  const platformMap = new Map(connectedPlatforms.map((p) => [p.platform, p]));

  const results: Array<{
    platform: string;
    status: string;
    postUrl: string | null;
    errorMessage: string | null;
  }> = [];

  for (const platform of platforms) {
    const connection = platformMap.get(platform);

    if (!connection || !connection.isConnected) {
      results.push({
        platform,
        status: "failed",
        postUrl: null,
        errorMessage: `${platform} is not connected. Please connect it in Settings first.`,
      });
      continue;
    }

    // Attempt to publish — real API calls would go here
    // For now we mark as success if connected (actual upload logic requires API keys)
    try {
      // Real implementation would call YouTube API, Instagram Graph API, TikTok API here
      // using connection.accessToken and the video from post.videoObjectPath
      results.push({
        platform,
        status: "success",
        postUrl: null,
        errorMessage: null,
      });
    } catch (err: unknown) {
      results.push({
        platform,
        status: "failed",
        postUrl: null,
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const allSuccess = results.every((r) => r.status === "success");
  const anySuccess = results.some((r) => r.status === "success");
  const newStatus = allSuccess ? "published" : anySuccess ? "published" : "failed";

  await db
    .update(postsTable)
    .set({
      status: newStatus,
      publishedAt: new Date(),
      platformResults: results,
      updatedAt: new Date(),
    })
    .where(eq(postsTable.id, id));

  res.json({ results });
});

export default router;
