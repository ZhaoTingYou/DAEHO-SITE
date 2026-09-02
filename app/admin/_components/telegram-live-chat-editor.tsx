'use client';

import Link from 'next/link';
import {useState} from 'react';

import type {
  LiveChatAdminSession,
  TelegramLiveChatSettings
} from '@/lib/cms/repositories';

type Copy = Record<
  | 'setup'
  | 'status'
  | 'enabled'
  | 'disabled'
  | 'connected'
  | 'notConnected'
  | 'botToken'
  | 'botTokenHint'
  | 'tokenSaved'
  | 'tokenMissing'
  | 'clearToken'
  | 'targetChatId'
  | 'targetChatIdHint'
  | 'topicId'
  | 'perCustomerTopics'
  | 'botUsername'
  | 'save'
  | 'connect'
  | 'enable'
  | 'disableAction'
  | 'saved'
  | 'connectedMessage'
  | 'error'
  | 'steps'
  | 'step1'
  | 'step2'
  | 'step3'
  | 'step4'
  | 'sessions'
  | 'noSessions'
  | 'customer'
  | 'contact'
  | 'content'
  | 'sessionState'
  | 'inquiry'
  | 'source'
  | 'sourceWebsite'
  | 'sourceTelegramLegacy'
  | 'stateOpening'
  | 'stateNeedsAttention'
  | 'attentionRequired'
  | 'unreadReplies'
  | 'topic'
  | 'reconcile'
  | 'retryDelivery'
  | 'retryDeliveryConfirm'
  | 'confirmDelivery'
  | 'confirmDeliveryConfirm'
  | 'resetTopicCreation'
  | 'resetTopicCreationConfirm'
  | 'resetSetup'
  | 'resetSetupConfirm'
  | 'stateActive'
  | 'stateClosed'
  | 'closeConversation'
  | 'closeConversationConfirm'
  | 'working',
  string
>;

