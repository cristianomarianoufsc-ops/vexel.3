import { randomUUID } from "crypto";
import fsSync from "fs";
import fs from "fs/promises";
import path from "path";
import {
  ObjectStorageService,
} from "./objectStorage";
import {
  getSupabaseUploadUrl,
  getSupabasePublicUrl,
  downloadSupabaseObject,
  isSupabaseStorageAvailable,
} from "./supabaseStorage";
import { getPublicApiUrl } from "./youtube";
import { logger } from "./logger";

export interface UploadUrlResult {
  uploadURL: string;
  objectPath: string;
  publicURL: string;
}

export type StorageProviderType = "fly" | "supabase" | "r2";

const objectStorageService = new ObjectStorageService();

/**
 * Returns the directory used for local uploads.
 * Prefers persistent Fly.io volume at /data/vexelhub-uploads if mounted,
 * falling back to /tmp/vexelhub-uploads.
 */
export function getLocalStorageDir(): string {
  if (process.env.STORAGE_DIR) {
    return process.env.STORAGE_DIR;
  }
  try {
    if (fsSync.existsSync("/data")) {
      return "/data/vexelhub-uploads";
    }
  } catch {
    // ignore
  }
  return "/tmp/vexelhub-uploads";
}

export const LOCAL_PUBLIC_STORAGE_DIR = getLocalStorageDir();

/**
 * Determines active storage provider: 'fly' (local volume), 'supabase', or 'r2'.
 * Defaults to 'fly' on Fly.io to avoid external downtime, but can be switched
 * anytime via STORAGE_PROVIDER=supabase or STORAGE_PROVIDER=r2.
 */
export function getStorageProvider(): StorageProviderType {
  const configured = (process.env.STORAGE_PROVIDER || "").trim().toLowerCase();
  if (configured === "supabase") return "supabase";
  if (configured === "r2" || configured === "s3") return "r2";
  if (configured === "fly" || configured === "local") return "fly";

  if (process.env.USE_SUPABASE_STORAGE === "true" && isSupabaseStorageAvailable()) {
    return "supabase";
  }

  // Default to Fly.io storage
  return "fly";
}

export function sanitizeStorageFilename(name: string): string {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || "video.mp4";
}

export function isUsingSupabaseStorage(): boolean {
  return getStorageProvider() === "supabase";
}

async function getLocalPublicUploadUrl(key: string): Promise<UploadUrlResult> {
  const storageDir = getLocalStorageDir();
  await fs.mkdir(storageDir, { recursive: true });
  const baseUrl = getPublicApiUrl();
  const encodedKey = encodeURIComponent(key);
  return {
    uploadURL: `${baseUrl}/api/storage/direct-upload/${encodedKey}`,
    objectPath: `/local-public/${key}`,
    publicURL: `${baseUrl}/api/storage/public-media/${encodedKey}`,
  };
}

export async function getUploadUrl(
  name: string,
  contentType: string,
): Promise<UploadUrlResult> {
  const safeName = sanitizeStorageFilename(name);
  const key = `${randomUUID()}-${safeName}`;
  const provider = getStorageProvider();

  if (provider === "supabase" && isSupabaseStorageAvailable()) {
    try {
      return await getSupabaseUploadUrl(key, contentType);
    } catch (error) {
      logger.warn(
        { err: error, key },
        "Supabase Storage signed upload URL failed; falling back to direct Fly storage",
      );
      return getLocalPublicUploadUrl(key);
    }
  }

  if (process.env.REPLIT_DEV_DOMAIN) {
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
    const publicURL = `https://${process.env.REPLIT_DEV_DOMAIN}/api/storage/objects/${objectPath.replace(/^\/objects\//, "")}`;
    return { uploadURL, objectPath, publicURL };
  }

  return getLocalPublicUploadUrl(key);
}

export async function getPublicUrl(objectPath: string): Promise<string> {
  if (objectPath.startsWith("/local-public/")) {
    const key = objectPath.slice("/local-public/".length);
    return `${getPublicApiUrl()}/api/storage/public-media/${encodeURIComponent(key)}`;
  }
  if (objectPath.startsWith("/supabase/")) {
    return getSupabasePublicUrl(objectPath);
  }
  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : getPublicApiUrl();
  return `${baseUrl}/api/storage/objects/${objectPath.replace(/^\/objects\//, "")}`;
}

export async function downloadObject(
  objectPath: string,
): Promise<{ buffer: Buffer; contentType: string | null }> {
  if (objectPath.startsWith("/local-public/")) {
    const key = path.basename(objectPath.slice("/local-public/".length));
    const storageDir = getLocalStorageDir();
    const filePath = path.join(storageDir, key);
    const metaPath = `${filePath}.meta.json`;
    let buffer: Buffer;
    try {
      buffer = await fs.readFile(filePath);
    } catch (err: any) {
      if (err?.code === "ENOENT") {
        throw new Error(
          `O arquivo de vídeo não foi encontrado no servidor (${filePath}). Verifique se o volume persistente /data está montado ou se o arquivo expirou.`,
        );
      }
      throw err;
    }
    let contentType: string | null = "video/mp4";
    try {
      const meta = JSON.parse(await fs.readFile(metaPath, "utf8")) as { contentType?: string };
      if (meta.contentType) contentType = meta.contentType;
    } catch {
      if (key.endsWith(".jpg") || key.endsWith(".jpeg")) contentType = "image/jpeg";
      else if (key.endsWith(".png")) contentType = "image/png";
    }
    return { buffer, contentType };
  }
  if (objectPath.startsWith("/supabase/")) {
    return downloadSupabaseObject(objectPath);
  }
  const file = await objectStorageService.getObjectEntityFile(objectPath);
  const response = await objectStorageService.downloadObject(file);
  const contentType = response.headers.get("content-type") || null;
  const buffer = Buffer.from(await response.arrayBuffer());
  return { buffer, contentType };
}

/**
 * Removes local video and metadata files after successful publish to free volume space.
 */
export async function cleanupObject(objectPath: string | null | undefined): Promise<void> {
  if (!objectPath) return;
  try {
    if (objectPath.startsWith("/local-public/")) {
      const key = path.basename(objectPath.slice("/local-public/".length));
      const storageDir = getLocalStorageDir();
      const filePath = path.join(storageDir, key);
      const metaPath = `${filePath}.meta.json`;
      await fs.unlink(filePath).catch(() => {});
      await fs.unlink(metaPath).catch(() => {});
      logger.info({ key }, "Vídeo local removido do disco após publicação bem-sucedida");
    }
  } catch (err: any) {
    logger.warn({ err: err?.message, objectPath }, "Falha ao remover arquivo de vídeo local após publicação");
  }
}

export function normalizeObjectPath(rawPath: string): string {
  if (rawPath.startsWith("/local-public/") || rawPath.startsWith("/supabase/")) return rawPath;
  return objectStorageService.normalizeObjectEntityPath(rawPath);
}

