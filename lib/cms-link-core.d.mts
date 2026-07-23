export function resolveCmsHref(
  locale: string,
  value: unknown,
  fallback?: string,
  parameters?: Record<string, string | number>
): string;

export function appendCmsQuery(
  href: string,
  values: Record<string, string | number | null | undefined>
): string;
