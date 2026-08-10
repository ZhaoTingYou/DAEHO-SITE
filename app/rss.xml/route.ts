import {NextResponse} from 'next/server';

import {getNewsCardsForSite} from '@/lib/cms/public-content';
import {metadataBase} from '@/lib/seo';

export const dynamic = 'force-static';
export const revalidate = 3600;

export async function GET() {
  const cards = await getNewsCardsForSite('ko');
  const buildDate = new Date().toUTCString();
  const items = cards
    .map((card) => {
      const link = absoluteUrl(`/ko/news/${card.id}`);
      const description = [card.categoryLabel, card.date].filter(Boolean).join(' | ');
      const pubDate = rssDate(card.date);

      return [
        '<item>',
        `<title>${xmlEscape(card.title)}</title>`,
        `<link>${xmlEscape(link)}</link>`,
        `<guid isPermaLink="true">${xmlEscape(link)}</guid>`,
        description ? `<description>${xmlEscape(description)}</description>` : '',
        pubDate ? `<pubDate>${pubDate}</pubDate>` : '',
        '</item>'
      ]
        .filter(Boolean)
        .join('');
    })
    .join('');
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '<channel>',
    '<title>대호 뉴스 | DAEHO</title>',
    `<link>${xmlEscape(absoluteUrl('/ko/news'))}</link>`,
    '<description>대호(DAEHO)의 우승반지 제작 사례, 프로젝트 스토리, 협업 소식을 전합니다.</description>',
    '<language>ko-KR</language>',
    `<lastBuildDate>${buildDate}</lastBuildDate>`,
    items,
    '</channel>',
    '</rss>'
  ].join('');

  return new NextResponse(xml, {
    headers: {
      'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=60',
      'content-type': 'application/rss+xml; charset=utf-8'
    }
  });
}

function absoluteUrl(path: string) {
  return new URL(path, metadataBase).toString();
}

function rssDate(value: string) {
  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? new Date(timestamp).toUTCString() : '';
}

function xmlEscape(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
