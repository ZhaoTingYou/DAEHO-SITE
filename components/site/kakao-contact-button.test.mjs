import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

function read(path) {
  return existsSync(new URL(path, import.meta.url))
    ? readFileSync(new URL(path, import.meta.url), 'utf8')
    : '';
}

const component = read('./kakao-contact-button.tsx');
const floatingActions = read('./site-floating-actions.tsx');
const publicLayout = read('../../app/[locale]/(site)/layout.tsx');
const adminLayout = read('../../app/admin/layout.tsx');
const analyticsProvider = read('../analytics/analytics-provider.tsx');
const globals = read('../../app/globals.css');
const backToTop = read('./back-to-top-button.tsx');
const koMessages = JSON.parse(read('../../messages/ko.json'));
const enMessages = JSON.parse(read('../../messages/en.json'));

test('all public pages mount the contact seal while admin pages stay unchanged', () => {
  assert.match(publicLayout, /<SiteFloatingActions/);
  assert.match(publicLayout, /kakaoCopy=\{messages\.common\.kakaoContact\}/);
  assert.doesNotMatch(adminLayout, /KakaoContact|SiteFloatingActions/);
});

test('contact seal exposes an accessible temporary notice with every close path', () => {
  assert.match(component, /className="pointer-events-none relative/);
  assert.match(component, /role="status"[\s\S]*?className="[^"]*pointer-events-auto/);
  assert.match(component, /aria-controls=\{noticeId\}[\s\S]*?className=\{`[^`]*pointer-events-auto/);
  assert.match(component, /aria-expanded=\{state\.noticeOpen\}/);
  assert.match(component, /aria-controls=\{noticeId\}/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /event\.key === 'Escape'/);
  assert.match(component, /event\.target instanceof Node/);
  assert.match(component, /triggerRef\.current\?\.focus\(\)/);
  assert.doesNotMatch(component, /dismissNotice\(false\)/);
  assert.match(component, /onActivate\?\.\(\)/);
  assert.match(component, /role="status"[\s\S]*?className="[^"]*\bz-20\b/);
  assert.doesNotMatch(component, /Kakao\.init|Kakao\.Channel|kakao_js_sdk|<script/i);
});

test('contact trigger uses one clipped fixed canvas and one anchored signet', () => {
  assert.match(component, /h-14 w-\[13\.5rem\][^\"]*md:h-16 md:w-\[15\.5rem\]/);
  assert.equal((component.match(/\[clip-path:inset\(/g) ?? []).length, 1);
  assert.match(component, /\[--kakao-contact-inset:160px\]/);
  assert.match(component, /md:\[--kakao-contact-inset:184px\]/);
  assert.match(component, /duration-\[300ms\]/);
  assert.match(component, /duration-\[240ms\]/);
  assert.match(component, /ease-\[cubic-bezier\(\.16,1,\.3,1\)\]/);
  assert.match(component, /transition-\[clip-path,transform\]/);
  assert.match(component, /motion-reduce:transition-none/);
  assert.match(component, /translate-x-3 opacity-0/);
  assert.equal((component.match(/<KakaoJewelrySignet/g) ?? []).length, 1);
  assert.doesNotMatch(component, /expanded\s*\?\s*'w-/);
});

test('jewelry signet uses the approved monogram and restrained material palette', () => {
  assert.match(component, /src="\/images\/logo\.png"/);
  assert.match(component, /bg-\[#101D30\]/);
  assert.match(component, /bg-\[#C6AE78\]/);
  assert.match(component, /bg-\[#F7F3EA\]/);
  assert.match(component, /bg-\[#FEE500\]/);
  assert.match(component, /size-4[^\"]*md:size-\[18px\]/);
  assert.match(component, /group-focus-visible:ring-2/);
  assert.doesNotMatch(component, /KakaoTalkSealMark|TALK|backdrop-blur|loop|shine/i);
});

test('temporary notice is an ivory concierge certificate with a gold connector', () => {
  assert.match(
    component,
    /role="status"[\s\S]*?max-w-\[19rem\][\s\S]*?border-\[#C6AE78\][\s\S]*?bg-\[#F7F3EA\][\s\S]*?text-\[#101D30\]/
  );
  assert.match(component, /text-\[#7A2230\][\s\S]*?\{copy\.noticeEyebrow\}/);
  assert.match(component, /aria-hidden="true"[\s\S]*?src="\/images\/logo\.png"[\s\S]*?opacity-\[0\.06\]/);
  assert.match(component, /aria-label=\{copy\.closeLabel\}[\s\S]*?size-11/);
  assert.match(component, /data-kakao-certificate-connector/);
  assert.doesNotMatch(component, /rotate-45/);
});

test('floating actions share one safe-area rail with a twelve-pixel gap', () => {
  assert.match(floatingActions, /data-site-floating-actions/);
  assert.match(floatingActions, /gap-3/);
  assert.match(floatingActions, /env\(safe-area-inset-bottom\)/);
  assert.match(floatingActions, /z-\[90\]/);
  assert.doesNotMatch(backToTop, /\bfixed\b/);
});

test('analytics consent hides the floating rail while it covers the viewport bottom', () => {
  assert.match(analyticsProvider, /data-analytics-consent-banner/);
  assert.match(globals, /body:has\(\[data-analytics-consent-banner\]\) \[data-site-floating-actions\]/);
  assert.match(globals, /visibility:\s*hidden/);
});

test('Korean and English contact seal copy is complete', () => {
  assert.deepEqual(koMessages.common.kakaoContact, {
    label: '카카오톡 1:1 상담',
    compactLabel: '카카오톡 상담',
    descriptor: 'PRIVATE CONSULTATION',
    noticeEyebrow: 'KAKAO CONCIERGE',
    comingSoonTitle: '카카오톡 상담을 준비 중입니다',
    comingSoonBody: '더 나은 1:1 상담 경험으로 곧 찾아뵙겠습니다.',
    closeLabel: '닫기',
    ariaLabel: '카카오톡 1:1 상담 — 준비 중'
  });
  assert.deepEqual(enMessages.common.kakaoContact, {
    label: 'KakaoTalk Concierge',
    compactLabel: 'KakaoTalk',
    descriptor: '1:1 PRIVATE CONSULTATION',
    noticeEyebrow: 'KAKAO CONCIERGE',
    comingSoonTitle: 'KakaoTalk consultation is coming soon',
    comingSoonBody: 'We’re preparing a better private consultation experience.',
    closeLabel: 'Close',
    ariaLabel: 'KakaoTalk consultation — coming soon'
  });
});
