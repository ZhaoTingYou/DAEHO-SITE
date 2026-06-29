type SiteFeatures = {
  golfEnabled?: unknown;
};

type GroupedContent = {
  features?: SiteFeatures;
};

type GolfVisibilitySource = {
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

export function isGolfEnabled(source: GolfVisibilitySource | null | undefined) {
  const features =
    source?.common?.features ??
    source?.features ??
    source?.content?.features ??
    source?.content?.__groups?.main?.features ??
    source?.__groups?.main?.features;

  return features?.golfEnabled === true;
}
