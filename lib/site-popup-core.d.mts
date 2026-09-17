export type SitePopupItem = {
  id: string;
  enabled: boolean;
  image: string;
  startsAt: string;
  endsAt: string;
};

export type SitePopupConfig = {
  items: SitePopupItem[];
};

export type SitePopupValidationError =
  | 'imageRequired'
  | 'scheduleRequired'
  | 'invalidDate'
  | 'endAfterStart';

export type SitePopupValidationResult =
  | {ok: true; item: SitePopupItem}
  | {ok: false; error: SitePopupValidationError};

export const emptySitePopupConfig: Readonly<SitePopupConfig>;
export function normalizeSitePopupConfig(value: unknown): SitePopupConfig;
export function normalizeSitePopupItem(value: unknown, fallbackId?: string): SitePopupItem;
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
export function getActiveSitePopupItems(value: unknown, now?: number): SitePopupItem[];
export type SitePopupCarouselState = {
  activeIndex: number;
  autoRotate: boolean;
  failedImages: string[];
};
export type SitePopupCarouselAction =
  | {type: 'advance' | 'previous' | 'next'; length: number}
  | {type: 'select'; index: number; length: number}
  | {type: 'toggle-autoplay'}
  | {type: 'image-failed'; key: string};
export function createSitePopupCarouselState(): SitePopupCarouselState;
export function reduceSitePopupCarouselState(
  state: SitePopupCarouselState,
  action: SitePopupCarouselAction
): SitePopupCarouselState;
export function sitePopupStorageKeys(version: string): {
  session: string;
  persistent: string;
};
export function isSitePopupDismissed(
  version: string,
  sessionValue: string | null,
  persistentValue: string | null
): boolean;
