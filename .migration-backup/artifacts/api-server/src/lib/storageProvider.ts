import { randomUUID } from "crypto";
import {
  ObjectStorageService,
} from "./objectStorage";
import {
  getSupabaseUploadUrl,
  getSupabasePublicUrl,
  downloadSupabaseObject,
  isSupabaseStorageAvailable,
  UploadUrlResult as SupabaseUploadResult,
} from "./supabaseStorage";

export interface UploadUrlResult {
  uploadURL: string;
  objectPath: string;
  publicURL: string;
}

const objectStorageService = new ObjectStorageService();

export function isUsingSupabaseStorage(): boolean {
  return isSupabaseStorageAvailable();
}

export async function getUploadUrl(
  name: string,
  contentType: string,
): Promise<UploadUrlResult> {
  if (isSupabaseStorageAvailable()) {
    const key = `${randomUUID()}-${name}`;
    return getSupabaseUploadUrl(key, contentType);
  }

  const uploadURL = await objectStorageService.getObjectEntityUploadURL();
  const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
  const publicURL = `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : ""}/api/storage/objects/${objectPath.replace(/^\/objects\//, "")}`;
  return { uploadURL, objectPath, publicURL };
}

export async function getPublicUrl(objectPath: string): Promise<string> {
  if (objectPath.startsWith("/supabase/")) {
    return getSupabasePublicUrl(objectPath);
  }
  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "";
  return `${baseUrl}/api/storage/objects/${objectPath.replace(/^\/objects\//, "")}`;
}

export async function downloadObject(
  objectPath: string,
): Promise<{ buffer: Buffer; contentType: string | null }> {
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
  if (rawPath.startsWith("/supabase/")) return rawPath;
  return objectStorageService.normalizeObjectEntityPath(rawPath);
}
