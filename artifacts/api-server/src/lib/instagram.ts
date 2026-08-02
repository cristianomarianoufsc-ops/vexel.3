const INSTAGRAM_GRAPH_URL = "https://graph.instagram.com/v26.0";
const INSTAGRAM_OAUTH_TOKEN_URL = "https://api.instagram.com/oauth/access_token";

type InstagramApiError = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
  error_message?: string;
};

type InstagramProfile = {
  user_id?: string;
  id?: string;
  username?: string;
  name?: string;
};

type InstagramContainer = {
  id?: string;
};

type InstagramContainerStatus = {
  status_code?: string;
  status?: string;
};

type InstagramTokenResponse = {
  access_token?: string;
  user_id?: string;
  expires_in?: number;
  error_type?: string;
  error_message?: string;
};

function getErrorMessage(data: InstagramApiError, fallback: string): string {
  return data.error?.message || data.error_message || fallback;
}

async function instagramRequest<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const url = new URL(`${INSTAGRAM_GRAPH_URL}/${path.replace(/^\/+/, "")}`);
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url, init);
  const data = (await response.json()) as T & InstagramApiError;
  if (!response.ok) {
    throw new Error(getErrorMessage(data, `Instagram API retornou HTTP ${response.status}.`));
  }
  return data;
}

export async function exchangeInstagramCode(options: {
  code: string;
  redirectUri: string;
}): Promise<{ accessToken: string }> {
  const clientId = process.env.INSTAGRAM_CLIENT_ID || process.env.INSTAGRAM_APP_ID;
  const clientSecret = process.env.INSTAGRAM_APP_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("OAuth do Instagram não está configurado no servidor.");
  }

  const response = await fetch(INSTAGRAM_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      redirect_uri: options.redirectUri,
      code: options.code,
    }),
  });
  const data = (await response.json()) as InstagramTokenResponse;
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_message || "Não foi possível trocar o código do Instagram.");
  }
  return { accessToken: data.access_token };
}

export async function getLongLivedInstagramToken(shortLivedToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const clientSecret = process.env.INSTAGRAM_APP_SECRET;
  if (!clientSecret) {
    throw new Error("A chave secreta do app do Instagram não está configurada no servidor.");
  }

  const url = new URL(`${INSTAGRAM_GRAPH_URL}/access_token`);
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("access_token", shortLivedToken);
  const response = await fetch(url);
  const data = (await response.json()) as InstagramTokenResponse;
  if (!response.ok || !data.access_token) {
    throw new Error(getErrorMessage(data, "Não foi possível obter o token de longa duração do Instagram."));
  }
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || 60 * 24 * 60 * 60,
  };
}

export async function getInstagramProfile(accessToken: string): Promise<{
  accountId: string;
  username: string;
}> {
  const profile = await instagramRequest<InstagramProfile>(
    "me?fields=user_id,username,name",
    accessToken,
  );
  const accountId = profile.user_id || profile.id;
  if (!accountId || !profile.username) {
    throw new Error("O token do Instagram não retornou uma conta profissional válida.");
  }
  return { accountId, username: profile.username };
}

export async function createInstagramReel(options: {
  accountId: string;
  accessToken: string;
  videoUrl: string;
  caption: string;
}): Promise<{ containerId: string }> {
  const body = new URLSearchParams({
    media_type: "REELS",
    video_url: options.videoUrl,
    caption: options.caption,
  });

  const container = await instagramRequest<InstagramContainer>(
    `${options.accountId}/media`,
    options.accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );

  if (!container.id) {
    throw new Error("O Instagram não retornou o ID do container do Reel.");
  }
  return { containerId: container.id };
}

export async function waitForInstagramContainer(options: {
  containerId: string;
  accessToken: string;
  timeoutMs?: number;
}): Promise<void> {
  const deadline = Date.now() + (options.timeoutMs ?? 180_000);
  let lastStatus = "IN_PROGRESS";

  while (Date.now() < deadline) {
    const status = await instagramRequest<InstagramContainerStatus>(
      `${options.containerId}?fields=status_code,status`,
      options.accessToken,
    );
    lastStatus = status.status_code || status.status || lastStatus;

    if (lastStatus === "FINISHED") return;
    if (["ERROR", "EXPIRED", "PUBLISHED"].includes(lastStatus)) {
      throw new Error(`O Instagram não processou o vídeo (status: ${lastStatus}).`);
    }

    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }

  throw new Error(`Tempo excedido aguardando o processamento do Reel (status: ${lastStatus}).`);
}

export async function publishInstagramReel(options: {
  accountId: string;
  accessToken: string;
  containerId: string;
}): Promise<{ mediaId: string; url: string }> {
  const result = await instagramRequest<{ id?: string }>(
    `${options.accountId}/media_publish`,
    options.accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ creation_id: options.containerId }),
    },
  );

  if (!result.id) {
    throw new Error("O Instagram não retornou o ID do Reel publicado.");
  }

  let url = `https://www.instagram.com/reel/${result.id}/`;
  try {
    const media = await instagramRequest<{ permalink?: string }>(
      `${result.id}?fields=permalink`,
      options.accessToken,
    );
    if (media.permalink) url = media.permalink;
  } catch {
    // The publish succeeded; keep the stable fallback when permalink lookup is unavailable.
  }

  return {
    mediaId: result.id,
    url,
  };
}

export async function uploadInstagramReel(options: {
  accountId: string;
  accessToken: string;
  videoUrl: string;
  caption: string;
}): Promise<{ mediaId: string; url: string }> {
  const { containerId } = await createInstagramReel(options);
  await waitForInstagramContainer({
    containerId,
    accessToken: options.accessToken,
  });
  return publishInstagramReel({
    accountId: options.accountId,
    accessToken: options.accessToken,
    containerId,
  });
}