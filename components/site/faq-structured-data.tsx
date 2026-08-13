import {metadataBase} from '@/lib/seo';

type FaqEntry = {
  question?: string;
  answer?: string;
};

export function FaqStructuredData({faqs, path}: {faqs: readonly FaqEntry[]; path: string}) {
  // CMS에서 문항을 비워두는 경우가 있어, 질문과 답변이 모두 있는 항목만 마크업한다.
  // 화면에 없는 내용을 구조화 데이터로 내보내면 실제 페이지와 어긋난다.
  const entries = faqs
    .map((item) => ({question: item.question?.trim() ?? '', answer: item.answer?.trim() ?? ''}))
    .filter((item) => item.question && item.answer);

  if (entries.length === 0) {
    return null;
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': new URL(`${path}#faq`, metadataBase).toString(),
    mainEntity: entries.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData).replace(/</g, '\\u003c')
      }}
    />
  );
}
