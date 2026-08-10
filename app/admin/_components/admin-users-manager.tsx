'use client';

import {useActionState} from 'react';

import {
  createEditorAction,
  resetEditorPasswordAction,
  setEditorExpirationAction,
  setEditorStatusAction
} from '@/app/admin/user-actions';
import {createAdminUserIdleState, type AdminUserActionState} from '@/lib/cms/admin-user-action-core.mjs';
import type {AdminUserSummary} from '@/lib/cms/admin-users';

type Props = {
  initialUsers: AdminUserSummary[];
  messages: Record<string, string>;
};

export function AdminUsersManager({initialUsers, messages}: Props) {
  const t = (key: string) => messages[key] ?? key;
  const [createState, createAction, createPending] = useActionState(
    createEditorAction,
    createAdminUserIdleState()
  );

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-[#d9dee7] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-[#182033]">{t('users.createTitle')}</h2>
        <p className="mt-1 text-sm text-[#647084]">{t('users.createDescription')}</p>
        <form action={createAction} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="grid flex-1 gap-1.5 text-sm font-semibold text-[#344054]">
            <span>{t('users.email')}</span>
            <input
              name="email"
              type="email"
              autoComplete="off"
              required
              className="min-h-11 rounded-md border border-[#cbd3df] px-3"
            />
          </label>
          <button
            disabled={createPending}
            className="min-h-11 rounded-md bg-[#7a2230] px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t('users.create')}
          </button>
        </form>
        <ActionFeedback state={createState} t={t} />
      </section>

      <div className="grid gap-4">
        {initialUsers.map((user) => (
          <UserCard key={user.id} messages={messages} user={user} />
        ))}
      </div>
    </div>
  );
}

function UserCard({messages, user}: {messages: Record<string, string>; user: AdminUserSummary}) {
  const t = (key: string) => messages[key] ?? key;
  const [resetState, resetAction, resetPending] = useActionState(
    resetEditorPasswordAction,
    createAdminUserIdleState()
  );
  const [statusState, statusAction, statusPending] = useActionState(
    setEditorStatusAction,
    createAdminUserIdleState()
  );
  const [expirationState, expirationAction, expirationPending] = useActionState(
    setEditorExpirationAction,
    createAdminUserIdleState()
  );
  const isEditor = user.role === 'EDITOR';

  return (
    <section className="rounded-lg border border-[#d9dee7] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="break-all text-base font-bold text-[#182033]">{user.email}</h2>
          <p className="mt-1 text-sm text-[#647084]">
            {t(`users.role.${user.role.toLowerCase()}`)} · {t(`users.status.${user.status}`)}
          </p>
        </div>
        {user.mustChangePassword ? (
          <span className="rounded-full bg-[#fffaeb] px-3 py-1 text-xs font-semibold text-[#b54708]">
            {t('users.firstLoginPending')}
          </span>
        ) : null}
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <Meta label={t('users.expiration')} value={formatDate(user.expiresAt, t('common.none'))} />
        <Meta label={t('users.lastLogin')} value={formatDate(user.lastLoginAt, t('users.never'))} />
        <Meta label={t('common.created')} value={formatDate(user.createdAt, t('common.none'))} />
      </dl>

      {isEditor ? (
        <div className="mt-5 grid gap-4 border-t border-[#e4e7ec] pt-5 lg:grid-cols-3">
          <form action={resetAction} className="grid content-start gap-2">
            <input type="hidden" name="targetId" value={user.id} />
            <button disabled={resetPending} className="min-h-10 rounded-md border border-[#cbd3df] px-3 text-sm font-semibold disabled:opacity-50">
              {t('users.resetPassword')}
            </button>
            <ActionFeedback state={resetState} t={t} />
          </form>

          <form action={statusAction} className="grid content-start gap-2">
            <input type="hidden" name="targetId" value={user.id} />
            <input type="hidden" name="status" value={user.status === 'active' ? 'disabled' : 'active'} />
            <button disabled={statusPending} className="min-h-10 rounded-md border border-[#cbd3df] px-3 text-sm font-semibold disabled:opacity-50">
              {t(user.status === 'active' ? 'users.disable' : 'users.enable')}
            </button>
            <ActionFeedback state={statusState} t={t} />
          </form>

          <form action={expirationAction} className="grid content-start gap-2">
            <input type="hidden" name="targetId" value={user.id} />
            <label className="grid gap-1 text-xs font-semibold text-[#647084]">
              <span>{t('users.expiration')}</span>
              <input
                name="expirationDate"
                type="date"
                defaultValue={user.expiresAt?.slice(0, 10)}
                required
                className="min-h-10 rounded-md border border-[#cbd3df] px-2 text-sm text-[#182033]"
              />
            </label>
            <button disabled={expirationPending} className="min-h-10 rounded-md border border-[#cbd3df] px-3 text-sm font-semibold disabled:opacity-50">
              {t('users.extend')}
            </button>
            <ActionFeedback state={expirationState} t={t} />
          </form>
        </div>
      ) : null}
    </section>
  );
}

function ActionFeedback({state, t}: {state: AdminUserActionState; t: (key: string) => string}) {
  if (state.status === 'idle') {
    return null;
  }

  return (
    <div className={`mt-3 rounded-md border px-3 py-2 text-sm ${state.status === 'success' ? 'border-[#abefc6] bg-[#ecfdf3] text-[#027a48]' : 'border-[#fecdca] bg-[#fff5f5] text-[#b42318]'}`}>
      <p className="font-semibold">{t(state.messageKey)}</p>
      {state.temporaryPassword ? (
        <label className="mt-3 grid gap-1.5 text-[#344054]">
          <span className="font-semibold">{t('users.temporaryPasswordWarning')}</span>
          <input
            value={state.temporaryPassword}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
            onClick={(event) => event.currentTarget.select()}
            className="min-h-10 w-full rounded-md border border-[#98a2b3] bg-white px-3 font-mono text-sm"
          />
        </label>
      ) : null}
    </div>
  );
}

function Meta({label, value}: {label: string; value: string}) {
  return (
    <div>
      <dt className="font-semibold text-[#647084]">{label}</dt>
      <dd className="mt-1 break-words font-medium text-[#182033]">{value}</dd>
    </div>
  );
}

function formatDate(value: string | null, fallback: string) {
  if (!value) {
    return fallback;
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : fallback;
}
