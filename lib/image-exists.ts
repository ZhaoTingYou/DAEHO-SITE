import {isKnownStorageImageKey} from '@/lib/storage-image-keys.mjs';

export function imageExists(filename: string) {
  const value = filename.trim();

  if (!value) {
    return false;
  }

  const assetPath = value.split(/[?#]/)[0] ?? '';

  if (/^https?:\/\//i.test(assetPath)) {
    return true;
  }

  if (assetPath.startsWith('/uploads/') || assetPath.startsWith('uploads/')) {
    return isKnownStorageImageKey(assetPath);
  }

  if (assetPath.startsWith('/images/') || assetPath.startsWith('images/')) {
    return isKnownStorageImageKey(assetPath);
  }

  if (assetPath.startsWith('/')) {
    return false;
  }

  return isKnownStorageImageKey(assetPath);
}
