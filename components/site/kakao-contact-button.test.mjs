import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import test from 'node:test';

function read(path) {
  return existsSync(new URL(path, import.meta.url))
    ? readFileSync(new URL(path, import.meta.url), 'utf8')
    : '';
}

function classTemplateContaining(source, needle) {
  const templates = [...source.matchAll(/className=\{`([\s\S]*?)`\}/g)].map((match) => match[1]);
  return templates.find((template) => template.includes(needle)) ?? '';
}

function classTokens(template) {
  return new Set(
    (template.match(/\S+/g) ?? []).map((token) => token.replace(/^['"]+|['"]+$/g, ''))
  );
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
const contactTriggerClasses = classTemplateContaining(component, '[clip-path:inset(');
const contactTriggerTokens = classTokens(contactTriggerClasses);

test('all public pages mount the contact seal while admin pages stay unchanged', () => {
  assert.match(publicLayout, /<SiteFloatingActions/);
  assert.match(publicLayout, /kakaoCopy=\{messages\.common\.kakaoContact\}/);
  assert.doesNotMatch(adminLayout, /KakaoContact|SiteFloatingActions/);
});

test('contact trigger keeps fixed mobile and desktop canvas dimensions in every state', () => {
  assert.notEqual(contactTriggerClasses, '');

  const dimensionTokens = [...contactTriggerTokens]
    .filter((token) => /^(?:[\w-]+:)*(?:h|w|size)-/.test(token))
    .sort();
  assert.deepEqual(dimensionTokens, ['h-14', 'md:h-16', 'md:w-[15.5rem]', 'w-[13.5rem]']);

  assert.doesNotMatch(
    component,
    /\btransition-all\b|transition-\[[^\]]*(?:width|height)[^\]]*\]/
  );
});

test('one inset clip reveal keeps one shared signet instead of crossfading shells', () => {
  assert.equal((component.match(/\[clip-path:inset\(/g) ?? []).length, 1);

  for (const token of [
    '[clip-path:inset(0_0_0_var(--kakao-contact-inset)_round_var(--kakao-contact-radius))]',
    'transition-[clip-path,transform]',
    '[--kakao-contact-inset:0px]',
    '[--kakao-contact-inset:160px]',
    'md:[--kakao-contact-inset:184px]'
  ]) {
    assert.equal(contactTriggerTokens.has(token), true, `missing inset reveal token: ${token}`);
  }

  assert.equal((component.match(/<KakaoJewelrySignet\s*\/>/g) ?? []).length, 1);
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
