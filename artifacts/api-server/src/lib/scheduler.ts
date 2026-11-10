import { db, postsTable } from "@workspace/db";
import { eq, and, lte } from "drizzle-orm";
import { logger } from "./logger";
import { runPublishJob, type PublishPlatformResult } from "../routes/posts";
import { pingSupabaseStorage } from "./supabaseStorage";

let schedulerTimer: NodeJS.Timeout | null = null;
let isChecking = false;
let lastSupabasePingAt = 0;
const SUPABASE_PING_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours

/**
 * Process all scheduled posts that have reached their scheduled publish time.
 * Claims them atomically using status = "publishing" and runs runPublishJob.
 */
export async function processDueScheduledPosts(): Promise<number> {
  if (isChecking) {
    logger.debug("Scheduler check already in progress, skipping tick");
    return 0;
  }

  isChecking = true;
  let processedCount = 0;

  try {
    const now = new Date();

    // Find posts with status 'scheduled' whose scheduledAt has arrived
    const duePosts = await db
      .select()
      .from(postsTable)
      .where(
        and(
          eq(postsTable.status, "scheduled"),
          lte(postsTable.scheduledAt, now)
        )
      )
      .limit(10);

    if (duePosts.length === 0) {
      return 0;
    }

    logger.info({ count: duePosts.length }, "Scheduler found due scheduled posts to publish");

    for (const post of duePosts) {
      const platforms = (post.platforms as string[]) || [];
      const results: PublishPlatformResult[] = platforms.map((platform) => ({
        platform,
        status: "pending",
        progress: 0,
        stage: "Iniciando agendado",
        bytesSent: null,
        bytesTotal: null,
        postId: null,
        postUrl: null,
        errorMessage: null,
      }));

      // Atomic claim: only claim if status is still 'scheduled'
      const [claimed] = await db
        .update(postsTable)
        .set({
          status: "publishing",
          publishedAt: null,
          platformResults: results,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(postsTable.id, post.id),
            eq(postsTable.status, "scheduled")
          )
        )
        .returning({ id: postsTable.id });

      if (!claimed) {
        // Concurrently claimed by another run
        continue;
      }

      processedCount++;
      logger.info(
        { postId: post.id, userId: post.userId, scheduledAt: post.scheduledAt },
        "Scheduler claimed and triggered publication for scheduled post"
      );

      // Fire job in background
      void runPublishJob({ id: post.id, userId: post.userId }).catch((error: unknown) => {
        logger.error(
          { event: "scheduler.publish_job.unhandled", postId: post.id, error },
          "Scheduler publish job exited unexpectedly"
        );
      });
    }
  } catch (error) {
    logger.error({ error }, "Error while processing due scheduled posts");
  } finally {
    isChecking = false;
  }

  return processedCount;
}

/**
 * Start the periodic cron worker to check for due scheduled posts.
 */
export function startScheduler(intervalMs = 30_000): void {
  if (schedulerTimer) {
    logger.warn("Scheduler is already running");
    return;
  }

  logger.info({ intervalMs }, "Starting automatic scheduled posts runner");

  // Initial check 5s after boot
  setTimeout(() => {
    void processDueScheduledPosts();
    void pingSupabaseStorage().then((ok) => {
      if (ok) lastSupabasePingAt = Date.now();
    });
  }, 5_000);

  schedulerTimer = setInterval(() => {
    void processDueScheduledPosts();

    if (Date.now() - lastSupabasePingAt > SUPABASE_PING_INTERVAL_MS) {
      void pingSupabaseStorage().then((ok) => {
        if (ok) {
          lastSupabasePingAt = Date.now();
          logger.info("Keep-alive do Supabase Storage executado com sucesso");
        }
      });
    }
  }, intervalMs);
}

/**
 * Stop the scheduler cleanly during process shutdown.
 */
export function stopScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    logger.info("Automatic scheduled posts runner stopped");
  }
}
