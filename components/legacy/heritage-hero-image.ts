import {imageExists} from '@/lib/image-exists';

export function resolveHeritageHeroImage(...values: unknown[]) {
  for (const value of values) {
    if (isImagePath(value) && imageExists(value.trim())) {
      return value.trim();
    }
  }

  return undefined;
}

export function resolveHeritageHeroPlaceholder(value: string) {
  return isImagePath(value) ? '' : value;
}

function isImagePath(value: unknown): value is string {
  return typeof value === 'string' && /\.(png|jpe?g|webp|gif|svg)(?:[?#].*)?$/i.test(value.trim());
}
