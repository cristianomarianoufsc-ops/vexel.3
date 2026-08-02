const TIKTOK_API_BASE_URL = "https://open.tiktokapis.com";
const TIKTOK_OAUTH_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_CHUNK_SIZE = 10_000_000;
const TIKTOK_POLL_INTERVAL_MS = 5_000;
const TIKTOK_PUBLISH_TIMEOUT_MS = 180_000;

type TikTokError = {
  code?: string;
  message?: string;
  log_id?: string;
};

type TikTokEnvelope<T> = {
  data?: T;
  error?: TikTokError;
};

type TikTokTokenResponse = {
  access_token?: string;
  expires_in?: number;
  open_id?: string;
  refresh_token?: string;
  refresh_expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

type TikTokCreatorInfo = {
  creator_username?: string;
  creator_nickname?: string;
  privacy_level_options?: string[];
  max_video_post_duration_sec?: number;
};

type TikTokVideoInit = {
  publish_id?: string;
  upload_url?: string;
};

type TikTokPublishStatus = {
  publish_id?: string;
  status?: string;
  uploaded_bytes?: number;
  fail_reason?: string;
};

type TikTokUserInfo = {
  open_id?: string;
  display_name?: string;
  username?: string;
};

type TikTokPlatformConnection = {
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
};

function formatTikTokError(
  error: TikTokError | undefined,
  fallback: string,
): string {
  const details = [error?.code, error?.message, error?.log_id].filter(Boolean);
  return details.length > 0 ? `TikTok: ${details.join(" — ")}` : fallback;
}

async function parseResponse<T>(response: Response): Promise<TikTokEnvelope<T>> {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as TikTokEnvelope<T>;
  } catch {
    throw new Error(`TikTok retornou uma resposta inválida (HTTP ${response.status}).`);
  }
}

async function tiktokApiRequest<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(`${TIKTOK_API_BASE_URL}${path}`, {
    ...init,
    headers,
  });
  const payload = await parseResponse<T>(response);

  if (!response.ok || (payload.error?.code && payload.error.code !== "ok")) {
    throw new Error(
      formatTikTokError(
        payload.error,
        `A API do TikTok retornou HTTP ${response.status}.`,
      ),
    );
  }

  if (!payload.data) {
    throw new Error("A API do TikTok não retornou dados.");
  }

  return payload.data;
}

async function exchangeTikTokToken(
  params: URLSearchParams,
): Promise<{
  accessToken: string;
  refreshToken: string | null;
  openId: string | null;
  expiresIn: number;
  refreshExpiresIn: number | null;
}> {
  const response = await fetch(TIKTOK_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const text = await response.text();
  let tokenData: TikTokTokenResponse = {};
  try {
    tokenData = text ? (JSON.parse(text) as TikTokTokenResponse) : {};
  } catch {
    throw new Error(`O TikTok retornou uma resposta inválida (HTTP ${response.status}).`);
  }

  if (
    !response.ok ||
    !tokenData?.access_token ||
    !tokenData.expires_in
  ) {
    throw new Error(
      tokenData?.error_description ||
        tokenData?.error ||
        `Não foi possível obter o token do TikTok (HTTP ${response.status}).`,
    );
  }

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || null,
    openId: tokenData.open_id || null,
    expiresIn: tokenData.expires_in,
    refreshExpiresIn: tokenData.refresh_expires_in || null,
  };
}

export async function exchangeTikTokCode(options: {
  code: string;
  redirectUri: string;
}): Promise<{
  accessToken: string;
  refreshToken: string | null;
  openId: string | null;
  expiresIn: number;
  refreshExpiresIn: number | null;
}> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) {
    throw new Error("OAuth do TikTok não está configurado no servidor.");
  }

  return exchangeTikTokToken(
    new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code: options.code,
      grant_type: "authorization_code",
      redirect_uri: options.redirectUri,
    }),
  );
}

async function refreshTikTokAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) {
    throw new Error("OAuth do TikTok não está configurado no servidor.");
  }

  const token = await exchangeTikTokToken(
    new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  );

  return {
    accessToken: token.accessToken,
    refreshToken: token.refreshToken || refreshToken,
    expiresAt: new Date(Date.now() + token.expiresIn * 1000),
  };
}

export async function getUsableTikTokAccessToken(
  platform: TikTokPlatformConnection,
): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  refreshed: boolean;
}> {
  if (!platform.accessToken) {
    throw new Error("A conexão do TikTok não possui um token de acesso.");
  }

  const expiresSoon =
    !platform.tokenExpiresAt ||
    platform.tokenExpiresAt.getTime() <= Date.now() + 60_000;

  if (!expiresSoon) {
    return {
      accessToken: platform.accessToken,
      refreshToken: platform.refreshToken,
      expiresAt: platform.tokenExpiresAt,
      refreshed: false,
    };
  }

  if (!platform.refreshToken) {
    throw new Error(
      "A conexão do TikTok expirou e não possui refresh token. Desconecte e conecte o TikTok novamente.",
    );
  }

  const refreshed = await refreshTikTokAccessToken(platform.refreshToken);
  return { ...refreshed, refreshed: true };
}

export async function getTikTokProfile(accessToken: string): Promise<{
  accountId: string;
  accountName: string;
}> {
  const profile = await tiktokApiRequest<TikTokUserInfo>(
    "/v2/user/info/?fields=open_id,display_name,username",
    accessToken,
  );

  const accountId = profile.open_id;
  if (!accountId) {
    throw new Error("O TikTok não retornou o ID da conta autorizada.");
  }

  return {
    accountId,
    accountName: profile.username || profile.display_name || "TikTok",
  };
}

