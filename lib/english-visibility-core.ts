type SiteFeatures = {
  englishEnabled?: unknown;
};

type GroupedContent = {
  features?: SiteFeatures;
};

type EnglishVisibilitySource = {
  common?: {
    features?: SiteFeatures;
  };
  content?: GroupedContent & {
    __groups?: {
      main?: GroupedContent;
    };
  };
  features?: SiteFeatures;
  __groups?: {
    main?: GroupedContent;
  };
};

export function isEnglishEnabled(
  source: EnglishVisibilitySource | null | undefined
) {
  const features =
    source?.common?.features ??
    source?.features ??
    source?.content?.features ??
    source?.content?.__groups?.main?.features ??
    source?.__groups?.main?.features;

  return features?.englishEnabled === true;
}

export function getPublicLocales<T extends readonly string[]>(
  availableLocales: T,
  englishEnabled: boolean
): Array<T[number]> {
  return englishEnabled
    ? [...availableLocales]
    : availableLocales.filter((locale) => locale !== 'en');
}

export function getKoreanFallbackPath(pathname: string) {
  return pathname === '/en'
    ? '/ko'
    : pathname.startsWith('/en/')
      ? `/ko${pathname.slice(3)}`
      : pathname;
}
