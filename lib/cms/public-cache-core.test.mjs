import assert from 'node:assert/strict';
import test from 'node:test';

import {
  allPublicCmsCacheTag,
  collectionMutationCachePaths,
  collectionMutationCacheTags,
  invalidateCachePaths,
  invalidateCacheTags,
  newsMutationCachePaths,
  newsMutationCacheTags,
  pageMutationCachePaths,
  pageMutationCacheTags,
  publicCollectionItemCacheTags,
  publicCollectionListCacheTags,
  publicNewsItemCacheTags,
  publicNewsListCacheTags,
  publicPageCacheTags
} from './public-cache-core.mjs';

test('public CMS reads share the global tag while keeping resource tags isolated', () => {
  assert.deepEqual(publicPageCacheTags('ko', 'contact'), [
    'cms:all',
    'cms:page:ko:contact'
  ]);
  assert.deepEqual(publicNewsListCacheTags('en'), [
    'cms:all',
    'cms:news:list:en'
  ]);
  assert.deepEqual(publicNewsItemCacheTags('ko', 'launch'), [
    'cms:all',
    'cms:news:item:ko:launch'
  ]);
  assert.deepEqual(publicCollectionListCacheTags('en'), [
    'cms:all',
    'cms:collection:list:en'
  ]);
  assert.deepEqual(publicCollectionItemCacheTags('ko', 'champion'), [
    'cms:all',
    'cms:collection:item:ko:champion'
  ]);
});

test('page saves invalidate only both localized versions of that CMS page', () => {
  assert.deepEqual(pageMutationCacheTags('contact'), [
    'cms:page:ko:contact',
    'cms:page:en:contact'
  ]);
  assert.deepEqual(pageMutationCachePaths('contact', '/contact'), [
    {path: '/ko/contact'},
    {path: '/en/contact'}
  ]);
  assert.deepEqual(pageMutationCachePaths('common', '/'), [
    {path: '/[locale]', type: 'layout'},
    {path: '/rss.xml'},
    {path: '/sitemap.xml'}
  ]);
});

test('news saves invalidate localized lists and both old and new slugs', () => {
  assert.deepEqual(newsMutationCacheTags('old-slug', 'new-slug'), [
    'cms:news:list:ko',
    'cms:news:list:en',
    'cms:news:item:ko:old-slug',
    'cms:news:item:en:old-slug',
    'cms:news:item:ko:new-slug',
    'cms:news:item:en:new-slug'
  ]);
  assert.ok(newsMutationCachePaths('old-slug', 'new-slug').some(
    (entry) => entry.path === '/ko/news/old-slug'
  ));
  assert.ok(newsMutationCachePaths('old-slug', 'new-slug').some(
    (entry) => entry.path === '/en/news/new-slug'
  ));
  assert.ok(newsMutationCachePaths('old-slug', 'new-slug').some(
    (entry) => entry.path === '/rss.xml'
  ));
});

test('collection mutation tags ignore blank and duplicate slugs', () => {
  assert.deepEqual(collectionMutationCacheTags(' champion ', 'champion'), [
    'cms:collection:list:ko',
    'cms:collection:list:en',
    'cms:collection:item:ko:champion',
    'cms:collection:item:en:champion'
  ]);
  assert.equal(allPublicCmsCacheTag, 'cms:all');
  assert.ok(collectionMutationCachePaths('old', 'new').some(
    (entry) => entry.path === '/[locale]/mastery/creations/[slug]' && entry.type === 'page'
  ));
});

test('cache invalidation attempts every unique tag and never turns a saved write into an error', () => {
  const attempted = [];
  const logged = [];

  const result = invalidateCacheTags(
    ['cms:page:ko:contact', 'cms:page:ko:contact', 'cms:page:en:contact'],
    (tag) => {
      attempted.push(tag);
      if (tag === 'cms:page:ko:contact') {
        throw new Error('cache unavailable');
      }
    },
    (message, details) => logged.push({message, details})
  );

  assert.equal(result, false);
  assert.deepEqual(attempted, ['cms:page:ko:contact', 'cms:page:en:contact']);
  assert.equal(logged.length, 1);
  assert.equal(logged[0].details.tag, 'cms:page:ko:contact');
});

test('path invalidation attempts every unique path and never turns a saved write into an error', () => {
  const attempted = [];
  const logged = [];
  const result = invalidateCachePaths(
    [
      {path: '/ko/contact'},
      {path: '/ko/contact'},
      {path: '/[locale]', type: 'layout'}
    ],
    (path, type) => {
      attempted.push({path, type});
      if (path === '/ko/contact') {
        throw new Error('route cache unavailable');
      }
    },
    (message, details) => logged.push({message, details})
  );

  assert.equal(result, false);
  assert.deepEqual(attempted, [
    {path: '/ko/contact', type: undefined},
    {path: '/[locale]', type: 'layout'}
  ]);
  assert.equal(logged.length, 1);
  assert.equal(logged[0].details.path, '/ko/contact');
});
