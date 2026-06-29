import 'server-only';

import {CmsBackendError, cmsBackendRequest} from './repositories';

export type AdminPasswordStatus = {
  configured: boolean;
  version: string;
};

export type AdminPasswordVerification = AdminPasswordStatus & {
  valid: boolean;
};

export async function getStoredAdminPasswordStatus() {
  return cmsBackendRequest<AdminPasswordStatus>('/api/admin/auth/status', {admin: true});
}

export async function verifyStoredAdminPassword(password: string) {
  return cmsBackendRequest<AdminPasswordVerification>('/api/admin/auth/verify-password', {
    admin: true,
    method: 'POST',
    body: {password}
  });
}

export async function changeStoredAdminPassword(currentPassword: string, newPassword: string) {
  return cmsBackendRequest<AdminPasswordStatus & {ok: boolean}>('/api/admin/auth/change-password', {
    admin: true,
    method: 'POST',
    body: {currentPassword, newPassword}
  });
}

export function isCmsBackendPasswordError(error: unknown, status: number) {
  return error instanceof CmsBackendError && error.status === status;
}
