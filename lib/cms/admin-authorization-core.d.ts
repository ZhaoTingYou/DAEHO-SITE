declare module '@/lib/cms/admin-authorization-core.mjs' {
  export type AdminRole = 'OWNER' | 'EDITOR';

  export type AdminCapability =
    | 'content:read'
    | 'content:write'
    | 'content:delete'
    | 'inquiries:read'
    | 'inquiries:write'
    | 'analytics:read'
    | 'notifications:manage'
    | 'system:manage'
    | 'users:manage'
    | 'account:self';

  export const adminCapabilities: AdminCapability[];

  export function normalizeAdminEmail(value: unknown): string;
  export function hasAdminCapability(role: AdminRole, capability: AdminCapability): boolean;
  export function isPasswordChangeOnlyPath(pathname: string): boolean;
  export function generateTemporaryAdminPassword(): string;
}
