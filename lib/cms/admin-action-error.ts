export const adminActionErrorParam = 'cmsError';
export const adminActionErrorDetailParam = 'cmsErrorDetail';

const fallbackMessage = 'CMS operation failed. Please try again.';
const maxErrorMessageLength = 320;

type ErrorIssue = {
  path?: unknown;
  message?: unknown;
};

type ErrorPayload = {
  error?: unknown;
  issues?: unknown;
};

type ErrorLike = {
  message?: unknown;
  payload?: unknown;
  issues?: unknown;
};

export function appendAdminActionError(path: string, error: unknown) {
  const [pathname, query = ''] = path.split('?');
  const params = new URLSearchParams(query);

  params.set(adminActionErrorParam, '1');
  params.set(adminActionErrorDetailParam, getAdminActionErrorMessage(error));

  return `${pathname}?${params.toString()}`;
}

export function readAdminActionErrorMessage(
  searchParams: Record<string, unknown> | null | undefined,
  legacyErrorMessage = fallbackMessage
) {
  if (!searchParams) {
    return null;
  }

  if (stringValue(searchParams[adminActionErrorParam])) {
    return sanitizeMessage(stringValue(searchParams[adminActionErrorDetailParam]) || legacyErrorMessage);
  }

  if (stringValue(searchParams.error) && legacyErrorMessage) {
    return legacyErrorMessage;
  }

  return null;
}

export function getAdminActionErrorMessage(error: unknown) {
  const errorLike = isObject(error) ? (error as ErrorLike) : null;
  const payload = isObject(errorLike?.payload) ? (errorLike.payload as ErrorPayload) : null;
  const payloadMessage = payload ? messageFromPayload(payload) : '';
  const issueMessage = messageFromIssues(errorLike?.issues);
  const errorMessage = stringValue(errorLike?.message);

  return sanitizeMessage(payloadMessage || issueMessage || errorMessage || fallbackMessage);
}

function messageFromPayload(payload: ErrorPayload) {
  const title = stringValue(payload.error);
  const issues = messageFromIssues(payload.issues);

  if (title && issues) {
    return `${title}: ${issues}`;
  }

  return title || issues;
}

function messageFromIssues(value: unknown) {
  if (!Array.isArray(value)) {
    return '';
  }

  return value
    .map((issue) => {
      if (!isObject(issue)) {
        return '';
      }

      const {path, message} = issue as ErrorIssue;
      const issuePath = Array.isArray(path) ? path.filter(Boolean).join('.') : stringValue(path);
      const issueMessage = stringValue(message);

      if (issuePath && issueMessage) {
        return `${issuePath}: ${issueMessage}`;
      }

      return issueMessage;
    })
    .filter(Boolean)
    .join('; ');
}

function sanitizeMessage(value: string) {
  const normalized = value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();

  if (normalized.length <= maxErrorMessageLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxErrorMessageLength)}...`;
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object');
}
