import { Router, type IRouter } from "express";
import { db, platformsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getPublicApiUrl, getYouTubeRedirectUri } from "../lib/youtube";

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
  const platform = Array.isArray(req.params.platform) ? req.params.platform[0] : req.params.platform;

  if (!SUPPORTED_PLATFORMS.includes(platform as PlatformName)) {
    res.status(400).json({ error: "Unsupported platform" });
    return;
  }

  // Build the OAuth URL for each platform
  const baseUrl = getPublicApiUrl();

  let url = "";

  if (platform === "youtube") {
    const clientId = process.env.YOUTUBE_CLIENT_ID || "";
    const redirectUri = getYouTubeRedirectUri();
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

router.get("/platforms/youtube/callback", async (req, res): Promise<void> => {
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;
  const error = req.query.error as string | undefined;

  if (error || !code || !state) {
    res.status(400).send(`Falha na autorização do YouTube: ${error || "code/state ausente"}`);
    return;
  }

  const userId = state;
    const redirectUri = getYouTubeRedirectUri();

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.YOUTUBE_CLIENT_ID || "",
        client_secret: process.env.YOUTUBE_CLIENT_SECRET || "",
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json() as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    };

    if (!tokenRes.ok || !tokenData.access_token) {
      res.status(400).send(`Falha ao trocar code por token: ${tokenData.error_description || tokenData.error || "unknown"}`);
      return;
    }

    // Get YouTube channel info
    const channelRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      },
    );

    const channelData = await channelRes.json() as {
      items?: Array<{
        id?: string;
        snippet?: { title?: string };
      }>;
    };
    const channel = channelData.items?.[0];
    const accountId = channel?.id || "";
    const accountName = channel?.snippet?.title || "YouTube Channel";

    // Update platform connection
    await db
      .update(platformsTable)
      .set({
        isConnected: true,
        accountId,
        accountName,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        tokenExpiresAt: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000)
          : null,
        updatedAt: new Date(),
      })
      .where(and(eq(platformsTable.userId, userId), eq(platformsTable.platform, "youtube")));

    // Redirect back to frontend settings page
    const frontendUrl = process.env.PUBLIC_FRONTEND_URL
      ? `${process.env.PUBLIC_FRONTEND_URL.replace(/\/+$/, "")}/settings`
      : "https://vexel-2.vercel.app/settings";
    res.redirect(frontendUrl);
  } catch (err) {
    console.error("YouTube callback error:", err);
    res.status(500).send("Erro interno ao processar conexão com YouTube");
  }
});

router.delete("/platforms/:platform", requireAuth, async (req, res): Promise<void> => {
  const platform = Array.isArray(req.params.platform) ? req.params.platform[0] : req.params.platform;

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
