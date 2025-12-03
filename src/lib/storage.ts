import { Storage } from "@google-cloud/storage";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Use Google Cloud Storage only in production (not localhost)
const IS_PRODUCTION = process.env.NODE_ENV === "production" || process.env.VERCEL || process.env.K_SERVICE;
const USE_GCS = IS_PRODUCTION && process.env.GCS_BUCKET_NAME ? true : false;
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || "";

// Local storage path for development
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

// Initialize GCS client (uses default credentials in Cloud Run)
let storage: Storage | null = null;
if (USE_GCS) {
  try {
    storage = new Storage();
  } catch (e) {
    console.warn("GCS initialization failed, falling back to local storage");
  }
}

async function saveLocally(file: Buffer, key: string): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  
  const filePath = path.join(UPLOAD_DIR, key);
  const fileDir = path.dirname(filePath);
  await mkdir(fileDir, { recursive: true });
  
  await writeFile(filePath, file);
  
  return `/uploads/${key}`;
}

export async function uploadFile(
  file: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  if (USE_GCS && storage) {
    // Upload to Google Cloud Storage
    try {
      const bucket = storage.bucket(GCS_BUCKET_NAME);
      const blob = bucket.file(key);
      
      await blob.save(file, {
        contentType,
        metadata: {
          cacheControl: "public, max-age=31536000",
        },
      });

      // Return the GCS URL
      return `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${key}`;
    } catch (error) {
      console.error("Error uploading to GCS, falling back to local:", error);
      // Fallback to local storage if GCS fails
      return saveLocally(file, key);
    }
  } else {
    // Use local storage for development
    try {
      return await saveLocally(file, key);
    } catch (error) {
      console.error("Error saving file locally:", error);
      throw error;
    }
  }
}

export async function getFileUrl(key: string): Promise<string> {
  if (USE_GCS) {
    // For GCS, return public URL
    if (key.startsWith("https://")) {
      return key;
    }
    return `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${key}`;
  } else {
    // For local storage
    if (key.startsWith("/uploads/")) {
      return key;
    }
    return `/uploads/${key}`;
  }
}

export function generateFileKey(type: "invoices" | "slips", fileName: string): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `${type}/${timestamp}-${randomId}-${sanitizedName}`;
}

// Backwards compatibility - export old names too
export const uploadToS3 = uploadFile;
export const getSignedFileUrl = getFileUrl;

