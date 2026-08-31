import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
const shareSource = readFileSync(
  new URL('../../../../../components/news/share-link-button.tsx', import.meta.url),
  'utf8'
);

test('every News detail keeps sharing available even when the article has no tags', () => {
  assert.match(pageSource, /<NewsArticleFooter tags=\{detail\.tags\} shareCopy=\{messages\.newsUi\.share\} \/>/);
  assert.doesNotMatch(pageSource, /const hasTags =/);
});

test('News article footer presents tags as metadata instead of actions', () => {
  assert.match(pageSource, /data-news-article-footer/);
  assert.match(pageSource, /<ul aria-labelledby="news-detail-tags-label"/);
  assert.match(pageSource, /<span aria-hidden="true"[^>]*>#<\/span>/);
});

test('share control has a visible vector icon and announces its completed state', () => {
  assert.match(shareSource, /<svg/);
  assert.match(shareSource, /aria-hidden="true"/);
  assert.match(shareSource, /aria-live="polite"/);
  assert.match(shareSource, /isCompleted \? copy\.copied : copy\.label/);
});
