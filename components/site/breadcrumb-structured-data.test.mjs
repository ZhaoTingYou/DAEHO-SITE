import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const componentSource = readFileSync(new URL('./breadcrumb-structured-data.tsx', import.meta.url), 'utf8');
const newsDetailSource = readFileSync(
  new URL('../../app/[locale]/(site)/news/[slug]/page.tsx', import.meta.url),
  'utf8'
);
const collectionDetailSource = readFileSync(
  new URL('../../app/[locale]/(site)/mastery/creations/[slug]/page.tsx', import.meta.url),
  'utf8'
);
const koMessages = JSON.parse(readFileSync(new URL('../../messages/ko.json', import.meta.url), 'utf8'));
const enMessages = JSON.parse(readFileSync(new URL('../../messages/en.json', import.meta.url), 'utf8'));

test('breadcrumb schema follows the shape Google expects', () => {
  assert.match(componentSource, /'@type': 'BreadcrumbList'/);
  assert.match(componentSource, /'@type': 'ListItem'/);
  assert.match(componentSource, /position: index \+ 1/);
  assert.match(componentSource, /name: crumb\.name/);
});

test('last breadcrumb omits its link because it is the current page', () => {
  // schema.org 권장 방식. 마지막 항목에 item을 넣으면 리치 결과에서 경고가 난다.
  assert.match(componentSource, /index < items\.length - 1 \? \{item: absoluteUrl\(crumb\.path\)\} : \{\}/);
});

test('breadcrumb renders nothing rather than an empty list', () => {
  assert.match(componentSource, /if \(items\.length === 0\) \{\s*return null;/);
});

test('detail pages declare their hierarchy path', () => {
  for (const [label, source] of [
    ['뉴스 상세', newsDetailSource],
    ['컬렉션 상세', collectionDetailSource]
  ]) {
    assert.match(
      source,
      /import \{BreadcrumbStructuredData\} from '@\/components\/site\/breadcrumb-structured-data';/,
      `${label} 페이지가 브레드크럼 컴포넌트를 import 하지 않습니다.`
    );
    assert.match(source, /<BreadcrumbStructuredData/, `${label} 페이지가 브레드크럼을 렌더하지 않습니다.`);
    assert.match(
      source,
      /messages\.common\.breadcrumb\.home/,
      `${label} 페이지 경로가 홈에서 시작하지 않습니다.`
    );
  }
});

test('breadcrumb labels come from the shared message files, not the component', () => {
  // 라벨을 컴포넌트에 박아두면 프로젝트의 다국어 구조를 벗어나고 CMS에서도 손댈 수 없다.
  assert.doesNotMatch(componentSource, /breadcrumbLabels/);
  assert.doesNotMatch(componentSource, /제작 사례/);

  for (const [label, messages, expected] of [
    ['한국어', koMessages, {home: '홈', news: '뉴스', creations: '제작 사례'}],
    ['영어', enMessages, {home: 'Home', news: 'News', creations: 'Creations'}]
  ]) {
    assert.deepEqual(messages.common.breadcrumb, expected, `${label} 브레드크럼 라벨이 다릅니다.`);
  }
});
