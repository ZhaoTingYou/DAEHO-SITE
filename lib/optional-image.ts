export function optionalImage(value: unknown, key: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return '';
  }

  const image = (value as Record<string, unknown>)[key];
  return typeof image === 'string' ? image.trim() : '';
}
