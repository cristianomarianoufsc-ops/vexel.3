import { Router, type IRouter } from "express";
import { db, postsTable, platformsTable } from "@workspace/db";
import { eq, and, desc, ne, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import {
  CreatePostBody,
  UpdatePostBody,
  ListPostsQueryParams,
} from "@workspace/api-zod";
import { downloadObject, getPublicUrl, cleanupObject } from "../lib/storageProvider";
import { logger } from "../lib/logger";
import { getUsableYouTubeAccessToken, uploadVideoToYouTube, getYouTubeVideoMetrics } from "../lib/youtube";
import { uploadInstagramReel, getInstagramMediaMetrics } from "../lib/instagram";
import {
  getUsableTikTokAccessToken,
  publishVideoToTikTok,
  getTikTokVideoMetrics,
} from "../lib/tiktok";

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
      progress?: number;
      stage?: string;
      bytesSent?: number | null;
      bytesTotal?: number | null;
      postId: string | null;
      postUrl: string | null;
      errorMessage: string | null;
      views?: number | null;
      likes?: number | null;
      comments?: number | null;
      shares?: number | null;
      lastSyncAt?: string | null;
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

  const { title, caption, videoObjectPath, thumbnailUrl, platforms, scheduledAt } = parsed.data;

  const status = scheduledAt ? "scheduled" : "draft";

  const [post] = await db
    .insert(postsTable)
    .values({
      userId: req.userId,
      title,
      caption,
      videoObjectPath: videoObjectPath ?? null,
      thumbnailUrl: thumbnailUrl ?? null,
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

export type PublishPlatformResult = {
  platform: string;
  status: string;
  progress: number;
  stage: string;
  bytesSent: number | null;
  bytesTotal: number | null;
  postId: string | null;
  postUrl: string | null;
  errorMessage: string | null;
};

export async function runPublishJob(options: { id: number; userId: string }): Promise<void> {
  const { id, userId } = options;
  const [post] = await db
    .select()
    .from(postsTable)
    .where(and(eq(postsTable.id, id), eq(postsTable.userId, userId)))
    .limit(1);

  if (!post) return;

  const platforms = (post.platforms as string[]) || [];
  const connectedPlatforms = await db
    .select()
    .from(platformsTable)
    .where(eq(platformsTable.userId, userId))
    .orderBy(platformsTable.id);

  const igAccounts = connectedPlatforms.filter((p) => p.platform === "instagram");
  const ig1 = igAccounts[0];
  const ig2 = igAccounts[1];

  const results: PublishPlatformResult[] = platforms.map((platform) => ({
    platform,
    status: "pending",
    progress: 0,
    stage: "Aguardando",
    bytesSent: null,
    bytesTotal: null,
    postId: null,
    postUrl: null,
    errorMessage: null,
  }));

  const saveProgress = async (): Promise<void> => {
    await db
      .update(postsTable)
      .set({ platformResults: results, updatedAt: new Date() })
      .where(and(eq(postsTable.id, id), eq(postsTable.userId, userId)));
  };

  const updatePlatformProgress = async (
    index: number,
    progress: number,
    stage: string,
    bytesSent: number | null = results[index].bytesSent,
    bytesTotal: number | null = results[index].bytesTotal,
  ): Promise<void> => {
    results[index] = {
      ...results[index],
      progress: Math.max(0, Math.min(100, Math.round(progress))),
      stage,
      bytesSent,
      bytesTotal,
    };
    await saveProgress();
  };

  try {
    for (const [index, platform] of platforms.entries()) {
      let connection: typeof platformsTable.$inferSelect | undefined;
      let isInstagram = false;

      if (platform === "youtube") {
        connection = connectedPlatforms.find((p) => p.platform === "youtube");
      } else if (platform === "tiktok") {
        connection = connectedPlatforms.find((p) => p.platform === "tiktok");
      } else if (platform === "instagram" || platform === "instagram_1") {
        connection = ig1;
        isInstagram = true;
      } else if (platform === "instagram_2") {
        connection = ig2;
        isInstagram = true;
      } else if (platform.startsWith("instagram:")) {
        const targetId = Number(platform.split(":")[1]);
        connection = connectedPlatforms.find((p) => p.id === targetId);
        isInstagram = true;
      }

      if (!connection || !connection.isConnected) {
        const platformLabel = platform === "instagram_2"
          ? "Instagram (Conta 2)"
          : platform === "instagram"
          ? "Instagram"
          : platform;
        results[index] = {
          ...results[index],
          status: "failed",
          progress: 100,
          stage: "Falhou",
          errorMessage: `${platformLabel} não está conectado. Conecte-o em Configurações antes de publicar.`,
        };
        await saveProgress();
        continue;
      }

      try {
        if (!post.videoObjectPath) {
          throw new Error("O post não possui um vídeo enviado.");
        }

        if (platform === "youtube") {
          await updatePlatformProgress(index, 2, "Baixando vídeo");
          const { buffer, contentType } = await downloadObject(post.videoObjectPath);
          const token = await getUsableYouTubeAccessToken(connection);
          const uploaded = await uploadVideoToYouTube({
            accessToken: token.accessToken,
            title: post.title,
            description: post.caption,
            video: buffer,
            contentType: contentType || "video/mp4",
            onProgress: (progress, stage, bytesSent, bytesTotal) =>
              updatePlatformProgress(index, progress, stage, bytesSent, bytesTotal),
          });

          if (token.refreshed) {
            await db
              .update(platformsTable)
              .set({
                accessToken: token.accessToken,
                refreshToken: token.refreshToken,
                tokenExpiresAt: token.expiresAt,
                updatedAt: new Date(),
              })
              .where(eq(platformsTable.id, connection.id));
          }

          results[index] = {
            ...results[index],
            status: "success",
            progress: 100,
            stage: "Concluído",
            postId: uploaded.videoId,
            postUrl: uploaded.url,
            errorMessage: null,
          };
          await saveProgress();
        } else if (isInstagram) {
          if (!connection.accessToken || !connection.accountId) {
            throw new Error(`A conexão do Instagram (${connection.accountName ? `@${connection.accountName}` : platform}) não possui token ou ID de conta.`);
          }
          const videoUrl = await getPublicUrl(post.videoObjectPath);
          if (
            videoUrl.includes("/api/storage/objects/") ||
            videoUrl.includes(".replit.dev") ||
            videoUrl.includes("localhost")
          ) {
            throw new Error(
              "O vídeo precisa estar em uma URL pública para o Instagram. Configure o armazenamento Supabase antes de publicar.",
            );
          }
          const uploaded = await uploadInstagramReel({
            accountId: connection.accountId,
            accessToken: connection.accessToken,
            videoUrl,
            caption: post.caption,
            onProgress: (progress, stage) => updatePlatformProgress(index, progress, stage),
          });
          results[index] = {
            ...results[index],
            status: "success",
            progress: 100,
            stage: "Concluído",
            postId: uploaded.mediaId,
            postUrl: uploaded.url,
            errorMessage: null,
          };
          await saveProgress();
        } else if (platform === "tiktok") {
          await updatePlatformProgress(index, 2, "Baixando vídeo");
          const { buffer, contentType } = await downloadObject(post.videoObjectPath);
          logger.info(
            {
              event: "tiktok.video_download.completed",
              postId: id,
              videoSize: buffer.length,
              contentType: contentType || "video/mp4",
            },
            "TikTok video download completed",
          );
          const token = await getUsableTikTokAccessToken(connection);
          const uploaded = await publishVideoToTikTok({
            accessToken: token.accessToken,
            video: buffer,
            contentType: contentType || "video/mp4",
            title: post.title,
            caption: post.caption,
            onProgress: (progress, stage) => updatePlatformProgress(index, progress, stage),
          });

          if (token.refreshed) {
            await db
              .update(platformsTable)
              .set({
                accessToken: token.accessToken,
                refreshToken: token.refreshToken,
                tokenExpiresAt: token.expiresAt,
                updatedAt: new Date(),
              })
              .where(eq(platformsTable.id, connection.id));
          }

          results[index] = {
            ...results[index],
            status: "success",
            progress: 100,
            stage: "Concluído",
            postId: uploaded.publishId,
            postUrl: null,
            errorMessage: null,
          };
          await saveProgress();
        } else {
          throw new Error(`Publicação em ${platform} ainda não está configurada.`);
        }
      } catch (err: unknown) {
        results[index] = {
          ...results[index],
          status: "failed",
          progress: 100,
          stage: "Falhou",
          errorMessage: err instanceof Error ? err.message : "Erro desconhecido",
        };
        await saveProgress();
      }
    }

    const allSuccess = results.length > 0 && results.every((result) => result.status === "success");
    await db
      .update(postsTable)
      .set({
        status: allSuccess ? "published" : "failed",
        publishedAt: allSuccess ? new Date() : null,
        platformResults: results,
        updatedAt: new Date(),
      })
      .where(and(eq(postsTable.id, id), eq(postsTable.userId, userId)));

    if (allSuccess && post.videoObjectPath) {
      await cleanupObject(post.videoObjectPath);
    }
  } catch (error) {
    logger.error(
      { event: "post.publish_job.failed", postId: id, error },
      "Unexpected publish job failure",
    );
    await db
      .update(postsTable)
      .set({
        status: "failed",
        publishedAt: null,
        platformResults: results.map((result) => ({
          ...result,
          status: result.status === "success" ? "success" : "failed",
          progress: result.status === "success" ? 100 : result.progress,
          stage: result.status === "success" ? "Concluído" : "Falhou",
          errorMessage: result.errorMessage || "O job de publicação foi interrompido.",
        })),
        updatedAt: new Date(),
      })
      .where(and(eq(postsTable.id, id), eq(postsTable.userId, userId)));
  }
}

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

  if (post.status === "publishing") {
    res.status(409).json({ error: "Este post já está sendo publicado." });
    return;
  }

  const platforms = (post.platforms as string[]) || [];
  const results: PublishPlatformResult[] = platforms.map((platform) => ({
    platform,
    status: "pending",
    progress: 0,
    stage: "Aguardando",
    bytesSent: null,
    bytesTotal: null,
    postId: null,
    postUrl: null,
    errorMessage: null,
  }));

  const [claimedPost] = await db
    .update(postsTable)
    .set({
      status: "publishing",
      publishedAt: null,
      platformResults: results,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(postsTable.id, id),
        eq(postsTable.userId, req.userId),
        ne(postsTable.status, "publishing"),
      ),
    )
    .returning({ id: postsTable.id });

  if (!claimedPost) {
    res.status(409).json({ error: "Este post já está sendo publicado." });
    return;
  }

  // Do not await external providers here. The persisted post state is the job
  // record, so a second request or a page reload can observe the same progress.
  void runPublishJob({ id, userId: req.userId }).catch((error: unknown) => {
    logger.error(
      { event: "post.publish_job.unhandled", postId: id, error },
      "Publish job exited unexpectedly",
    );
  });

  res.status(202).json({ results });
});

router.post("/posts/:id/refresh-metrics", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const [post] = await db
    .select()
    .from(postsTable)
    .where(and(eq(postsTable.id, id), eq(postsTable.userId, req.userId)))
    .limit(1);

  if (!post) {
    res.status(404).json({ error: "Post não encontrado" });
    return;
  }

  const userPlatforms = await db
    .select()
    .from(platformsTable)
    .where(eq(platformsTable.userId, req.userId))
    .orderBy(asc(platformsTable.id));

  const ytPlatform = userPlatforms.find((p) => p.platform === "youtube");
  const igPlatforms = userPlatforms.filter((p) => p.platform === "instagram");
  const ttPlatform = userPlatforms.find((p) => p.platform === "tiktok");

  const results = (post.platformResults as any[]) || [];
  let updatedAny = false;

  for (const pr of results) {
    if (pr.status !== "success" || !pr.postId) continue;

    try {
      if (pr.platform === "youtube" && ytPlatform?.accessToken) {
        const { accessToken } = await getUsableYouTubeAccessToken(ytPlatform as any);
        const stats = await getYouTubeVideoMetrics(pr.postId, accessToken);
        pr.views = stats.views;
        pr.likes = stats.likes;
        pr.comments = stats.comments;
        pr.lastSyncAt = new Date().toISOString();
        updatedAny = true;
      } else if (pr.platform === "instagram" && igPlatforms[0]?.accessToken) {
        const stats = await getInstagramMediaMetrics(pr.postId, igPlatforms[0].accessToken);
        pr.views = stats.views;
        pr.likes = stats.likes;
        pr.comments = stats.comments;
        pr.shares = stats.shares;
        pr.lastSyncAt = new Date().toISOString();
        updatedAny = true;
      } else if (pr.platform === "instagram_2" && igPlatforms[1]?.accessToken) {
        const stats = await getInstagramMediaMetrics(pr.postId, igPlatforms[1].accessToken);
        pr.views = stats.views;
        pr.likes = stats.likes;
        pr.comments = stats.comments;
        pr.shares = stats.shares;
        pr.lastSyncAt = new Date().toISOString();
        updatedAny = true;
      } else if (pr.platform === "tiktok") {
        const stats = await getTikTokVideoMetrics(pr.postId, ttPlatform?.accessToken ?? undefined);
        pr.views = stats.views;
        pr.likes = stats.likes;
        pr.comments = stats.comments;
        pr.shares = stats.shares;
        pr.lastSyncAt = new Date().toISOString();
        updatedAny = true;
      }
    } catch (err: any) {
      logger.warn({ event: "post.metrics.error", platform: pr.platform, postId: pr.postId, error: err?.message });
    }
  }

  if (updatedAny) {
    await db
      .update(postsTable)
      .set({ platformResults: results, updatedAt: new Date() })
      .where(eq(postsTable.id, id));
  }

  const [updatedPost] = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.id, id))
    .limit(1);

  res.json(formatPost(updatedPost || post));
});

