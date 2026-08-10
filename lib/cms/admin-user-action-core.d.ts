declare module '@/lib/cms/admin-user-action-core.mjs' {
  import type {AdminUserSummary} from '@/lib/cms/admin-users';

  export type AdminUserActionState = {
    status: 'idle' | 'success' | 'error';
    messageKey: string;
    temporaryPassword?: string;
    user?: AdminUserSummary;
  };

  export function createAdminUserIdleState(): AdminUserActionState;
  export function createAdminUserSuccessState(
    messageKey: string,
    user: AdminUserSummary,
    temporaryPassword?: string
  ): AdminUserActionState;
  export function createAdminUserErrorState(messageKey: string): AdminUserActionState;
}
