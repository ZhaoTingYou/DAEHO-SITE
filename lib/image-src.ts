export function imageSrc(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('/uploads/')) {
    return `/images/${trimmed.slice('/uploads/'.length)}`;
  }

  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  if (trimmed.startsWith('uploads/')) {
    return `/images/${trimmed.slice('uploads/'.length)}`;
  }

  return `/images/${trimmed}`;
}
