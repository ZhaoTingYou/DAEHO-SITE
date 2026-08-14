declare module '@/lib/cms/admin-session-core.mjs' {
  import type {AdminIdentity} from '@/lib/cms/admin-users';

  export function createSignedAdminSession(
    identity: AdminIdentity,
    secret: string,
    issuedAtMs: number
  ): string;

  export function parseSignedAdminSession(
    value: string,
    secret: string,
    nowMs: number
  ): AdminIdentity | null;
}
