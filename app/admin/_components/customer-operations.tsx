'use client';

import {FormEvent, useCallback, useEffect, useState} from 'react';

import type {CustomerProfile} from '@/lib/customer/types';

type PendingClaim = {
  id: string;
  customerId: string;
  inquiryId: string;
  contactHint: string;
  matchResult: string;
  createdAt: string;
};

type AccountFeatureSettings = {
  customerAccountsEnabled: boolean;
  inquiryAccountRequired: boolean;
  updatedBy: string;
  updatedAt: string;
};

async function loadCustomerOperations(search = '') {
  const [customersResponse, claimsResponse, settingsResponse] = await Promise.all([
    fetch(`/api/admin/customers?query=${encodeURIComponent(search)}`),
    fetch('/api/admin/customer/legacy-claims'),
    fetch('/api/admin/customer/account-features')
  ]);
  if (!customersResponse.ok || !claimsResponse.ok || !settingsResponse.ok) {
    throw new Error('Unable to load customer operations');
  }
  return {
    customers: await customersResponse.json() as CustomerProfile[],
    claims: await claimsResponse.json() as PendingClaim[],
    settings: await settingsResponse.json() as AccountFeatureSettings
  };
}

export function CustomerOperations({locale}: {locale: 'zh' | 'en' | 'ko'}) {
  const ko = locale === 'ko';
  const zh = locale === 'zh';
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [claims, setClaims] = useState<PendingClaim[]>([]);
  const [settings, setSettings] = useState<AccountFeatureSettings>({
    customerAccountsEnabled: false,
    inquiryAccountRequired: false,
    updatedBy: '',
    updatedAt: ''
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [settingsState, setSettingsState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const reload = useCallback(async (search = '') => {
    try {
      const result = await loadCustomerOperations(search);
      setCustomers(result.customers);
      setClaims(result.claims);
      setSettings(result.settings);
      setSettingsLoaded(true);
      setError('');
    } catch {
      setError(zh ? '无法加载会员服务。' : ko ? '회원 서비스를 불러오지 못했습니다.' : 'Unable to load customer operations.');
    }
  }, [ko, zh]);

  useEffect(() => {
    let active = true;
    void loadCustomerOperations().then((result) => {
      if (!active) return;
      setCustomers(result.customers);
      setClaims(result.claims);
      setSettings(result.settings);
      setSettingsLoaded(true);
    }).catch(() => {
      if (active) {
        setError(zh ? '无法加载会员服务。' : ko ? '회원 서비스를 불러오지 못했습니다.' : 'Unable to load customer operations.');
      }
    });
    return () => { active = false; };
  }, [ko, zh]);

  async function search(event: FormEvent) {
    event.preventDefault();
    await reload(query);
  }

  async function saveAccountFeatures(event: FormEvent) {
    event.preventDefault();
    setSettingsState('saving');
    try {
      const response = await fetch('/api/admin/customer/account-features', {
        method: 'PUT',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          customerAccountsEnabled: settings.customerAccountsEnabled,
          inquiryAccountRequired: settings.inquiryAccountRequired
        })
      });
      if (!response.ok) {
        setSettingsState('error');
        return;
      }
      setSettings(await response.json() as AccountFeatureSettings);
      setSettingsState('saved');
    } catch {
      setSettingsState('error');
    }
  }

  async function changeStatus(customer: CustomerProfile) {
    const status = customer.status === 'suspended' ? 'active' : 'suspended';
    setBusyId(customer.customerId);
    const response = await fetch(`/api/admin/customers/${customer.customerId}/status`, {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({status})
    });
    setBusyId('');
    if (!response.ok) {
      setError(zh ? '无法更新账号状态。' : ko ? '계정 상태를 변경하지 못했습니다.' : 'Unable to update account status.');
      return;
    }
    await reload(query);
  }

  async function reviewClaim(claim: PendingClaim, status: 'approved' | 'rejected') {
    const reason = window.prompt(
      zh ? '请输入审核理由（将写入审计日志）' : ko ? '검토 사유를 입력하세요. 감사 로그에 기록됩니다.' : 'Enter the review reason. It will be audited.'
    );
    if (!reason?.trim()) return;
    setBusyId(claim.id);
    const response = await fetch(`/api/admin/customer/legacy-claims/${claim.id}`, {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({status, reason})
    });
    setBusyId('');
    if (!response.ok) {
      setError(zh ? '无法完成认领审核。' : ko ? '이전 문의 연결 검토를 완료하지 못했습니다.' : 'Unable to complete the claim review.');
      return;
    }
    await reload(query);
  }

  return (
    <div className="grid gap-6">
      {error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
      <section className="rounded-lg border border-[#d9dee7] bg-white shadow-sm">
        <div className="border-b border-[#d9dee7] px-5 py-4">
          <h2 className="font-heading text-xl font-semibold">{zh ? '会员开放设置' : ko ? '회원 공개 설정' : 'Customer account rollout'}</h2>
          <p className="mt-2 text-sm leading-6 text-[#647084]">
            {zh
              ? '验证码固定由 SOLAPI 自动发送。此处不会开启 NICE 或 SOLAPI 自动充值。'
              : ko
                ? '인증번호는 SOLAPI가 자동 발송합니다. NICE 또는 SOLAPI 자동 충전은 이 설정으로 활성화되지 않습니다.'
                : 'Verification codes are sent automatically by SOLAPI. These switches do not enable NICE or SOLAPI auto-recharge.'}
          </p>
        </div>
        <form onSubmit={saveAccountFeatures} className="grid gap-5 px-5 py-5">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={settings.customerAccountsEnabled}
              disabled={!settingsLoaded || settingsState === 'saving'}
              onChange={(event) => {
                setSettingsState('idle');
                setSettings((current) => ({
                  ...current,
                  customerAccountsEnabled: event.target.checked,
                  inquiryAccountRequired: event.target.checked ? current.inquiryAccountRequired : false
                }));
              }}
            />
            <span>
              <span className="block text-sm font-semibold">{zh ? '开放登录、注册和 MY DAEHO' : ko ? '로그인, 회원가입 및 MY DAEHO 공개' : 'Enable sign-in, registration, and MY DAEHO'}</span>
              <span className="mt-1 block text-xs leading-5 text-[#647084]">{zh ? '开启后，用户可以请求一条付费 SOLAPI 验证短信并注册。' : ko ? '활성화하면 사용자가 유료 SOLAPI 인증 문자를 요청하고 가입할 수 있습니다.' : 'When enabled, users can request a billable SOLAPI verification SMS and register.'}</span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={settings.inquiryAccountRequired}
              disabled={!settings.customerAccountsEnabled || !settingsLoaded || settingsState === 'saving'}
              onChange={(event) => {
                setSettingsState('idle');
                setSettings((current) => ({
                  ...current,
                  inquiryAccountRequired: event.target.checked
                }));
              }}
            />
            <span>
              <span className="block text-sm font-semibold">{zh ? '提交 문의 前必须登录' : ko ? '문의 제출 전 로그인 필수' : 'Require sign-in before inquiry submission'}</span>
              <span className="mt-1 block text-xs leading-5 text-[#647084]">{zh ? '建议先开放会员并稳定运行一至两周，再开启此项。' : ko ? '회원 기능을 먼저 공개하고 1~2주 안정화한 뒤 활성화하는 것을 권장합니다.' : 'Enable this only after customer accounts have been stable for one to two weeks.'}</span>
            </span>
          </label>
          <div className="flex flex-wrap items-center gap-3 border-t border-[#e4e7ec] pt-4">
            <button
              type="submit"
              disabled={!settingsLoaded || settingsState === 'saving'}
              className="rounded-md bg-[#101827] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {settingsState === 'saving' ? (zh ? '保存中…' : ko ? '저장 중…' : 'Saving…') : (zh ? '保存开放设置' : ko ? '공개 설정 저장' : 'Save rollout settings')}
            </button>
            {settingsState === 'saved' ? <span className="text-sm text-[#027a48]">{zh ? '设置已保存。' : ko ? '설정이 저장되었습니다.' : 'Settings saved.'}</span> : null}
            {settingsState === 'error' ? <span role="alert" className="text-sm text-[#b42318]">{zh ? '保存失败，请重试。' : ko ? '저장하지 못했습니다. 다시 시도하세요.' : 'Unable to save. Try again.'}</span> : null}
          </div>
        </form>
      </section>
      <section className="rounded-lg border border-[#d9dee7] bg-white shadow-sm">
        <div className="border-b border-[#d9dee7] px-5 py-4">
          <h2 className="font-heading text-xl font-semibold">{zh ? '旧 문의认领审核' : ko ? '이전 문의 연결 검토' : 'Legacy inquiry claims'}</h2>
        </div>
        {claims.length === 0 ? (
          <p className="px-5 py-8 text-sm text-[#647084]">{zh ? '暂无待审核申请。' : ko ? '검토 대기 요청이 없습니다.' : 'No claims are waiting for review.'}</p>
        ) : (
          <div className="divide-y divide-[#e4e7ec]">
            {claims.map((claim) => (
              <div key={claim.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_1fr_auto] md:items-center">
                <div>
                  <span className="text-xs text-[#647084]">Inquiry</span>
                  <p className="font-mono text-sm">{claim.inquiryId}</p>
                  <p className="mt-1 text-xs text-[#647084]">
                    {claim.contactHint || '—'} · {claim.matchResult || 'unverified'}
                  </p>
                </div>
                <div><span className="text-xs text-[#647084]">Customer</span><p className="font-mono text-sm">{claim.customerId}</p></div>
                <div className="flex gap-2">
                  <button disabled={busyId === claim.id} onClick={() => void reviewClaim(claim, 'approved')} className="rounded-md bg-[#101827] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{zh ? '批准关联' : ko ? '연결 승인' : 'Approve'}</button>
                  <button disabled={busyId === claim.id} onClick={() => void reviewClaim(claim, 'rejected')} className="rounded-md border border-[#cbd3df] px-3 py-2 text-xs font-semibold disabled:opacity-50">{zh ? '拒绝' : ko ? '거절' : 'Reject'}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="rounded-lg border border-[#d9dee7] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#d9dee7] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <h2 className="font-heading text-xl font-semibold">{zh ? '会员' : ko ? '회원' : 'Customers'}</h2>
          <form onSubmit={search} className="flex gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-h-10 rounded-md border border-[#cbd3df] px-3 text-sm"
              placeholder={zh ? '姓名、邮箱或手机号' : ko ? '이름, 이메일, 휴대폰' : 'Name, email or phone'}
            />
            <button className="min-h-10 rounded-md bg-[#101827] px-4 text-sm font-semibold text-white">
              {zh ? '搜索' : ko ? '검색' : 'Search'}
            </button>
          </form>
        </div>
        {customers.length === 0 ? (
          <p className="px-5 py-10 text-sm text-[#647084]">{zh ? '暂无会员。' : ko ? '회원이 없습니다.' : 'No customers yet.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f8fafc] text-xs uppercase text-[#647084]">
                <tr>
                  <th className="px-5 py-3">{zh ? '姓名' : ko ? '이름' : 'Name'}</th>
                  <th className="px-5 py-3">{zh ? '手机' : ko ? '휴대폰' : 'Mobile'}</th>
                  <th className="px-5 py-3">{zh ? '认证' : ko ? '인증' : 'Verification'}</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">{zh ? '操作' : ko ? '작업' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e7ec]">
                {customers.map((item) => (
                  <tr key={item.customerId}>
                    <td className="px-5 py-4 font-semibold">{item.displayName || item.legalName || '—'}</td>
                    <td className="px-5 py-4">{item.phone}</td>
                    <td className="px-5 py-4">{item.verificationMethod}<br/><span className="text-xs text-[#647084]">{new Date(item.verifiedAt).toLocaleString()}</span></td>
                    <td className="px-5 py-4">{item.status}</td>
                    <td className="px-5 py-4 font-mono text-xs">{item.customerId}</td>
                    <td className="px-5 py-4">
                      {item.status === 'active' || item.status === 'suspended' ? (
                        <button
                          type="button"
                          disabled={busyId === item.customerId}
                          onClick={() => void changeStatus(item)}
                          className="rounded-md border border-[#cbd3df] px-3 py-2 text-xs font-semibold disabled:opacity-50"
                        >
                          {item.status === 'suspended'
                            ? (zh ? '恢复' : ko ? '복구' : 'Restore')
                            : (zh ? '停用' : ko ? '정지' : 'Suspend')}
                        </button>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
