export type SitePopupConfig = {
  enabled: boolean;
  image: string;
  startsAt: string;
  endsAt: string;
};

export type SitePopupValidationError =
  | 'imageRequired'
  | 'scheduleRequired'
  | 'invalidDate'
  | 'endAfterStart';

export type SitePopupValidationResult =
  | {ok: true; config: SitePopupConfig}
  | {ok: false; error: SitePopupValidationError};

export const emptySitePopupConfig: Readonly<SitePopupConfig>;
export function normalizeSitePopupConfig(value: unknown): SitePopupConfig;
export function seoulDateTimeInputToIso(value: unknown): string;
export function sitePopupIsoToDateTimeInput(value: unknown): string;
export function validateSitePopupSubmission(input: {
  enabled: boolean;
  image: string;
  startsAtInput: string;
  endsAtInput: string;
}): SitePopupValidationResult;
export function isSitePopupActive(value: unknown, now?: number): boolean;
export function getSitePopupStatus(
  value: unknown,
  now?: number
): 'inactive' | 'scheduled' | 'active' | 'expired';
export function createSitePopupVersion(value: unknown): string;
export function sitePopupStorageKeys(version: string): {
  session: string;
  persistent: string;
};
export function isSitePopupDismissed(
  version: string,
  sessionValue: string | null,
  persistentValue: string | null
): boolean;
