export type ExternalSiteItem = {
  id: string;
  label: string;
  href: string;
  enabled: boolean;
};

export type SubmittedExternalSiteItem = {
  id: string;
  labelKo: string;
  labelEn: string;
  href: string;
  enabled: boolean;
};

export function parseExternalSitesSubmission(raw: string): {
  ko: ExternalSiteItem[];
  en: ExternalSiteItem[];
};
export function getVisibleExternalSites(value: unknown): ExternalSiteItem[];
export function isValidExternalSiteHref(value: unknown): boolean;
