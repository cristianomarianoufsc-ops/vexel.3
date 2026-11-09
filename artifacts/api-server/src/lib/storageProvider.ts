import { randomUUID } from "crypto";
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

const objectStorageService = new ObjectStorageService();
export const LOCAL_PUBLIC_STORAGE_DIR = "/tmp/vexelhub-uploads";

export function sanitizeStorageFilename(name: string): string {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || "video.mp4";
}

export function isUsingSupabaseStorage(): boolean {
  return isSupabaseStorageAvailable();
}

async function getLocalPublicUploadUrl(key: string): Promise<UploadUrlResult> {
  await fs.mkdir(LOCAL_PUBLIC_STORAGE_DIR, { recursive: true });
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

  if (isSupabaseStorageAvailable()) {
    try {
      return await getSupabaseUploadUrl(key, contentType);
    } catch (error) {
      logger.warn(
        { err: error, key },
        "Supabase Storage signed upload URL failed; falling back to direct API storage",
      );
      return getLocalPublicUploadUrl(key);
    }
  }

  if (!process.env.REPLIT_DEV_DOMAIN) {
    return getLocalPublicUploadUrl(key);
  }

  const uploadURL = await objectStorageService.getObjectEntityUploadURL();
  const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
  const publicURL = `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : ""}/api/storage/objects/${objectPath.replace(/^\/objects\//, "")}`;
  return { uploadURL, objectPath, publicURL };
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
    const filePath = path.join(LOCAL_PUBLIC_STORAGE_DIR, key);
    const metaPath = `${filePath}.meta.json`;
    const buffer = await fs.readFile(filePath);
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

export function normalizeObjectPath(rawPath: string): string {
  if (rawPath.startsWith("/local-public/") || rawPath.startsWith("/supabase/")) return rawPath;
  return objectStorageService.normalizeObjectEntityPath(rawPath);
}
