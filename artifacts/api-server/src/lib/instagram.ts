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

type InstagramProgressReporter = (progress: number, stage: string) => void | Promise<void>;

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
  onProgress?: InstagramProgressReporter;
}): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 180_000;
  const startedAt = Date.now();
  const deadline = startedAt + timeoutMs;
  let lastStatus = "IN_PROGRESS";

  while (Date.now() < deadline) {
    const status = await instagramRequest<InstagramContainerStatus>(
      `${options.containerId}?fields=status_code,status`,
      options.accessToken,
    );
    lastStatus = status.status_code || status.status || lastStatus;
    const elapsedRatio = Math.min(1, (Date.now() - startedAt) / timeoutMs);
    await options.onProgress?.(
      Math.min(85, 35 + Math.round(elapsedRatio * 50)),
      "Processando no Instagram",
    );

    if (lastStatus === "FINISHED") return;
    if (["ERROR", "EXPIRED", "PUBLISHED"].includes(lastStatus)) {
      const subcode = status.status && status.status !== lastStatus ? ` (código Meta: ${status.status})` : "";
      throw new Error(
        `O Instagram não processou o vídeo (status: ${lastStatus}${subcode}). Causas comuns: link inacessível/expirado, vídeo sem faixa de áudio ou formato diferente de MP4/H.264.`,
      );
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
  onProgress?: InstagramProgressReporter;
}): Promise<{ mediaId: string; url: string }> {
  await options.onProgress?.(10, "Preparando vídeo");
  const { containerId } = await createInstagramReel(options);
  await options.onProgress?.(30, "Vídeo recebido pelo Instagram");
  await waitForInstagramContainer({
    containerId,
    accessToken: options.accessToken,
    onProgress: options.onProgress,
  });
  await options.onProgress?.(90, "Confirmando publicação");
  const result = await publishInstagramReel({
    accountId: options.accountId,
    accessToken: options.accessToken,
    containerId,
  });
  await options.onProgress?.(100, "Concluído");
  return result;
}

export function extractInstagramShortcode(
  mediaId?: string | null,
  postUrl?: string | null,
): string | null {
  // 1) Prioridade máxima: extrair diretamente do postUrl se fornecido (ex: https://www.instagram.com/reel/Df-NnrKmSXf/)
  if (postUrl) {
    const urlMatch = postUrl.match(/(?:reel|p)\/([A-Za-z0-9_-]+)/);
    if (urlMatch) return urlMatch[1];
  }
  // 2) Se o mediaId parece com um shortcode (9 a 13 caracteres alfanuméricos com hífen/underline, não puramente numérico)
  if (mediaId && /^[A-Za-z0-9_-]{9,13}$/.test(mediaId) && !/^\d+$/.test(mediaId)) {
    return mediaId;
  }
  // 3) Se o mediaId contém uma URL
  if (mediaId) {
    const urlMatch = mediaId.match(/(?:reel|p)\/([A-Za-z0-9_-]+)/);
    if (urlMatch) return urlMatch[1];
  }
  return null;
}

