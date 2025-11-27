import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Local file storage for development (no S3 needed)
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function uploadToS3(
  file: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  // Use local storage for development
  try {
    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });
    
    // Create subdirectories if needed
    const filePath = path.join(UPLOAD_DIR, key);
    const fileDir = path.dirname(filePath);
    await mkdir(fileDir, { recursive: true });
    
    // Write file
    await writeFile(filePath, file);
    
    // Return the public URL path
    return `/uploads/${key}`;
  } catch (error) {
    console.error("Error saving file:", error);
    throw error;
  }
}

export async function getSignedFileUrl(key: string): Promise<string> {
  // For local storage, just return the public path
  if (key.startsWith("/uploads/")) {
    return key;
  }
  return `/uploads/${key}`;
}

export function generateFileKey(type: "invoices" | "slips", fileName: string): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `${type}/${timestamp}-${randomId}-${sanitizedName}`;
}
