import 'server-only';

import {cmsBackendRequest} from './repositories';

export type AdminRole = 'OWNER' | 'EDITOR';

export type AdminIdentity = {
  id: string;
  email: string;
  role: AdminRole;
  sessionVersion: number;
  expiresAt: string | null;
  mustChangePassword: boolean;
};

export type AdminUserSummary = AdminIdentity & {
  status: 'active' | 'disabled';
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function authenticateAdmin(email: string, password: string) {
  const response = await cmsBackendRequest<{user: AdminIdentity}>('/api/admin/auth/login', {
    admin: true,
    method: 'POST',
    body: {email, password}
  });
  return response.user;
}

export async function validateAdminIdentity(userId: string, sessionVersion: number) {
  const response = await cmsBackendRequest<{user: AdminIdentity}>('/api/admin/auth/session', {
    admin: true,
    method: 'POST',
    body: {userId, sessionVersion}
  });
  return response.user;
}

export async function changeOwnAdminPassword(
  identity: AdminIdentity,
  currentPassword: string,
  newPassword: string
) {
  const response = await cmsBackendRequest<{user: AdminIdentity}>(
    '/api/admin/auth/change-own-password',
    {
      admin: true,
      method: 'POST',
      headers: actorHeaders(identity),
      body: {currentPassword, newPassword}
    }
  );
  return response.user;
}

export async function listAdminUsers(identity: AdminIdentity) {
  const response = await cmsBackendRequest<{items: AdminUserSummary[]}>('/api/admin/users', {
    admin: true,
    headers: actorHeaders(identity)
  });
  return response.items;
}

export async function createAdminEditor(
  identity: AdminIdentity,
  email: string,
  temporaryPassword: string
) {
  const response = await cmsBackendRequest<{user: AdminUserSummary}>('/api/admin/users/editors', {
    admin: true,
    method: 'POST',
    headers: actorHeaders(identity),
    body: {email, temporaryPassword}
  });
  return response.user;
}

export async function resetAdminEditorPassword(
  identity: AdminIdentity,
  targetId: string,
  temporaryPassword: string
) {
  const response = await cmsBackendRequest<{user: AdminUserSummary}>(
    `/api/admin/users/${encodeURIComponent(targetId)}/reset-password`,
    {
      admin: true,
      method: 'POST',
      headers: actorHeaders(identity),
      body: {temporaryPassword}
    }
  );
  return response.user;
}

export async function updateAdminEditorStatus(
  identity: AdminIdentity,
  targetId: string,
  status: 'active' | 'disabled'
) {
  const response = await cmsBackendRequest<{user: AdminUserSummary}>(
    `/api/admin/users/${encodeURIComponent(targetId)}/status`,
    {
      admin: true,
      method: 'PATCH',
      headers: actorHeaders(identity),
      body: {status}
    }
  );
  return response.user;
}

export async function updateAdminEditorExpiration(
  identity: AdminIdentity,
  targetId: string,
  expiresAt: string
) {
  const response = await cmsBackendRequest<{user: AdminUserSummary}>(
    `/api/admin/users/${encodeURIComponent(targetId)}/expiration`,
    {
      admin: true,
      method: 'PATCH',
      headers: actorHeaders(identity),
      body: {expiresAt}
    }
  );
  return response.user;
}

function actorHeaders(identity: AdminIdentity) {
  return {
    'x-admin-user-id': identity.id,
    'x-admin-session-version': String(identity.sessionVersion)
  };
}
