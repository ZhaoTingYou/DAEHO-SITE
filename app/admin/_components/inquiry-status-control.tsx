'use client';

import {useRouter} from 'next/navigation';
import {useEffect, useState} from 'react';

import {fetchAdminApi} from '@/lib/cms/admin-api-client.mjs';

type InquiryStatus = string;

export type InquiryStatusOption = {
  code: string;
  label: string;
  color: 'slate' | 'blue' | 'amber' | 'green' | 'red' | 'purple';
  isActive: boolean;
};

type Preview = {
  changed: boolean;
  previousStatus: InquiryStatus;
  nextStatus: InquiryStatus;
  notifications: Array<{
    channel: 'email' | 'kakao';
    audience: 'internal' | 'customer';
    maskedRecipient: string;
    subject: string;
    renderedBody: string;
    enabled: boolean;
    ready: boolean;
    reason: string;
  }>;
};

type Copy = {
  update: string;
  previewTitle: string;
  previewDescription: string;
  previousStatus: string;
  nextStatus: string;
  notifications: string;
  noNotification: string;
  disabled: string;
  ready: string;
  cancel: string;
  confirm: string;
  saving: string;
  error: string;
};

export function InquiryStatusControl({
  inquiryId,
  initialStatus,
  statuses,
  copy,
  compact = false
}: {
  inquiryId: string;
  initialStatus: InquiryStatus;
  statuses: InquiryStatusOption[];
  copy: Copy;
  compact?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const selectableStatuses = statuses.filter((item) => item.isActive || item.code === status);

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{inquiryId: string; status: InquiryStatus}>).detail;
      if (detail?.inquiryId === inquiryId) {
        setStatus(detail.status);
        setSelectedStatus(detail.status);
      }
    };
    window.addEventListener('daeho:inquiry-status', listener);
    return () => window.removeEventListener('daeho:inquiry-status', listener);
  }, [inquiryId]);

  return (
    <>
      <form
        className={compact ? 'flex items-center gap-2' : 'grid gap-3'}
        onSubmit={async (event) => {
          event.preventDefault();
          setError('');
          setLoading(true);
          const response = await fetchAdminApi(`/api/admin/inquiries/${encodeURIComponent(inquiryId)}/status-preview`, {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify({status: selectedStatus, expectedStatus: status})
          }).catch(() => null);
          setLoading(false);
          if (!response?.ok) {
            setError(await responseError(response, copy.error));
            return;
          }
          const nextPreview = (await response.json()) as Preview;
          if (!nextPreview.changed) {
            return;
          }
          setPreview(nextPreview);
        }}
      >
        <label className={compact ? 'sr-only' : 'grid gap-1.5 text-sm font-semibold text-[#344054]'}>
          <span className={compact ? 'sr-only' : ''}>Status</span>
          <select
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value as InquiryStatus)}
            className="min-h-10 rounded-md border border-[#cbd3df] bg-white px-3 text-sm font-semibold text-[#344054]"
          >
            {selectableStatuses.map((item) => (
              <option key={item.code} value={item.code}>{item.label}</option>
            ))}
          </select>
        </label>
        <button
          disabled={loading || selectedStatus === status}
          className="admin-on-dark min-h-10 rounded-md bg-[#101827] px-4 text-sm font-semibold text-[#ffffff] transition hover:bg-[#7a2230] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {loading ? copy.saving : copy.update}
        </button>
        {!compact ? <StatusBadge status={status} statuses={statuses} /> : null}
        {error ? <p className="text-xs leading-5 text-[#b42318]">{error}</p> : null}
      </form>

      {preview ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-[#101827]/55 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[88dvh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-2xl md:p-7">
            <h2 className="font-heading text-2xl font-semibold text-[#101827]">{copy.previewTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-[#647084]">{copy.previewDescription}</p>
            <dl className="mt-5 grid grid-cols-2 gap-4 rounded-md bg-[#f8fafc] p-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#647084]">{copy.previousStatus}</dt>
                <dd className="mt-1 font-semibold text-[#101827]">{statusLabel(statuses, preview.previousStatus)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#647084]">{copy.nextStatus}</dt>
                <dd className="mt-1 font-semibold text-[#7a2230]">{statusLabel(statuses, preview.nextStatus)}</dd>
              </div>
            </dl>
            <h3 className="mt-6 text-sm font-semibold uppercase tracking-[0.12em] text-[#647084]">{copy.notifications}</h3>
            <div className="mt-3 grid gap-3">
              {preview.notifications.length === 0 ? (
                <p className="rounded-md border border-[#e4e7ec] p-4 text-sm text-[#647084]">{copy.noNotification}</p>
              ) : preview.notifications.map((notification, index) => (
                <div key={`${notification.channel}-${notification.audience}-${index}`} className="rounded-md border border-[#e4e7ec] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#101827]">
                      {notification.channel === 'kakao' ? 'Kakao 알림톡' : 'Email'} · {notification.audience}
                    </p>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      notification.enabled && notification.ready
                        ? 'bg-[#ecfdf3] text-[#027a48]'
                        : 'bg-[#fffaeb] text-[#b54708]'
                    }`}>
                      {notification.enabled && notification.ready ? copy.ready : copy.disabled}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[#647084]">{notification.maskedRecipient || '-'}</p>
                  {notification.subject ? <p className="mt-3 text-sm font-semibold text-[#101827]">{notification.subject}</p> : null}
                  <p className="mt-2 whitespace-pre-wrap rounded bg-[#f8fafc] p-3 text-xs leading-5 text-[#344054]">
                    {notification.renderedBody || notification.reason || '-'}
                  </p>
                  {notification.reason ? <p className="mt-2 text-xs text-[#b54708]">{notification.reason}</p> : null}
                </div>
              ))}
            </div>
            {error ? <p className="mt-4 text-sm text-[#b42318]">{error}</p> : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setPreview(null);
                  setError('');
                }}
                className="min-h-10 rounded-md border border-[#cbd3df] px-4 text-sm font-semibold text-[#344054]"
              >
                {copy.cancel}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={confirmChange}
                className="admin-on-dark min-h-10 rounded-md bg-[#101827] px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                {loading ? copy.saving : copy.confirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );

  async function confirmChange() {
    if (!preview) return;
    const previous = status;
    const next = preview.nextStatus;
    setStatus(next);
    setSelectedStatus(next);
    setPreview(null);
    setLoading(true);
    broadcastStatus(inquiryId, next);

    const response = await fetchAdminApi(`/api/admin/inquiries/${encodeURIComponent(inquiryId)}`, {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({status: next, expectedStatus: previous})
    }).catch(() => null);

    setLoading(false);
    if (!response?.ok) {
      setStatus(previous);
      setSelectedStatus(previous);
      broadcastStatus(inquiryId, previous);
      setError(await responseError(response, copy.error));
      return;
    }
    router.refresh();
  }
}

export function InquiryStatusBadge({
  inquiryId,
  initialStatus,
  statuses
}: {
  inquiryId: string;
  initialStatus: InquiryStatus;
  statuses: InquiryStatusOption[];
}) {
  const [status, setStatus] = useState(initialStatus);
  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{inquiryId: string; status: InquiryStatus}>).detail;
      if (detail?.inquiryId === inquiryId) setStatus(detail.status);
    };
    window.addEventListener('daeho:inquiry-status', listener);
    return () => window.removeEventListener('daeho:inquiry-status', listener);
  }, [inquiryId]);
  return <StatusBadge status={status} statuses={statuses} />;
}

function StatusBadge({status, statuses}: {status: string; statuses: InquiryStatusOption[]}) {
  const option = statuses.find((item) => item.code === status);
  const color = option?.color ?? 'slate';
  const className = {
    slate: 'bg-[#eef2f6] text-[#475467]',
    blue: 'bg-[#eff8ff] text-[#175cd3]',
    amber: 'bg-[#fffaeb] text-[#b54708]',
    green: 'bg-[#ecfdf3] text-[#027a48]',
    red: 'bg-[#fff5f5] text-[#b42318]',
    purple: 'bg-[#f4f3ff] text-[#5925dc]'
  }[color];
  return (
    <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      {option?.label || status}
    </span>
  );
}

export function statusLabel(statuses: InquiryStatusOption[], code: string) {
  return statuses.find((item) => item.code === code)?.label || code;
}

function broadcastStatus(inquiryId: string, status: InquiryStatus) {
  window.dispatchEvent(new CustomEvent('daeho:inquiry-status', {detail: {inquiryId, status}}));
}

async function responseError(response: Response | null, fallback: string) {
  if (!response) return fallback;
  const payload = await response.json().catch(() => null) as {error?: string} | null;
  return payload?.error || fallback;
}
