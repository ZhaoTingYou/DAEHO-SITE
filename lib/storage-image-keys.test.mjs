import assert from 'node:assert/strict';
import test from 'node:test';

import {isKnownStorageImageKey} from './storage-image-keys.mjs';

test('legacy image manifest recognizes migrated Storage keys and prefixes', () => {
  assert.equal(isKnownStorageImageKey('home_hero.png'), true);
  assert.equal(isKnownStorageImageKey('/images/team-logos/korean-air-jumbos.png'), true);
  assert.equal(isKnownStorageImageKey('golf/Mask%20group.png?version=1'), true);
  assert.equal(isKnownStorageImageKey('golf/퍼터.png'.normalize('NFD')), true);
  assert.equal(isKnownStorageImageKey('golf/드라이버.png'.normalize('NFD')), true);
});

test('legacy image manifest rejects unknown or mistyped relative keys', () => {
  assert.equal(isKnownStorageImageKey('home_heroo.png'), false);
  assert.equal(isKnownStorageImageKey('/images/not-uploaded.png'), false);
});
