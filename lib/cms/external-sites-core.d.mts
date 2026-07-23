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

export const externalSiteValidationErrorCodes: Readonly<{
  invalidJson: 'EXTERNAL_SITES_INVALID_JSON';
  invalidShape: 'EXTERNAL_SITES_INVALID_SHAPE';
  missingId: 'EXTERNAL_SITES_MISSING_ID';
  duplicateId: 'EXTERNAL_SITES_DUPLICATE_ID';
  invalidUrl: 'EXTERNAL_SITES_INVALID_URL';
}>;

export type ExternalSiteValidationErrorCode =
  (typeof externalSiteValidationErrorCodes)[keyof typeof externalSiteValidationErrorCodes];

export class ExternalSiteValidationError extends Error {
  readonly code: ExternalSiteValidationErrorCode;
  constructor(code: ExternalSiteValidationErrorCode);
}

export function getExternalSiteValidationMessageKey(error: unknown): string | null;
export function parseExternalSitesSubmission(raw: string): {
  ko: ExternalSiteItem[];
  en: ExternalSiteItem[];
};
export function mergeExternalSitesWithDefaults(
  defaultValue: unknown,
  cmsValue: unknown
): Record<string, unknown> & {items: unknown[]};
export function getVisibleExternalSites(value: unknown): ExternalSiteItem[];
export function isValidExternalSiteHref(value: unknown): boolean;