export function TelegramLiveChatEditor({
  initialSettings,
  sessions,
  copy
}: {
  initialSettings: TelegramLiveChatSettings;
  sessions: LiveChatAdminSession[];
  copy: Copy;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [botToken, setBotToken] = useState('');
  const [clearBotToken, setClearBotToken] = useState(false);
  const [state, setState] = useState<'idle' | 'working' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const stateLabels: Record<LiveChatAdminSession['state'], string> = {
    opening: copy.stateOpening,
    needs_attention: copy.stateNeedsAttention,
    active: copy.stateActive,
    closed: copy.stateClosed
  };

  const run = async (
    request: () => Promise<Response | null>,
    successMessage: string
  ) => {
    setState('working');
    setMessage('');
    const response = await request().catch(() => null);
    const payload = await response?.json().catch(() => null) as {
      settings?: TelegramLiveChatSettings;
      detail?: string;
      error?: string;
      message?: string;
      issues?: Array<{message?: string}>;
    } | null;
    if (!response?.ok || !payload?.settings) {
      setState('error');
      setMessage(copy.error);
      return;
    }
    setSettings((current) => ({...current, ...payload.settings}));
    setBotToken('');
    setClearBotToken(false);
    setState('success');
    setMessage(successMessage);
  };

  const runSessionAction = async (
    session: LiveChatAdminSession,
    action: string,
    confirmation?: string
  ) => {
    if (confirmation && !window.confirm(confirmation)) return;
    setState('working');
    setMessage(copy.working);
    const response = await fetch(
      `/api/admin/live-chat/sessions/${encodeURIComponent(session.id)}/${action}`,
      {method: 'POST'}
    ).catch(() => null);
    if (response?.ok) {
      window.location.reload();
      return;
    }
    setState('error');
    setMessage(copy.error);
  };

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-[#d9dee7] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{copy.status}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <StatusCard ready={settings.connected} readyText={copy.connected} waitingText={copy.notConnected} />
          <StatusCard
            ready={settings.enabled && (!settings.setupState || settings.setupState === 'idle')}
            readyText={copy.enabled}
            waitingText={copy.disabled}
          />
        </div>
        <dl className="mt-4 grid gap-3 rounded-md bg-[#f8fafc] p-4 text-sm md:grid-cols-2">
          <StatusDetail label={copy.botUsername} value={settings.botUsername ? `@${settings.botUsername}` : '-'} />
          <StatusDetail label={copy.topicId} value={copy.perCustomerTopics} />
        </dl>
      </section>

      <section className="rounded-lg border border-[#d9dee7] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{copy.steps}</h2>
        <ol className="mt-4 grid gap-3 text-sm leading-6 text-[#475467] md:grid-cols-2">
          {[copy.step1, copy.step2, copy.step3, copy.step4].map((item, index) => (
            <li key={item} className="flex gap-3 rounded-md border border-[#e4e7ec] p-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#101827] font-numeric text-xs font-semibold text-white">
                {index + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-lg border border-[#d9dee7] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{copy.setup}</h2>
        <form
          className="mt-5 grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void run(
              () => fetch('/api/admin/live-chat', {
                method: 'PUT',
                headers: {'content-type': 'application/json'},
                body: JSON.stringify({
                  enabled: settings.enabled,
                  botToken,
                  clearBotToken,
                  targetChatId: settings.targetChatId
                })
              }),
              copy.saved
            );
          }}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid content-start gap-1.5 text-sm font-semibold text-[#344054]">
              <label className="grid gap-1.5">
                <span className="flex flex-wrap items-center gap-2">
                  {copy.botToken}
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    settings.botTokenConfigured
                      ? 'bg-[#ecfdf3] text-[#027a48]'
                      : 'bg-[#fef3f2] text-[#b42318]'
                  }`}>
                    {settings.botTokenConfigured ? copy.tokenSaved : copy.tokenMissing}
                  </span>
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  maxLength={512}
                  disabled={clearBotToken}
                  value={botToken}
                  onChange={(event) => {
                    setBotToken(event.target.value);
                    setClearBotToken(false);
                  }}
                  className="min-h-11 rounded-md border border-[#cbd3df] bg-white px-3 disabled:bg-[#eef2f6]"
                />
                <span className="font-normal leading-5 text-[#647084]">{copy.botTokenHint}</span>
              </label>
              <label className="mt-1 flex items-center gap-2 font-normal text-[#475467]">
                <input
                  type="checkbox"
                  checked={clearBotToken}
                  disabled={!settings.botTokenConfigured && !botToken}
                  onChange={(event) => {
                    setClearBotToken(event.target.checked);
                    if (event.target.checked) setBotToken('');
                  }}
                />
                <span>{copy.clearToken}</span>
              </label>
            </div>

            <div className="grid content-start gap-5">
              <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
                <span>{copy.targetChatId}</span>
                <input
                  required
                  maxLength={80}
                  value={settings.targetChatId}
                  onChange={(event) => setSettings((current) => ({
                    ...current,
                    targetChatId: event.target.value
                  }))}
                  placeholder="-1001234567890"
                  className="min-h-11 rounded-md border border-[#cbd3df] bg-white px-3"
                />
                <span className="font-normal leading-5 text-[#647084]">{copy.targetChatIdHint}</span>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-[#e4e7ec] pt-5">
            <button
              disabled={state === 'working'}
              className="admin-on-dark min-h-11 rounded-md bg-[#101827] px-4 text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-[#7a2230] focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {copy.save}
            </button>
            <button
              type="button"
              disabled={state === 'working' || !settings.botTokenConfigured || !settings.targetChatId}
              onClick={() => void run(
                () => fetch('/api/admin/live-chat/connect', {method: 'POST'}),
                copy.connectedMessage
              )}
              className="min-h-11 rounded-md border border-[#7a2230] px-4 text-sm font-semibold text-[#7a2230] outline-none focus-visible:ring-2 focus-visible:ring-[#7a2230] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {copy.connect}
            </button>
            <button
              type="button"
              disabled={state === 'working' || (!settings.connected && !settings.enabled)}
              onClick={() => void run(
                () => fetch('/api/admin/live-chat/enable', {
                  method: 'POST',
                  headers: {'content-type': 'application/json'},
                  body: JSON.stringify({enabled: !settings.enabled})
                }),
                settings.enabled ? copy.disabled : copy.enabled
              )}
              className="min-h-11 rounded-md border border-[#cbd3df] px-4 text-sm font-semibold text-[#344054] outline-none focus-visible:ring-2 focus-visible:ring-[#7a2230] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {settings.enabled ? copy.disableAction : copy.enable}
            </button>
            {settings.setupState && settings.setupState !== 'idle' ? (
              <button
                type="button"
                disabled={state === 'working'}
                onClick={() => {
                  if (!window.confirm(copy.resetSetupConfirm)) return;
                  void run(
                    () => fetch('/api/admin/live-chat/connect/reset', {method: 'POST'}),
                    copy.saved
                  );
                }}
                className="min-h-11 rounded-md border border-[#b42318] px-4 text-sm font-semibold text-[#b42318] outline-none focus-visible:ring-2 focus-visible:ring-[#b42318] focus-visible:ring-offset-2 disabled:opacity-40"
              >
                {copy.resetSetup}
              </button>
            ) : null}
            <p aria-live="polite" className={`text-sm ${state === 'error' ? 'text-[#b42318]' : 'text-[#027a48]'}`}>
              {state === 'working' || state === 'success' || state === 'error' ? message : ''}
            </p>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-lg border border-[#d9dee7] bg-white shadow-sm">
        <div className="border-b border-[#e4e7ec] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{copy.sessions}</h2>
        </div>
        {sessions.length === 0 ? (
          <p className="p-6 text-sm text-[#647084]">{copy.noSessions}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="bg-[#f8fafc] text-xs uppercase tracking-[0.12em] text-[#647084]">
                <tr>
                  <th className="px-4 py-3">{copy.customer}</th>
                  <th className="px-4 py-3">{copy.source}</th>
                  <th className="px-4 py-3">{copy.contact}</th>
                  <th className="px-4 py-3">{copy.content}</th>
                  <th className="px-4 py-3">{copy.sessionState}</th>
                  <th className="px-4 py-3">{copy.inquiry}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e7ec]">
                {sessions.map((session) => {
                  const websiteRegistrationRetry = session.source === 'website'
                    && /^registration_delivery_(failed|uncertain)$/.test(session.attentionCode);
                  const websiteTopicReset = session.source === 'website'
                    && /^topic_creation_(failed|uncertain)$/.test(session.attentionCode);
                  const legacyDeliveryRetry = session.source === 'telegram_legacy'
                    && /^(registration|customer|team)_delivery_(uncertain|in_flight|retrying)$/
                      .test(session.attentionCode);
                  const websiteVisitorRecovery = session.source === 'website'
                    && session.pendingMessageId !== null
                    && /^visitor_delivery_(uncertain|stale|mapping_pending|failed)$/.test(session.attentionCode);
                  const websiteTopicCloseRecovery = session.source === 'website'
                    && /^topic_close_/.test(session.attentionCode);
                  const legacyTopicReset = session.source === 'telegram_legacy'
                    && /^topic_creation_(uncertain|in_flight|failed)$/.test(session.attentionCode);
                  const legacyReconcile = session.source === 'telegram_legacy'
                    && Boolean(session.attentionCode)
                    && !legacyDeliveryRetry
                    && !legacyTopicReset;
                  const recoveryAction = websiteTopicReset || legacyTopicReset
                    ? 'reset-topic-creation'
                    : websiteTopicCloseRecovery
                      ? 'retry-topic-close'
                    : websiteRegistrationRetry || legacyDeliveryRetry
                      ? 'retry-delivery'
                      : legacyReconcile
                        ? 'reconcile'
                        : null;
                  const recoveryLabel = websiteTopicReset || legacyTopicReset
                    ? copy.resetTopicCreation
                    : websiteTopicCloseRecovery
                      ? copy.retryDelivery
                    : websiteRegistrationRetry || legacyDeliveryRetry
                      ? copy.retryDelivery
                      : copy.reconcile;
                  const recoveryConfirmation = websiteTopicReset || legacyTopicReset
                    ? copy.resetTopicCreationConfirm
                    : websiteTopicCloseRecovery
                      ? copy.retryDeliveryConfirm
                    : websiteRegistrationRetry || legacyDeliveryRetry
                      ? copy.retryDeliveryConfirm
                      : undefined;
                  return (
                  <tr key={`${session.source}:${session.id}`}>
                    <td className="px-4 py-3 font-semibold text-[#101827]">{session.customerName || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full border border-[#cbd3df] bg-[#f8fafc] px-2.5 py-1 text-xs font-semibold text-[#344054]">
                        {session.source === 'website' ? copy.sourceWebsite : copy.sourceTelegramLegacy}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#475467]">{session.customerContact || '-'}</td>
                    <td className="max-w-96 px-4 py-3 text-[#475467]">{session.inquiryContent || '-'}</td>
                    <td className="px-4 py-3 text-[#475467]">
                      <span className={session.state === 'needs_attention' ? 'font-semibold text-[#b42318]' : ''}>
                        {stateLabels[session.state]}
                      </span>
                      {session.unreadCount > 0 ? (
                        <span className="mt-1 block text-xs font-semibold text-[#7a2230]">
                          {copy.unreadReplies}: {session.unreadCount}
                        </span>
                      ) : null}
                      <span className="mt-1 block text-xs text-[#647084]">
                        {copy.topic}: {session.topicThreadId ?? '-'}
                      </span>
                      {session.attentionCode ? (
                        <span className="mt-1 block max-w-80 text-xs leading-5 text-[#b42318]">
                          {copy.attentionRequired}
                        </span>
                      ) : null}
                      {session.state === 'active'
                          || (session.source === 'website'
                            && session.state !== 'closed'
                            && !recoveryAction) ? (
                        <button
                          type="button"
                          disabled={state === 'working'}
                          onClick={() => void runSessionAction(
                            session, 'close', copy.closeConversationConfirm
                          )}
                          className="mt-2 min-h-11 rounded-md border border-[#667085] px-3 text-xs font-semibold text-[#475467] outline-none focus-visible:ring-2 focus-visible:ring-[#7a2230] focus-visible:ring-offset-2 disabled:opacity-40"
                        >
                          {copy.closeConversation}
                        </button>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {session.inquiryId ? (
                        <Link href={`/admin/inquiries/${session.inquiryId}`} className="font-semibold text-[#7a2230] hover:underline">
                          {session.inquiryId.slice(0, 8)}
                        </Link>
                      ) : '-'}
                      {recoveryAction ? (
                        <button
                          type="button"
                          disabled={state === 'working'}
                          onClick={() => void runSessionAction(
                            session, recoveryAction, recoveryConfirmation
                          )}
                          className="mt-2 min-h-11 rounded-md border border-[#b42318] px-3 text-xs font-semibold text-[#b42318] outline-none focus-visible:ring-2 focus-visible:ring-[#b42318] focus-visible:ring-offset-2 disabled:opacity-40"
                        >
                          {recoveryLabel}
                        </button>
                      ) : null}
                      {websiteVisitorRecovery ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={state === 'working'}
                            onClick={() => void runSessionAction(
                              session,
                              `messages/${session.pendingMessageId}/confirm-delivered`,
                              copy.confirmDeliveryConfirm
                            )}
                            className="min-h-11 rounded-md border border-[#667085] px-3 text-xs font-semibold text-[#475467]"
                          >
                            {copy.confirmDelivery}
                          </button>
                          <button
                            type="button"
                            disabled={state === 'working'}
                            onClick={() => void runSessionAction(
                              session,
                              `messages/${session.pendingMessageId}/retry-delivery`,
                              copy.retryDeliveryConfirm
                            )}
                            className="min-h-11 rounded-md border border-[#b42318] px-3 text-xs font-semibold text-[#b42318]"
                          >
                            {copy.retryDelivery}
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatusCard({
  ready,
  readyText,
  waitingText
}: {
  ready: boolean;
  readyText: string;
  waitingText: string;
}) {
  return (
    <div className={`rounded-md border p-4 ${
      ready
        ? 'border-[#abefc6] bg-[#ecfdf3] text-[#027a48]'
        : 'border-[#fecdca] bg-[#fef3f2] text-[#b42318]'
    }`}>
      <p className="text-sm font-semibold">{ready ? readyText : waitingText}</p>
    </div>
  );
}

function StatusDetail({label, value}: {label: string; value: string}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#647084]">{label}</dt>
      <dd className="mt-1 break-all font-semibold text-[#101827]">{value}</dd>
    </div>
  );
}