export async function getInstagramMediaMetrics(options: {
  mediaId?: string | null;
  postUrl?: string | null;
  accessToken?: string | null;
}): Promise<{ views: number; likes: number; comments: number; shares: number }> {
  let views = 0;
  let likes = 0;
  let comments = 0;
  let shares = 0;

  let shortcode = extractInstagramShortcode(options.mediaId, options.postUrl);
  console.log(`[IG-METRICS] mediaId=${options.mediaId}, postUrl=${options.postUrl}, shortcode=${shortcode}`);

  // 1) Se temos accessToken e mediaId numérico, tenta buscar via Meta Graph API oficial
  if (options.accessToken && options.mediaId && /^\d+$/.test(options.mediaId.split("_")[0])) {
    const numericId = options.mediaId.split("_")[0];
    for (const host of [
      "https://graph.instagram.com/v21.0",
      "https://graph.facebook.com/v21.0",
    ]) {
      try {
        const url = new URL(`${host}/${numericId}`);
        url.searchParams.set("fields", "id,shortcode,permalink,like_count,comments_count,shares_count");
        url.searchParams.set("access_token", options.accessToken);
        const res = await fetch(url);
        if (res.ok) {
          const data = (await res.json()) as {
            shortcode?: string;
            permalink?: string;
            like_count?: number;
            comments_count?: number;
            shares_count?: number;
          };
          if (data.shortcode && !shortcode) shortcode = data.shortcode;
          if (data.permalink && !shortcode) {
            const m = data.permalink.match(/(?:reel|p)\/([A-Za-z0-9_-]+)/);
            if (m) shortcode = m[1];
          }
          if (typeof data.like_count === "number" && data.like_count > likes) {
            likes = data.like_count;
          }
          if (typeof data.comments_count === "number" && data.comments_count > comments) {
            comments = data.comments_count;
          }
          if (typeof data.shares_count === "number" && data.shares_count > shares) {
            shares = data.shares_count;
          }
          console.log(`[IG-METRICS] Graph API (${host}): shortcode=${data.shortcode}, likes=${data.like_count}, comments=${data.comments_count}`);
          break;
        }
      } catch {
        // continue
      }
    }

    // Tenta também buscar métricas de insights (plays, reach, shares)
    try {
      const insightsUrl = new URL(`https://graph.instagram.com/v21.0/${numericId}/insights`);
      insightsUrl.searchParams.set("metric", "plays,reach,shares,total_interactions");
      insightsUrl.searchParams.set("access_token", options.accessToken);
      const res = await fetch(insightsUrl);
      if (res.ok) {
        const data = (await res.json()) as {
          data?: Array<{ name: string; values?: Array<{ value: number }> }>;
        };
        if (Array.isArray(data.data)) {
          for (const m of data.data) {
            const val = m.values?.[0]?.value ?? 0;
            if ((m.name === "plays" || m.name === "views") && val > views) views = val;
            if (m.name === "shares" && val > shares) shares = val;
            if (!views && m.name === "reach" && val > views) views = val;
          }
        }
      }
    } catch {
      // continue
    }
  }

  // 2) Se temos o shortcode, busca no embed oficial do Instagram
  // Isso garante contagem exata e em tempo real mesmo sem aprovação de app na Meta!
  if (shortcode) {
    try {
      // Tenta /reel/ primeiro, depois /p/ se não encontrar dados
      const embedPaths = [`/reel/${shortcode}/embed/captioned/`, `/p/${shortcode}/embed/captioned/`];
      for (const embedPath of embedPaths) {
        const embedUrl = `https://www.instagram.com${embedPath}`;
        console.log(`[IG-METRICS] Fetching embed: ${embedUrl}`);
        const res = await fetch(embedUrl, {
          headers: {
            "User-Agent": "curl/8.5.0",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });

        console.log(`[IG-METRICS] Embed response: status=${res.status}`);

        if (res.ok) {
          const html = await res.text();
          console.log(`[IG-METRICS] HTML length: ${html.length}`);
          const likeMatch = html.match(/edge_liked_by[\\\"]+:[\\\"]*\{[\\\"]*count[\\\"]*:(\d+)/);
          const commentMatch = html.match(/edge_media_to_comment[\\\"]+:[\\\"]*\{[\\\"]*count[\\\"]*:(\d+)/);
          const viewMatch = html.match(/(?:video_view_count|play_count|video_play_count)[\\\"]+:[\\\"]*(\d+)/);

          console.log(`[IG-METRICS] Matches: likes=${likeMatch?.[1]}, comments=${commentMatch?.[1]}, views=${viewMatch?.[1]}`);

          if (likeMatch) {
            const l = Number(likeMatch[1]);
            if (l > likes) likes = l;
          }
          if (commentMatch) {
            const c = Number(commentMatch[1]);
            if (c > comments) comments = c;
          }
          if (viewMatch) {
            const v = Number(viewMatch[1]);
            if (v > views) views = v;
          }

          // Se conseguimos dados, não precisa tentar o outro path
          if (likes > 0 || comments > 0 || views > 0) break;

          // Fallback meta tags
          if (likes === 0 || comments === 0) {
            const metaMatch = html.match(/content="([0-9.,KMBkmb]+)\s*(?:likes|curtidas)[^0-9]*([0-9.,KMBkmb]+)\s*(?:comments|coment[áa]rios)/i);
            if (metaMatch) {
              const l = parseInt(metaMatch[1].replace(/[^0-9]/g, ""), 10);
              const c = parseInt(metaMatch[2].replace(/[^0-9]/g, ""), 10);
              if (!isNaN(l) && l > likes) likes = l;
              if (!isNaN(c) && c > comments) comments = c;
            }
          }
          if (likes > 0 || views > 0) break;
        }
      }
    } catch (err) {
      console.log(`[IG-METRICS] Embed error: ${err}`);
    }
  }

  console.log(`[IG-METRICS] Final: views=${views}, likes=${likes}, comments=${comments}, shares=${shares}`);
  return { views, likes, comments, shares };
}
