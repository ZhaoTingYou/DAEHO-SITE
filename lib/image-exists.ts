import {existsSync} from 'node:fs';
import path from 'node:path';

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
    return true;
  }

  if (assetPath.startsWith('/') && !assetPath.startsWith('/images/')) {
    return false;
  }

  if (existsSync(path.join(process.cwd(), 'public', 'images', assetPath.replace(/^\/?images\//, '')))) {
    return true;
  }

  return false;
}
