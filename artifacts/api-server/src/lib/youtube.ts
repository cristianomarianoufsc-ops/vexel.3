const YOUTUBE_UPLOAD_URL =
  "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

type YouTubeVideoResponse = {
  id?: string;
  error?: {
    message?: string;
    errors?: Array<{ reason?: string; message?: string }>;
  };
};

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type YouTubePlatformConnection = {
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
};

export function getPublicApiUrl(): string {
  const configured = process.env.PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  // The Fly app is the stable OAuth callback host for Vercel and Replit.
  return "https://vexelhub-api.fly.dev";
}

export function getYouTubeRedirectUri(): string {
  return `${getPublicApiUrl()}/api/platforms/youtube/callback`;
}

async function refreshYouTubeAccessToken(platform: YouTubePlatformConnection): Promise<{
  accessToken: string;
  expiresAt: Date;
  refreshToken: string;
}> {
  if (!platform.refreshToken) {
    throw new Error(
      "A conexão do YouTube expirou e não possui refresh token. Desconecte e conecte o YouTube novamente.",
    );
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID || "",
      client_secret: process.env.YOUTUBE_CLIENT_SECRET || "",
      refresh_token: platform.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !data.access_token || !data.expires_in) {
    throw new Error(
      `Não foi possível renovar o acesso ao YouTube: ${
        data.error_description || data.error || "resposta inválida do Google"
      }`,
    );
  }

  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    refreshToken: platform.refreshToken,
  };
}

export async function getUsableYouTubeAccessToken(platform: YouTubePlatformConnection): Promise<{
  accessToken: string;
  expiresAt: Date | null;
  refreshToken: string | null;
  refreshed: boolean;
}> {
  if (!platform.accessToken) {
    throw new Error("A conexão do YouTube não possui um token de acesso.");
  }

  const expiresSoon =
    !platform.tokenExpiresAt ||
    platform.tokenExpiresAt.getTime() <= Date.now() + 60_000;

  if (!expiresSoon) {
    return {
      accessToken: platform.accessToken,
      expiresAt: platform.tokenExpiresAt,
      refreshToken: platform.refreshToken,
      refreshed: false,
    };
  }

  const refreshed = await refreshYouTubeAccessToken(platform);
  return { ...refreshed, refreshed: true };
}

function getYouTubeError(data: YouTubeVideoResponse): string {
  return (
    data.error?.errors?.map((item) => item.reason || item.message).filter(Boolean).join(", ") ||
    data.error?.message ||
    "O YouTube recusou o upload."
  );
}

export async function uploadVideoToYouTube(options: {
  accessToken: string;
  title: string;
  description: string;
  video: Buffer;
  contentType: string;
}): Promise<{ videoId: string; url: string }> {
  const boundary = `vexelhub-${crypto.randomUUID()}`;
  const metadata = JSON.stringify({
    snippet: {
      title: options.title,
      description: options.description,
      categoryId: "22",
    },
    status: {
      // Keep test uploads private until the owner explicitly changes them in YouTube Studio.
      privacyStatus: "private",
      selfDeclaredMadeForKids: false,
    },
  });

  const header = Buffer.from(
    `--${boundary}\r\n` +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      `${metadata}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${options.contentType || "video/*"}\r\n\r\n`,
    "utf8",
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  const body = Buffer.concat([header, options.video, footer]);

  const response = await fetch(YOUTUBE_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": String(body.byteLength),
    },
    body,
  });
  const data = (await response.json()) as YouTubeVideoResponse;

  if (!response.ok || !data.id) {
    throw new Error(getYouTubeError(data));
  }

  return {
    videoId: data.id,
    url: `https://www.youtube.com/watch?v=${data.id}`,
  };
}