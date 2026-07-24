const dateTimeInputPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const canonicalIsoPattern = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}):\d{2}\+09:00$/;

export const emptySitePopupConfig = Object.freeze({
  enabled: false,
  image: '',
  startsAt: '',
  endsAt: ''
});

export function normalizeSitePopupConfig(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};

  return {
    enabled: source.enabled === true,
    image: typeof source.image === 'string' ? source.image.trim() : '',
    startsAt: typeof source.startsAt === 'string' ? source.startsAt.trim() : '',
    endsAt: typeof source.endsAt === 'string' ? source.endsAt.trim() : ''
  };
}

export function seoulDateTimeInputToIso(value) {
  const match = dateTimeInputPattern.exec(typeof value === 'string' ? value.trim() : '');

  if (!match) {
    return '';
  }

  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const [year, month, day, hour, minute] = [yearText, monthText, dayText, hourText, minuteText].map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute
  ) {
    return '';
  }

  return `${yearText}-${monthText}-${dayText}T${hourText}:${minuteText}:00+09:00`;
}

export function sitePopupIsoToDateTimeInput(value) {
  const match = canonicalIsoPattern.exec(typeof value === 'string' ? value.trim() : '');
  return match?.[1] ?? '';
}

export function validateSitePopupSubmission({enabled, image, startsAtInput, endsAtInput}) {
  const normalizedImage = typeof image === 'string' ? image.trim() : '';
  const startsAt = startsAtInput ? seoulDateTimeInputToIso(startsAtInput) : '';
  const endsAt = endsAtInput ? seoulDateTimeInputToIso(endsAtInput) : '';

  if ((startsAtInput && !startsAt) || (endsAtInput && !endsAt)) {
    return {ok: false, error: 'invalidDate'};
  }

  if (enabled && !normalizedImage) {
    return {ok: false, error: 'imageRequired'};
  }

  if (enabled && (!startsAt || !endsAt)) {
    return {ok: false, error: 'scheduleRequired'};
  }

  if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) {
    return {ok: false, error: 'endAfterStart'};
  }

  return {
    ok: true,
    config: {
      enabled: enabled === true,
      image: normalizedImage,
      startsAt,
      endsAt
    }
  };
}

export function isSitePopupActive(value, now = Date.now()) {
  return getSitePopupStatus(value, now) === 'active';
}

export function getSitePopupStatus(value, now = Date.now()) {
  const config = normalizeSitePopupConfig(value);
  const startsAt = Date.parse(config.startsAt);
  const endsAt = Date.parse(config.endsAt);

  if (!config.enabled || !config.image || !Number.isFinite(startsAt) || !Number.isFinite(endsAt)) {
    return 'inactive';
  }

  if (now < startsAt) {
    return 'scheduled';
  }

  if (now >= endsAt) {
    return 'expired';
  }

  return 'active';
}

export function createSitePopupVersion(value) {
  const config = normalizeSitePopupConfig(value);
  const input = `${config.image}\u0000${config.startsAt}\u0000${config.endsAt}`;
  let hash = 2166136261;

  for (const character of input) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function sitePopupStorageKeys(version) {
  return {
    session: `daeho.sitePopup.session.${version}`,
    persistent: `daeho.sitePopup.dismissed.${version}`
  };
}

export function isSitePopupDismissed(version, sessionValue, persistentValue) {
  return sessionValue === version || persistentValue === version;
}
