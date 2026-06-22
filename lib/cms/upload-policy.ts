import path from 'node:path';

export const maxImageUploadBytes = 10 * 1024 * 1024;
export const maxMultipartImageRequestBytes = maxImageUploadBytes + 1024 * 1024;

export const allowedImageMimeTypes = new Set([
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp'
]);

export const allowedImageExtensions = new Set(['.gif', '.jpeg', '.jpg', '.png', '.webp']);

export function isAllowedImageUpload(file: File) {
  return getImageUploadError(file) === null;
}

export function getImageUploadError(file: File) {
  if (file.size <= 0) {
    return 'File is empty.';
  }

  if (file.size > maxImageUploadBytes) {
    return 'Image file is too large.';
  }

  if (!allowedImageMimeTypes.has(file.type)) {
    return 'Unsupported image MIME type.';
  }

  if (!allowedImageExtensions.has(path.extname(file.name).toLowerCase())) {
    return 'Unsupported image extension.';
  }

  return null;
}
