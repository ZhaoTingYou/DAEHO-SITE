'use client';

import {useState} from 'react';

type Settings = {
  internalEmail: string;
  internalEmailEnabled: boolean;
  customerEmailEnabled: boolean;
  kakaoEnabled: boolean;
  telegramEnabled: boolean;
};

type Health = {
  emailConfigured: boolean;
  kakaoConfigured: boolean;
  kakaoVerified: boolean;
  telegramConfigured: boolean;
  workerEnabled: boolean;
  kakaoTemplatesReady: boolean;
  telegramTemplateReady: boolean;
};

type Template = {
  id: string;
  templateKey: string;
  channel: 'email' | 'kakao' | 'telegram';
  audience: 'internal' | 'customer';
  inquiryStatus: string;
  locale: 'ko' | 'en';
  version: number;
  subject: string;
  body: string;
  providerTemplateCode: string;
  kakaoTemplateType: 'basic' | 'highlight';
  approvalStatus: 'draft' | 'pending' | 'approved';
  isActive: boolean;
};

type Copy = {
  settings: string;
  health: string;
  internalEmail: string;
  internalEmailEnabled: string;
  customerEmailEnabled: string;
  kakaoEnabled: string;
  telegramEnabled: string;
  worker: string;
  emailConnection: string;
  kakaoConnection: string;
  kakaoVerification: string;
  kakaoTemplates: string;
  telegramConnection: string;
  telegramTemplate: string;
  configured: string;
  notConfigured: string;
  enabled: string;
  disabled: string;
  save: string;
  saved: string;
  saveError: string;
  templates: string;
  version: string;
  subject: string;
  kakaoTemplateType: string;
  kakaoTemplateBasic: string;
  kakaoTemplateHighlight: string;
  kakaoHighlightTitle: string;
  templateVariables: string;
  body: string;
  providerCode: string;
  approval: string;
  active: string;
  saveVersion: string;
  templateSaved: string;
  templateError: string;
  kakaoApprovalHint: string;
  testSend: string;
  testRecipient: string;
  testTemplate: string;
  testCustomerName: string;
  testInquiryNumber: string;
  testSuccess: string;
  testError: string;
  telegramTestTarget: string;
};

