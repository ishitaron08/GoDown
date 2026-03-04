import ImageKit from "imagekit";

export const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!,
});

/**
 * Upload a base64 or buffer image to ImageKit.
 * @param file  base64 string or Buffer
 * @param fileName  desired file name
 * @param folder  ImageKit folder path (default: "/godown")
 */
export async function uploadImage(
  file: string | Buffer,
  fileName: string,
  folder = "/godown"
) {
  const response = await imagekit.upload({
    file,
    fileName,
    folder,
    useUniqueFileName: true,
  });
  return {
    url: response.url,
    fileId: response.fileId,
    thumbnailUrl: response.thumbnailUrl,
  };
}

/**
 * Delete an image from ImageKit by fileId.
 */
export async function deleteImage(fileId: string) {
  return imagekit.deleteFile(fileId);
}

/**
 * Generate an ImageKit auth signature (for client-side uploads).
 */
export function getImageKitAuth() {
  return imagekit.getAuthenticationParameters();
}
