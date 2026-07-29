import assert from 'node:assert/strict';
import test from 'node:test';

import {
  storageImageSrc,
  storageVideoSrc
} from './media-storage-src-core.mjs';

const mediaBase = 'https://daeho-prod-media.s3.ap-northeast-2.amazonaws.com';

test('relative and legacy local image paths resolve to Storage', () => {
  assert.equal(storageImageSrc('logo.png'), `${mediaBase}/logo.png`);
  assert.equal(storageImageSrc('golf/golf1.png'), `${mediaBase}/golf/golf1.png`);
  assert.equal(storageImageSrc('/images/home_hero.png'), `${mediaBase}/home_hero.png`);
  assert.equal(storageImageSrc('/uploads/archive.png'), `${mediaBase}/archive.png`);
});

test('relative and legacy local video paths resolve to the Storage video prefix', () => {
  assert.equal(storageVideoSrc('home.mp4'), `${mediaBase}/videos/home.mp4`);
  assert.equal(storageVideoSrc('videos/home2.mp4'), `${mediaBase}/videos/home2.mp4`);
  assert.equal(storageVideoSrc('/videos/home2.mp4'), `${mediaBase}/videos/home2.mp4`);
  assert.equal(storageVideoSrc('video/home.webm'), `${mediaBase}/videos/home.webm`);
});

test('external media URLs and unrelated root-relative paths are preserved', () => {
  const external = 'https://cdn.example.com/media/asset.png?version=1';

  assert.equal(storageImageSrc(external), external);
  assert.equal(storageVideoSrc(external), external);
  assert.equal(storageImageSrc('/api/media/asset.png'), '/api/media/asset.png');
  assert.equal(storageVideoSrc('/api/media/asset.mp4'), '/api/media/asset.mp4');
  assert.equal(storageImageSrc(''), '');
  assert.equal(storageVideoSrc(), '');
});

test('relative media keys honor the public Storage base URL configured for the build', async () => {
  const previousBaseUrl = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL = 'https://cdn.example.com/daeho/';

  try {
    const configuredResolver = await import('./media-storage-src-core.mjs?configured-base');

    assert.equal(
      configuredResolver.storageImageSrc('logo.png'),
      'https://cdn.example.com/daeho/logo.png'
    );
    assert.equal(
      configuredResolver.storageVideoSrc('home.mp4'),
      'https://cdn.example.com/daeho/videos/home.mp4'
    );
  } finally {
    if (previousBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_MEDIA_BASE_URL = previousBaseUrl;
    }
  }
});
