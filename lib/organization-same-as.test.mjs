import assert from 'node:assert/strict';
import test from 'node:test';

import {getOrganizationSameAs} from './organization-same-as.mjs';

test('organization sameAs follows enabled CMS footer links and omits placeholder profiles', () => {
  assert.deepEqual(
    getOrganizationSameAs({
      socialLinks: {
        instagram: 'https://instagram.com/dhofficial_1988',
        youtube: 'https://youtube.com/@dhofficial1988',
        twitter: 'https://twitter.com/',
        kakao: 'https://business.kakao.com/_gUxiWV/chats',
        invalid: 'javascript:alert(1)'
      },
      externalSites: {
        items: [
          {href: 'https://daehogold.com/', enabled: true},
          {href: 'https://disabled.example/', enabled: false},
          {href: 'not-a-url', enabled: true}
        ]
      }
    }),
    [
      'https://instagram.com/dhofficial_1988',
      'https://youtube.com/@dhofficial1988',
      'https://daehogold.com/'
    ]
  );
});

test('organization sameAs de-duplicates URLs and handles absent CMS data', () => {
  assert.deepEqual(getOrganizationSameAs(undefined), []);
  assert.deepEqual(
    getOrganizationSameAs({
      socialLinks: {blog: 'https://blog.naver.com/daehovriano'},
      externalSites: {
        items: [{href: 'https://blog.naver.com/daehovriano', enabled: true}]
      }
    }),
    ['https://blog.naver.com/daehovriano']
  );
});