router.post("/posts/refresh-metrics", requireAuth, async (req, res): Promise<void> => {
  const publishedPosts = await db
    .select()
    .from(postsTable)
    .where(and(eq(postsTable.userId, req.userId), eq(postsTable.status, "published")))
    .orderBy(desc(postsTable.id))
    .limit(15);

  const userPlatforms = await db
    .select()
    .from(platformsTable)
    .where(eq(platformsTable.userId, req.userId))
    .orderBy(asc(platformsTable.id));

  const ytPlatform = userPlatforms.find((p) => p.platform === "youtube");
  const igPlatforms = userPlatforms.filter((p) => p.platform === "instagram");
  const ttPlatform = userPlatforms.find((p) => p.platform === "tiktok");

  for (const post of publishedPosts) {
    const results = (post.platformResults as any[]) || [];
    let updatedAny = false;

    for (const pr of results) {
      if (pr.status !== "success" || !pr.postId) continue;

      try {
        if (pr.platform === "youtube" && ytPlatform?.accessToken) {
          const { accessToken } = await getUsableYouTubeAccessToken(ytPlatform as any);
          const stats = await getYouTubeVideoMetrics(pr.postId, accessToken);
          pr.views = stats.views;
          pr.likes = stats.likes;
          pr.comments = stats.comments;
          pr.lastSyncAt = new Date().toISOString();
          updatedAny = true;
        } else if (pr.platform === "instagram" && igPlatforms[0]?.accessToken) {
          const stats = await getInstagramMediaMetrics(pr.postId, igPlatforms[0].accessToken);
          pr.views = stats.views;
          pr.likes = stats.likes;
          pr.comments = stats.comments;
          pr.shares = stats.shares;
          pr.lastSyncAt = new Date().toISOString();
          updatedAny = true;
        } else if (pr.platform === "instagram_2" && igPlatforms[1]?.accessToken) {
          const stats = await getInstagramMediaMetrics(pr.postId, igPlatforms[1].accessToken);
          pr.views = stats.views;
          pr.likes = stats.likes;
          pr.comments = stats.comments;
          pr.shares = stats.shares;
          pr.lastSyncAt = new Date().toISOString();
          updatedAny = true;
        } else if (pr.platform === "tiktok") {
          const stats = await getTikTokVideoMetrics(pr.postId, ttPlatform?.accessToken ?? undefined);
          pr.views = stats.views;
          pr.likes = stats.likes;
          pr.comments = stats.comments;
          pr.shares = stats.shares;
          pr.lastSyncAt = new Date().toISOString();
          updatedAny = true;
        }
      } catch (err: any) {
        logger.warn({ event: "posts.batch_metrics.error", platform: pr.platform, postId: pr.postId, error: err?.message });
      }
    }

    if (updatedAny) {
      await db
        .update(postsTable)
        .set({ platformResults: results, updatedAt: new Date() })
        .where(eq(postsTable.id, post.id));
    }
  }

  res.json({ success: true, count: publishedPosts.length });
});

export default router;
