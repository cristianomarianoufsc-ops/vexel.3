import { Router, type IRouter } from "express";
import { db, platformsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

const SUPPORTED_PLATFORMS = ["youtube", "instagram", "tiktok"] as const;
type PlatformName = (typeof SUPPORTED_PLATFORMS)[number];

// Ensure platform rows exist for user
async function ensurePlatformRows(userId: string) {
  for (const platform of SUPPORTED_PLATFORMS) {
    const existing = await db
      .select()
      .from(platformsTable)
      .where(and(eq(platformsTable.userId, userId), eq(platformsTable.platform, platform)))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(platformsTable).values({
        userId,
        platform,
        isConnected: false,
      });
    }
  }
}

router.get("/platforms", requireAuth, async (req, res): Promise<void> => {
  await ensurePlatformRows(req.userId);

  const platforms = await db
    .select()
    .from(platformsTable)
    .where(eq(platformsTable.userId, req.userId));

  res.json(
    platforms.map((p) => ({
      id: p.id,
      platform: p.platform,
      isConnected: p.isConnected,
      accountName: p.accountName,
      accountId: p.accountId,
    })),
  );
});

router.post("/platforms/:platform/connect", requireAuth, async (req, res): Promise<void> => {
  const { platform } = req.params;

  if (!SUPPORTED_PLATFORMS.includes(platform as PlatformName)) {
    res.status(400).json({ error: "Unsupported platform" });
    return;
  }

  // Build the OAuth URL for each platform
  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "http://localhost:3000";

  let url = "";

  if (platform === "youtube") {
    const clientId = process.env.YOUTUBE_CLIENT_ID || "";
    const redirectUri = `${baseUrl}/api/platforms/youtube/callback`;
    const scope = "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly";
    url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${req.userId}`;
  } else if (platform === "instagram") {
    const clientId = process.env.INSTAGRAM_CLIENT_ID || "";
    const redirectUri = `${baseUrl}/api/platforms/instagram/callback`;
    const scope = "instagram_basic,instagram_content_publish,pages_read_engagement";
    url = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code&state=${req.userId}`;
  } else if (platform === "tiktok") {
    const clientKey = process.env.TIKTOK_CLIENT_KEY || "";
    const redirectUri = `${baseUrl}/api/platforms/tiktok/callback`;
    url = `https://www.tiktok.com/v2/auth/authorize?client_key=${clientKey}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=user.info.basic,video.publish&state=${req.userId}`;
  }

  if (!url) {
    res.status(500).json({ error: `OAuth not configured for ${platform}. Set the platform API credentials in Settings.` });
    return;
  }

  res.json({ url });
});

router.delete("/platforms/:platform", requireAuth, async (req, res): Promise<void> => {
  const { platform } = req.params;

  if (!SUPPORTED_PLATFORMS.includes(platform as PlatformName)) {
    res.status(400).json({ error: "Unsupported platform" });
    return;
  }

  await db
    .update(platformsTable)
    .set({
      isConnected: false,
      accountName: null,
      accountId: null,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(eq(platformsTable.userId, req.userId), eq(platformsTable.platform, platform)),
    );

  res.json({ success: true });
});

export default router;
