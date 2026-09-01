import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
const shareSource = readFileSync(
  new URL('../../../../../components/news/share-link-button.tsx', import.meta.url),
  'utf8'
);
const koMessages = JSON.parse(readFileSync(new URL('../../../../../messages/ko.json', import.meta.url), 'utf8'));
const enMessages = JSON.parse(readFileSync(new URL('../../../../../messages/en.json', import.meta.url), 'utf8'));

test('every News detail keeps sharing available even when the article has no tags', () => {
  assert.match(pageSource, /<NewsArticleFooter tags=\{detail\.tags\} tagsLabel=\{text\.tagsLabel\} shareCopy=\{messages\.newsUi\.share\} \/>/);
  assert.doesNotMatch(pageSource, /const hasTags =/);
});

test('News article footer presents tags as metadata instead of actions', () => {
  assert.match(pageSource, /data-news-article-footer/);
  assert.match(pageSource, /<ul aria-labelledby="news-detail-tags-label"/);
  assert.match(pageSource, /<span aria-hidden="true"[^>]*>#<\/span>/);
  assert.match(pageSource, /flex flex-col gap-8 md:flex-row/);
  assert.match(pageSource, /mt-\[clamp\(24px,3vw,48px\)\]/);
  assert.equal(koMessages.newsUi.detail.tagsLabel, '태그');
  assert.equal(enMessages.newsUi.detail.tagsLabel, 'Tags');
});

test('share control distinguishes native sharing from copied links', () => {
  assert.match(shareSource, /<svg/);
  assert.match(shareSource, /aria-hidden="true"/);
  assert.match(shareSource, /aria-live="polite"/);
  assert.match(shareSource, /setCompletionMessage\(copy\.shared\)/);
  assert.match(shareSource, /setCompletionMessage\(copy\.copied\)/);
  assert.equal(koMessages.newsUi.share.shared, '공유되었습니다.');
  assert.equal(enMessages.newsUi.share.shared, 'Shared.');
});

test('share control uses a burgundy circular icon and stacks at mobile width', () => {
  assert.match(shareSource, /w-full[^\n]+md:w-auto/);
  assert.match(shareSource, /rounded-full[^\n]+bg-accent/);
});
