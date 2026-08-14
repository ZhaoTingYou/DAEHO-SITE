'use server';

import {revalidatePath} from 'next/cache';

import {generateTemporaryAdminPassword} from '@/lib/cms/admin-authorization-core.mjs';
import {
  createAdminUserErrorState,
  createAdminUserSuccessState,
  type AdminUserActionState
} from '@/lib/cms/admin-user-action-core.mjs';
import {assertAdminCapability} from '@/lib/cms/admin-session';
import {
  createAdminEditor,
  resetAdminEditorPassword,
  updateAdminEditorExpiration,
  updateAdminEditorStatus
} from '@/lib/cms/admin-users';
import {CmsBackendError} from '@/lib/cms/repositories';

export async function createEditorAction(
  _previous: AdminUserActionState,
  formData: FormData
): Promise<AdminUserActionState> {
  const identity = await assertAdminCapability('users:manage');
  const email = formValue(formData, 'email');
  const temporaryPassword = generateTemporaryAdminPassword();

  try {
    const user = await createAdminEditor(identity, email, temporaryPassword);
    revalidatePath('/admin/users');
    return createAdminUserSuccessState('users.successCreated', user, temporaryPassword);
  } catch (error) {
    return userActionError(error);
  }
}

export async function resetEditorPasswordAction(
  _previous: AdminUserActionState,
  formData: FormData
): Promise<AdminUserActionState> {
  const identity = await assertAdminCapability('users:manage');
  const targetId = formValue(formData, 'targetId');
  const temporaryPassword = generateTemporaryAdminPassword();

  try {
    const user = await resetAdminEditorPassword(identity, targetId, temporaryPassword);
    revalidatePath('/admin/users');
    return createAdminUserSuccessState('users.successReset', user, temporaryPassword);
  } catch (error) {
    return userActionError(error);
  }
}

export async function setEditorStatusAction(
  _previous: AdminUserActionState,
  formData: FormData
): Promise<AdminUserActionState> {
  const identity = await assertAdminCapability('users:manage');
  const targetId = formValue(formData, 'targetId');
  const status = formValue(formData, 'status');
  if (status !== 'active' && status !== 'disabled') {
    return createAdminUserErrorState('users.errorValidation');
  }

  try {
    const user = await updateAdminEditorStatus(identity, targetId, status);
    revalidatePath('/admin/users');
    return createAdminUserSuccessState('users.successStatus', user);
  } catch (error) {
    return userActionError(error);
  }
}

export async function setEditorExpirationAction(
  _previous: AdminUserActionState,
  formData: FormData
): Promise<AdminUserActionState> {
  const identity = await assertAdminCapability('users:manage');
  const targetId = formValue(formData, 'targetId');
  const expirationDate = formValue(formData, 'expirationDate');
  const expiresAt = expirationDate ? new Date(`${expirationDate}T23:59:59+09:00`) : null;
  if (!expiresAt || !Number.isFinite(expiresAt.getTime())) {
    return createAdminUserErrorState('users.errorValidation');
  }

  try {
    const user = await updateAdminEditorExpiration(identity, targetId, expiresAt.toISOString());
    revalidatePath('/admin/users');
    return createAdminUserSuccessState('users.successExpiration', user);
  } catch (error) {
    return userActionError(error);
  }
}

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function userActionError(error: unknown) {
  if (error instanceof CmsBackendError) {
    if (error.status === 400) {
      return createAdminUserErrorState('users.errorValidation');
    }
    if (error.status === 404) {
      return createAdminUserErrorState('users.errorNotFound');
    }
    if (error.status === 409) {
      return createAdminUserErrorState('users.errorConflict');
    }
  }
  return createAdminUserErrorState('users.errorServer');
}
