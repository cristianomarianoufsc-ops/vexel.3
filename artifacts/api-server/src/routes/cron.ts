import { Router, type IRouter } from "express";
import { processDueScheduledPosts } from "../lib/scheduler";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/**
 * Endpoint to manually or externally trigger the processing of due scheduled posts.
 * Can be called via GET or POST:
 * curl -X POST https://vexelhub-api.fly.dev/api/cron/process-scheduled
 */
const handleProcessScheduled = async (_req: any, res: any) => {
  try {
    const processedCount = await processDueScheduledPosts();
    res.json({
      success: true,
      processedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, "Error handling /cron/process-scheduled request");
    res.status(500).json({ error: "Failed to process scheduled posts" });
  }
};

router.post("/cron/process-scheduled", handleProcessScheduled);
router.get("/cron/process-scheduled", handleProcessScheduled);

export default router;
