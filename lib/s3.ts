import ImageKit from "imagekit";

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "",
});

// Allowed file types and max size
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface UploadResult {
  url: string;
  fileId: string;
  name: string;
  thumbnailUrl?: string;
}

export interface UploadUrlResult {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

export interface DownloadUrlResult {
  downloadUrl: string;
  expiresIn: number;
}

/**
 * Validate file before upload
 */
export function validateFile(contentType: string, fileSize?: number): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(contentType)) {
    return {
      valid: false,
      error: `Invalid file type: ${contentType}. Allowed: PDF, PNG, JPG`,
    };
  }

  if (fileSize && fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size: 5MB`,
    };
  }

  return { valid: true };
}

/**
 * Get ImageKit authentication parameters for client-side upload
 */
export function getAuthenticationParameters() {
  return imagekit.getAuthenticationParameters();
}

/**
 * Upload a file to ImageKit (server-side)
 */
export async function uploadFile(
  file: string | Buffer,
  fileName: string,
  folder: string
): Promise<UploadResult> {
  const result = await imagekit.upload({
    file,
    fileName,
    folder,
  });

  return {
    url: result.url,
    fileId: result.fileId,
    name: result.name,
    thumbnailUrl: result.thumbnailUrl,
  };
}

/**
 * Generate a presigned upload URL (returns auth params for client-side upload)
 */
export async function generatePresignedUploadUrl(
  key: string,
  _contentType: string,
  _expiresIn: number = 900
): Promise<UploadUrlResult> {
  const authParams = imagekit.getAuthenticationParameters();
  
  return {
    uploadUrl: process.env.IMAGEKIT_URL_ENDPOINT || "",
    key,
    expiresIn: _expiresIn,
    ...authParams,
  };
}

/**
 * Get a URL for file download/view
 */
export async function generatePresignedDownloadUrl(
  fileId: string,
  _expiresIn: number = 3600
): Promise<DownloadUrlResult> {
  const file = await imagekit.getFileDetails(fileId);
  
  return {
    downloadUrl: file.url,
    expiresIn: _expiresIn,
  };
}

/**
 * Delete a file from ImageKit
 */
export async function deleteFile(fileId: string): Promise<void> {
  await imagekit.deleteFile(fileId);
}

/**
 * Generate a unique file key for storage
 */
export function generateFileKey(
  tenantId: string,
  folder: string,
  filename: string
): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `${tenantId}/${folder}/${timestamp}-${sanitizedFilename}`;
}

export { imagekit, ALLOWED_TYPES, MAX_FILE_SIZE };