function choosePrivacyLevel(options: string[]): string {
  const configured = process.env.TIKTOK_DEFAULT_PRIVACY?.trim();
  if (configured && options.includes(configured)) return configured;
  if (options.includes("PUBLIC_TO_EVERYONE")) return "PUBLIC_TO_EVERYONE";
  if (options.length > 0) return options[0];
  throw new Error(
    "O TikTok não retornou nenhuma opção de privacidade disponível para publicação.",
  );
}

async function queryCreatorInfo(accessToken: string): Promise<TikTokCreatorInfo> {
  return tiktokApiRequest<TikTokCreatorInfo>(
    "/v2/post/publish/creator_info/query/",
    accessToken,
    { method: "POST" },
  );
}

async function initializeVideoPublish(options: {
  accessToken: string;
  videoSize: number;
  title: string;
  privacyLevel: string;
}): Promise<TikTokVideoInit & { chunkSize: number }> {
  // TikTok requires the whole file size as chunk_size when the video is
  // smaller than the normal 10 MB chunk. Otherwise video/init returns
  // invalid_params ("The chunk size is invalid").
  const chunkSize = Math.min(TIKTOK_CHUNK_SIZE, options.videoSize);
  const totalChunkCount =
    options.videoSize <= TIKTOK_CHUNK_SIZE
      ? 1
      : Math.floor(options.videoSize / TIKTOK_CHUNK_SIZE);

  return tiktokApiRequest<TikTokVideoInit>(
    "/v2/post/publish/video/init/",
    options.accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        post_info: {
          title: options.title.slice(0, 2_200),
          privacy_level: options.privacyLevel,
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: "FILE_UPLOAD",
          video_size: options.videoSize,
          chunk_size: chunkSize,
          total_chunk_count: totalChunkCount,
        },
      }),
    },
  ).then((data) => ({ ...data, chunkSize }));
}

async function uploadVideoFile(options: {
  uploadUrl: string;
  video: Buffer;
  contentType: string;
  chunkSize: number;
}): Promise<void> {
  const totalChunkCount =
    options.video.length <= options.chunkSize
      ? 1
      : Math.floor(options.video.length / options.chunkSize);

  for (let chunkIndex = 0; chunkIndex < totalChunkCount; chunkIndex += 1) {
    const start =
      chunkIndex === totalChunkCount - 1
        ? Math.min(chunkIndex * options.chunkSize, options.video.length)
        : chunkIndex * options.chunkSize;
    const end = Math.min(
      chunkIndex === totalChunkCount - 1
        ? options.video.length
        : start + options.chunkSize,
      options.video.length,
    ) - 1;
    const chunk = options.video.subarray(start, end + 1);
    const response = await fetch(options.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": options.contentType,
        "Content-Length": String(chunk.length),
        "Content-Range": `bytes ${start}-${end}/${options.video.length}`,
      },
      body: chunk,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `O TikTok recusou o upload do vídeo (HTTP ${response.status})${
          body ? `: ${body.slice(0, 500)}` : "."
        }`,
      );
    }
  }
}

async function waitForPublish(options: {
  accessToken: string;
  publishId: string;
}): Promise<TikTokPublishStatus> {
  const deadline = Date.now() + TIKTOK_PUBLISH_TIMEOUT_MS;
  let lastStatus = "PROCESSING_UPLOAD";

  while (Date.now() < deadline) {
    const status = await tiktokApiRequest<TikTokPublishStatus>(
      "/v2/post/publish/status/fetch/",
      options.accessToken,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish_id: options.publishId }),
      },
    );
    lastStatus = status.status || lastStatus;

    if (lastStatus === "PUBLISH_COMPLETE") return status;
    if (lastStatus === "FAILED") {
      throw new Error(
        status.fail_reason ||
          `O TikTok falhou ao publicar o vídeo (publish_id: ${options.publishId}).`,
      );
    }

    await new Promise((resolve) =>
      setTimeout(resolve, TIKTOK_POLL_INTERVAL_MS),
    );
  }

  throw new Error(
    `Tempo excedido aguardando a publicação do TikTok (status: ${lastStatus}).`,
  );
}

export async function publishVideoToTikTok(options: {
  accessToken: string;
  video: Buffer;
  contentType: string;
  title: string;
  caption: string;
}): Promise<{
  publishId: string;
  status: "PUBLISH_COMPLETE";
}> {
  if (options.video.length === 0) {
    throw new Error("O vídeo enviado está vazio.");
  }

  const creatorInfo = await queryCreatorInfo(options.accessToken);
  const privacyLevel = choosePrivacyLevel(
    creatorInfo.privacy_level_options || [],
  );
  const title = [options.title.trim(), options.caption.trim()]
    .filter(Boolean)
    .join("\n");
  const initialized = await initializeVideoPublish({
    accessToken: options.accessToken,
    videoSize: options.video.length,
    title: title || "VexelHub",
    privacyLevel,
  });

  if (!initialized.publish_id || !initialized.upload_url) {
    throw new Error("O TikTok não retornou os dados para iniciar o upload.");
  }

  await uploadVideoFile({
    uploadUrl: initialized.upload_url,
    video: options.video,
    contentType: options.contentType || "video/mp4",
    chunkSize: initialized.chunkSize,
  });

  const status = await waitForPublish({
    accessToken: options.accessToken,
    publishId: initialized.publish_id,
  });

  return {
    publishId: status.publish_id || initialized.publish_id,
    status: "PUBLISH_COMPLETE",
  };
}