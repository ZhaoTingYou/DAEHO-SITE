'use client';

import {useState} from 'react';

type Job = {
  id: string;
  channel: 'email' | 'kakao';
  audience: 'internal' | 'customer';
  recipient: string;
  subject: string;
  renderedBody: string;
  status: string;
  attemptCount: number;
  providerMessageId: string;
  lastError: string;
  createdAt: string;
};

type Attempt = {
  id: string;
  jobId: string;
  attemptNumber: number;
  status: string;
  providerMessageId: string;
  errorMessage: string;
  createdAt: string;
};

export function NotificationTimeline({
  initialJobs,
  attempts,
  copy
}: {
  initialJobs: Job[];
  attempts: Attempt[];
  copy: {
    empty: string;
    retry: string;
    retrying: string;
    attempts: string;
    recipient: string;
    error: string;
  };
}) {
  const [jobs, setJobs] = useState(initialJobs);
  const [retrying, setRetrying] = useState('');
  const [error, setError] = useState('');

  if (jobs.length === 0) {
    return <p className="px-5 py-8 text-sm text-[#647084]">{copy.empty}</p>;
  }

  return (
    <div className="divide-y divide-[#e4e7ec]">
      {jobs.map((job) => {
        const jobAttempts = attempts.filter((attempt) => attempt.jobId === job.id);
        return (
          <article key={job.id} className="space-y-3 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#101827]">
                {job.channel === 'kakao' ? 'Kakao 알림톡' : 'Email'} · {job.audience}
              </p>
              <NotificationStatus status={job.status} />
            </div>
            {job.subject ? <p className="break-words text-sm font-semibold text-[#101827]">{job.subject}</p> : null}
            <p className="break-words text-xs text-[#647084]">{copy.recipient}: {job.recipient}</p>
            <p className="whitespace-pre-wrap rounded bg-[#f8fafc] p-3 text-xs leading-5 text-[#344054]">{job.renderedBody}</p>
            <p className="font-numeric text-xs text-[#98a2b3]">{formatDate(job.createdAt)}</p>
            {job.providerMessageId ? <p className="break-all font-numeric text-xs text-[#647084]">{job.providerMessageId}</p> : null}
            {job.lastError ? <p className="rounded bg-[#fff5f5] p-3 text-xs text-[#b42318]">{job.lastError}</p> : null}
            {jobAttempts.length ? (
              <details className="text-xs text-[#647084]">
                <summary className="cursor-pointer font-semibold">{copy.attempts} ({jobAttempts.length})</summary>
                <div className="mt-2 grid gap-2">
                  {jobAttempts.map((attempt) => (
                    <div key={attempt.id} className="rounded border border-[#e4e7ec] p-2">
                      #{attempt.attemptNumber} · {attempt.status} · {formatDate(attempt.createdAt)}
                      {attempt.errorMessage ? <p className="mt-1 text-[#b42318]">{attempt.errorMessage}</p> : null}
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
            {job.status === 'failed' || job.status === 'needs_attention' ? (
              <button
                type="button"
                disabled={retrying === job.id}
                onClick={() => retry(job.id)}
                className="min-h-9 rounded-md border border-[#cbd3df] px-3 text-xs font-semibold text-[#344054] disabled:opacity-50"
              >
                {retrying === job.id ? copy.retrying : copy.retry}
              </button>
            ) : null}
          </article>
        );
      })}
      {error ? <p className="px-5 py-3 text-xs text-[#b42318]">{error}</p> : null}
    </div>
  );

  async function retry(jobId: string) {
    setRetrying(jobId);
    setError('');
    const response = await fetch(`/api/admin/notifications/jobs/${encodeURIComponent(jobId)}/retry`, {
      method: 'POST'
    }).catch(() => null);
    setRetrying('');
    if (!response?.ok) {
      setError(copy.error);
      return;
    }
    const payload = await response.json() as {job: Job};
    setJobs((current) => current.map((job) => job.id === jobId ? payload.job : job));
  }
}

function NotificationStatus({status}: {status: string}) {
  const className =
    status === 'sent'
      ? 'bg-[#ecfdf3] text-[#027a48]'
      : status === 'failed' || status === 'needs_attention'
        ? 'bg-[#fff5f5] text-[#b42318]'
        : status === 'queued' || status === 'provider_pending'
          ? 'bg-[#fffaeb] text-[#b54708]'
          : 'bg-[#eef2f6] text-[#475467]';
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${className}`}>{status}</span>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul'
  }).format(new Date(value));
}
