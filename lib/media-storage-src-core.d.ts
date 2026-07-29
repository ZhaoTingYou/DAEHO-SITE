declare module '@/lib/media-storage-src-core.mjs' {
  export const DEFAULT_MEDIA_STORAGE_BASE_URL: string;
  export const MEDIA_STORAGE_BASE_URL: string;

  export function storageImageSrc(value: string): string;
  export function storageVideoSrc(value?: string): string;
}