export function NotificationSettingsEditor({
  initialSettings,
  health,
  initialTemplates,
  copy
}: {
  initialSettings: Settings;
  health: Health;
  initialTemplates: Template[];
  copy: Copy;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [templates, setTemplates] = useState(initialTemplates);
  const [settingsState, setSettingsState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [templateState, setTemplateState] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-[#d9dee7] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{copy.health}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <HealthItem label={copy.worker} ready={health.workerEnabled} copy={copy} />
          <HealthItem label={copy.emailConnection} ready={health.emailConfigured} copy={copy} />
          <HealthItem label={copy.kakaoConnection} ready={health.kakaoConfigured} copy={copy} />
          <HealthItem label={copy.kakaoVerification} ready={health.kakaoVerified} copy={copy} />
          <HealthItem label={copy.kakaoTemplates} ready={health.kakaoTemplatesReady} copy={copy} />
          <HealthItem label={copy.telegramConnection} ready={health.telegramConfigured} copy={copy} />
          <HealthItem label={copy.telegramTemplate} ready={health.telegramTemplateReady} copy={copy} />
        </div>
      </section>

      <TestNotification templates={templates} copy={copy} />

      <section className="rounded-lg border border-[#d9dee7] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{copy.settings}</h2>
        <form
          className="mt-5 grid gap-5"
          onSubmit={async (event) => {
            event.preventDefault();
            setSettingsState('saving');
            const response = await fetch('/api/admin/notifications/settings', {
              method: 'PUT',
              headers: {'content-type': 'application/json'},
              body: JSON.stringify(settings)
            }).catch(() => null);
            if (!response?.ok) {
              setSettingsState('error');
              return;
            }
            const payload = await response.json() as {settings: Settings};
            setSettings(payload.settings);
            setSettingsState('saved');
          }}
        >
          <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
            <span>{copy.internalEmail}</span>
            <input
              type="email"
              required={settings.internalEmailEnabled}
              maxLength={254}
              value={settings.internalEmail}
              onChange={(event) => setSettings((current) => ({...current, internalEmail: event.target.value}))}
              className="min-h-11 rounded-md border border-[#cbd3df] px-3"
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Toggle
              label={copy.internalEmailEnabled}
              checked={settings.internalEmailEnabled}
              onChange={(checked) => setSettings((current) => ({...current, internalEmailEnabled: checked}))}
            />
            <Toggle
              label={copy.customerEmailEnabled}
              checked={settings.customerEmailEnabled}
              onChange={(checked) => setSettings((current) => ({...current, customerEmailEnabled: checked}))}
            />
            <Toggle
              label={copy.kakaoEnabled}
              checked={settings.kakaoEnabled}
              onChange={(checked) => setSettings((current) => ({...current, kakaoEnabled: checked}))}
            />
            <Toggle
              label={copy.telegramEnabled}
              checked={settings.telegramEnabled}
              onChange={(checked) => setSettings((current) => ({...current, telegramEnabled: checked}))}
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="admin-on-dark min-h-10 rounded-md bg-[#101827] px-4 text-sm font-semibold text-white">
              {copy.save}
            </button>
            {settingsState === 'saved' ? <p className="text-sm text-[#027a48]">{copy.saved}</p> : null}
            {settingsState === 'error' ? <p className="text-sm text-[#b42318]">{copy.saveError}</p> : null}
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-[#d9dee7] bg-white shadow-sm">
        <div className="border-b border-[#e4e7ec] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{copy.templates}</h2>
          <p className="mt-2 text-sm leading-6 text-[#647084]">{copy.kakaoApprovalHint}</p>
        </div>
        <div className="divide-y divide-[#e4e7ec]">
          {templates.map((template) => (
            <TemplateEditor
              key={template.id}
              template={template}
              state={templateState[template.templateKey]}
              copy={copy}
              onSave={async (draft) => {
                setTemplateState((current) => ({...current, [template.templateKey]: 'saving'}));
                const response = await fetch(
                  `/api/admin/notifications/templates/${encodeURIComponent(template.templateKey)}/versions`,
                  {
                    method: 'POST',
                    headers: {'content-type': 'application/json'},
                    body: JSON.stringify(draft)
                  }
                ).catch(() => null);
                if (!response?.ok) {
                  setTemplateState((current) => ({...current, [template.templateKey]: 'error'}));
                  return;
                }
                const payload = await response.json() as {template: Template};
                setTemplates((current) => current.map((item) =>
                  item.templateKey === template.templateKey ? payload.template : item
                ));
                setTemplateState((current) => ({...current, [template.templateKey]: 'saved'}));
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function TestNotification({templates, copy}: {templates: Template[]; copy: Copy}) {
  const active = templates.filter((template) => template.isActive);
  const [templateKey, setTemplateKey] = useState(active[0]?.templateKey ?? '');
  const selected = active.find((template) => template.templateKey === templateKey);
  const [recipient, setRecipient] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [inquiryNumber, setInquiryNumber] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  return (
    <section className="rounded-lg border border-[#d9dee7] bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#647084]">{copy.testSend}</h2>
      <form
        className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5 xl:items-end"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!selected) return;
          setState('sending');
          setMessage('');
          const response = await fetch('/api/admin/notifications/test', {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify({
              channel: selected.channel,
              recipient,
              templateKey: selected.templateKey,
              customerName,
              inquiryNumber
            })
          }).catch(() => null);
          const payload = await response?.json().catch(() => null) as {
            success?: boolean;
            providerMessageId?: string;
            errorMessage?: string;
            error?: string;
          } | null;
          if (!response?.ok || !payload?.success) {
            setState('error');
            setMessage(payload?.errorMessage || payload?.error || copy.testError);
            return;
          }
          setState('success');
          setMessage(payload.providerMessageId || copy.testSuccess);
        }}
      >
        <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
          <span>{copy.testTemplate}</span>
          <select
            value={templateKey}
            onChange={(event) => setTemplateKey(event.target.value)}
            className="min-h-11 rounded-md border border-[#cbd3df] bg-white px-3"
          >
            {active.map((template) => (
              <option key={template.templateKey} value={template.templateKey}>
                {template.templateKey}
              </option>
            ))}
          </select>
        </label>
        {selected?.channel === 'telegram' ? (
          <div className="rounded-md border border-[#d9dee7] bg-[#f8fafc] px-3 py-2 text-sm text-[#475467]">
            {copy.telegramTestTarget}
          </div>
        ) : (
          <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
            <span>{copy.testRecipient}</span>
            <input
              required
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder={selected?.channel === 'kakao' ? '01012345678' : 'name@example.com'}
              className="min-h-11 rounded-md border border-[#cbd3df] px-3"
            />
          </label>
        )}
        {selected?.channel === 'kakao' ? (
          <>
            <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
              <span>{copy.testCustomerName}</span>
              <input
                required
                maxLength={120}
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="홍길동"
                className="min-h-11 rounded-md border border-[#cbd3df] px-3"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
              <span>{copy.testInquiryNumber}</span>
              <input
                required
                maxLength={160}
                value={inquiryNumber}
                onChange={(event) => setInquiryNumber(event.target.value)}
                placeholder="INQ-001"
                className="min-h-11 rounded-md border border-[#cbd3df] px-3"
              />
            </label>
          </>
        ) : null}
        <button
          disabled={!selected || state === 'sending'}
          className="admin-on-dark min-h-11 rounded-md bg-[#101827] px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {copy.testSend}
        </button>
      </form>
      {state === 'success' ? <p className="mt-3 break-all text-sm text-[#027a48]">{copy.testSuccess}: {message}</p> : null}
      {state === 'error' ? <p className="mt-3 text-sm text-[#b42318]">{message}</p> : null}
    </section>
  );
}

function TemplateEditor({
  template,
  state,
  copy,
  onSave
}: {
  template: Template;
  state?: 'saving' | 'saved' | 'error';
  copy: Copy;
  onSave: (draft: Pick<Template, 'subject' | 'body' | 'providerTemplateCode' | 'kakaoTemplateType' | 'approvalStatus' | 'isActive'>) => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    subject: template.channel === 'email' ? template.subject : '',
    body: template.channel === 'kakao' ? '' : template.body,
    providerTemplateCode: template.providerTemplateCode,
    kakaoTemplateType: 'basic' as const,
    approvalStatus: template.channel === 'email' ? template.approvalStatus : 'approved' as const,
    isActive: template.isActive
  });

  return (
    <form
      className="grid gap-4 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave(draft);
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[#101827]">{template.templateKey}</h3>
          <p className="mt-1 text-xs text-[#647084]">
            {template.channel} · {template.audience} · {template.locale.toUpperCase()} · {copy.version} {template.version}
          </p>
        </div>
        <NotificationPill active={template.isActive} copy={copy} />
      </div>
      {template.channel === 'email' ? (
        <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
          <span>{copy.subject}</span>
          <input
            required
            maxLength={300}
            value={draft.subject}
            onChange={(event) => setDraft((current) => ({...current, subject: event.target.value}))}
            className="min-h-10 rounded-md border border-[#cbd3df] px-3"
          />
        </label>
      ) : null}
      {template.channel !== 'kakao' ? (
        <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
          <span>{copy.body}</span>
          <textarea
            required
            rows={7}
            maxLength={4000}
            value={draft.body}
            onChange={(event) => setDraft((current) => ({...current, body: event.target.value}))}
            className="rounded-md border border-[#cbd3df] p-3 font-mono text-xs leading-6"
          />
        </label>
      ) : null}
      {template.channel === 'kakao' ? (
        <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
          <span>{copy.providerCode}</span>
          <input
            required
            maxLength={160}
            value={draft.providerTemplateCode}
            onChange={(event) => setDraft((current) => ({...current, providerTemplateCode: event.target.value}))}
            className="min-h-10 rounded-md border border-[#cbd3df] px-3 font-mono"
          />
        </label>
      ) : null}
      {template.channel !== 'kakao' ? (
        <p className="text-xs leading-5 text-[#647084]">{copy.templateVariables}</p>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        {template.channel === 'email' ? (
          <label className="grid gap-1.5 text-sm font-semibold text-[#344054]">
            <span>{copy.approval}</span>
            <select
              value={draft.approvalStatus}
              onChange={(event) => setDraft((current) => ({
                ...current,
                approvalStatus: event.target.value as Template['approvalStatus']
              }))}
              className="min-h-10 rounded-md border border-[#cbd3df] bg-white px-3"
            >
              <option value="draft">draft</option>
              <option value="pending">pending</option>
              <option value="approved">approved</option>
            </select>
          </label>
        ) : null}
        <Toggle
          label={copy.active}
          checked={draft.isActive}
          onChange={(checked) => setDraft((current) => ({...current, isActive: checked}))}
        />
      </div>
      <div className="flex items-center gap-3">
        <button className="admin-on-dark min-h-10 rounded-md bg-[#101827] px-4 text-sm font-semibold text-white">
          {state === 'saving' ? copy.save : copy.saveVersion}
        </button>
        {state === 'saved' ? <p className="text-xs text-[#027a48]">{copy.templateSaved}</p> : null}
        {state === 'error' ? <p className="text-xs text-[#b42318]">{copy.templateError}</p> : null}
      </div>
    </form>
  );
}

function Toggle({label, checked, onChange}: {label: string; checked: boolean; onChange: (checked: boolean) => void}) {
  return (
    <label className="flex min-h-11 items-center gap-3 rounded-md border border-[#d9dee7] px-3 text-sm font-semibold text-[#344054]">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function HealthItem({label, ready, copy}: {label: string; ready: boolean; copy: Copy}) {
  return (
    <div className="rounded-md border border-[#e4e7ec] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#647084]">{label}</p>
      <p className={`mt-2 text-sm font-semibold ${ready ? 'text-[#027a48]' : 'text-[#b54708]'}`}>
        {ready ? copy.configured : copy.notConfigured}
      </p>
    </div>
  );
}

function NotificationPill({active, copy}: {active: boolean; copy: Copy}) {
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
      active ? 'bg-[#ecfdf3] text-[#027a48]' : 'bg-[#eef2f6] text-[#475467]'
    }`}>
      {active ? copy.enabled : copy.disabled}
    </span>
  );
}
