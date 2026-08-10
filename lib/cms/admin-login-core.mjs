import {normalizeAdminEmail} from './admin-authorization-core.mjs';

export function createAdminLoginAttemptKey(email, ipAddress) {
  const normalizedIp = typeof ipAddress === 'string' && ipAddress.trim()
    ? ipAddress.trim()
    : 'local';
  return `${normalizeAdminEmail(email)}|${normalizedIp}`;
}
