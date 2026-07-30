import { createClient, SupabaseClient } from "@supabase/supabase-js";
import WebSocket from "ws";

let client: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: false },
    realtime: { transport: WebSocket as any },
  });
  return client;
}

function getBucket(): string {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "videos";
  return bucket;
}

export interface UploadUrlResult {
  uploadURL: string;
  objectPath: string;
  publicURL: string;
}

export async function getSupabaseUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 900,
): Promise<UploadUrlResult> {
  const supabase = getSupabaseClient();
  const bucket = getBucket();
  const fullPath = `uploads/${key}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(fullPath, {
      upsert: true,
    });

  if (error || !data?.signedUrl) {
    throw new Error(
      `Failed to create Supabase signed upload URL: ${error?.message ?? "unknown error"}`,
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(fullPath);

  return {
    uploadURL: data.signedUrl,
    objectPath: `/supabase/${bucket}/${fullPath}`,
    publicURL: publicUrl,
  };
}

export function parseSupabaseObjectPath(objectPath: string): {
  bucket: string;
  path: string;
} {
  const prefix = "/supabase/";
  if (!objectPath.startsWith(prefix)) {
    throw new Error(`Invalid Supabase object path: ${objectPath}`);
  }
  const withoutPrefix = objectPath.slice(prefix.length);
  const firstSlash = withoutPrefix.indexOf("/");
  if (firstSlash === -1) {
    throw new Error(`Invalid Supabase object path: ${objectPath}`);
  }
  const bucket = withoutPrefix.slice(0, firstSlash);
  const path = withoutPrefix.slice(firstSlash + 1);
  return { bucket, path };
}

export async function getSupabasePublicUrl(objectPath: string): Promise<string> {
  const { bucket, path } = parseSupabaseObjectPath(objectPath);
  const supabase = getSupabaseClient();
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicUrl;
}

export async function downloadSupabaseObject(
  objectPath: string,
): Promise<{ buffer: Buffer; contentType: string | null }> {
  const { bucket, path } = parseSupabaseObjectPath(objectPath);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) {
    throw new Error(
      `Failed to download Supabase object: ${error?.message ?? "unknown error"}`,
    );
  }
  const arrayBuffer = await data.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: data.type || null,
  };
}

export function isSupabaseStorageAvailable(): boolean {
  return Boolean(
    process.env.USE_SUPABASE_STORAGE === "true" ||
      (!process.env.REPLIT_DEV_DOMAIN &&
        process.env.SUPABASE_URL &&
        process.env.SUPABASE_SERVICE_ROLE_KEY),
  );
}
