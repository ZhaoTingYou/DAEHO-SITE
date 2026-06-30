export function resolveVideoSource(value?: string) {
  const trimmed = value?.trim() ?? '';

  if (!trimmed) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  if (trimmed.startsWith('videos/')) {
    return `/${trimmed}`;
  }

  if (trimmed.startsWith('video/')) {
    return `/videos/${trimmed.slice('video/'.length)}`;
  }

  return `/videos/${trimmed}`;
}
