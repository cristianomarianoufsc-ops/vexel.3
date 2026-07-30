import { Router, type IRouter } from "express";
import { db, postsTable, platformsTable, ideasTable, assetsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/stats", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;

  const [posts, platforms, ideas, assets] = await Promise.all([
    db.select().from(postsTable).where(eq(postsTable.userId, userId)),
    db.select().from(platformsTable).where(eq(platformsTable.userId, userId)),
    db.select().from(ideasTable).where(eq(ideasTable.userId, userId)),
    db.select().from(assetsTable).where(eq(assetsTable.userId, userId)),
  ]);

  const totalPosts = posts.length;
  const publishedPosts = posts.filter((p) => p.status === "published").length;
  const scheduledPosts = posts.filter((p) => p.status === "scheduled").length;
  const draftPosts = posts.filter((p) => p.status === "draft").length;
  const connectedPlatforms = platforms.filter((p) => p.isConnected).length;
  const totalAssets = assets.length;
  const totalIdeas = ideas.length;

  const recentPosts = posts
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5)
    .map((p) => ({
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
    }));

  res.json({
    totalPosts,
    publishedPosts,
    scheduledPosts,
    draftPosts,
    connectedPlatforms,
    totalAssets,
    totalIdeas,
    recentPosts,
  });
});

export default router;
