const YOUTUBE_RESUMABLE_UPLOAD_URL =
  "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";
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
  onProgress?: (progress: number, stage: string, bytesSent: number, bytesTotal: number) => void | Promise<void>;
}): Promise<{ videoId: string; url: string }> {
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

  if (options.video.length === 0) {
    throw new Error("O vídeo enviado está vazio.");
  }

  // Resumable uploads let the UI report bytes sent instead of waiting for a
  // single multipart request to finish. Chunks are aligned to Google's
  // required 256 KiB boundary, with a small enough size for smooth updates.
  const response = await fetch(YOUTUBE_RESUMABLE_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": options.contentType || "video/*",
      "X-Upload-Content-Length": String(options.video.length),
    },
    body: metadata,
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as YouTubeVideoResponse;
    throw new Error(getYouTubeError(data));
  }

  const uploadUrl = response.headers.get("location");
  if (!uploadUrl) {
    throw new Error("O YouTube não retornou a URL da sessão de upload.");
  }

  await options.onProgress?.(5, "Enviando vídeo", 0, options.video.length);

  const chunkSize = 4 * 1024 * 1024;
  let uploadedBytes = 0;
  let finalData: YouTubeVideoResponse | null = null;

  while (uploadedBytes < options.video.length) {
    const endExclusive = Math.min(uploadedBytes + chunkSize, options.video.length);
    const chunk = options.video.subarray(uploadedBytes, endExclusive);
    const endInclusive = endExclusive - 1;
    const chunkResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        "Content-Type": options.contentType || "video/*",
        "Content-Length": String(chunk.length),
        "Content-Range": `bytes ${uploadedBytes}-${endInclusive}/${options.video.length}`,
      },
      body: chunk,
    });

    if (chunkResponse.status === 308) {
      uploadedBytes = endExclusive;
      await options.onProgress?.(
        5 + Math.round((uploadedBytes / options.video.length) * 85),
        "Enviando vídeo",
        uploadedBytes,
        options.video.length,
      );
      continue;
    }

    const data = (await chunkResponse.json().catch(() => ({}))) as YouTubeVideoResponse;
    if (!chunkResponse.ok) {
      throw new Error(getYouTubeError(data));
    }

    uploadedBytes = endExclusive;
    finalData = data;
    await options.onProgress?.(90, "Processando no YouTube", uploadedBytes, options.video.length);
  }

  if (!finalData?.id) {
    throw new Error("O YouTube concluiu o envio, mas não retornou o ID do vídeo.");
  }

  await options.onProgress?.(100, "Concluído", options.video.length, options.video.length);

  return {
    videoId: finalData.id,
    url: `https://www.youtube.com/watch?v=${finalData.id}`,
  };
}