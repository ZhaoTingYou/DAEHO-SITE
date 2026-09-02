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

async function loadCustomerOperations(search = '') {
  const [customersResponse, claimsResponse] = await Promise.all([
    fetch(`/api/admin/customers?query=${encodeURIComponent(search)}`),
    fetch('/api/admin/customer/legacy-claims')
  ]);
  if (!customersResponse.ok || !claimsResponse.ok) {
    throw new Error('Unable to load customer operations');
  }
  return {
    customers: await customersResponse.json() as CustomerProfile[],
    claims: await claimsResponse.json() as PendingClaim[]
  };
}

export function CustomerOperations({locale}: {locale: 'zh' | 'en' | 'ko'}) {
  const ko = locale === 'ko';
  const zh = locale === 'zh';
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [claims, setClaims] = useState<PendingClaim[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const reload = useCallback(async (search = '') => {
    try {
      const result = await loadCustomerOperations(search);
      setCustomers(result.customers);
      setClaims(result.claims);
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
