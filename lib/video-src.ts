import {storageVideoSrc} from '@/lib/media-storage-src-core.mjs';

export function resolveVideoSource(value?: string) {
  return storageVideoSrc(value);
}
