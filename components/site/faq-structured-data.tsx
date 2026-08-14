import {metadataBase} from '@/lib/seo';
import {
  createFaqStructuredData,
  serializeStructuredData,
  type FaqEntry
} from '@/lib/faq-structured-data-core.mjs';

export function FaqStructuredData({faqs, path}: {faqs: readonly FaqEntry[]; path: string}) {
  // CMS에서 문항을 비워두는 경우가 있어, 질문과 답변이 모두 있는 항목만 마크업한다.
  // 화면에 없는 내용을 구조화 데이터로 내보내면 실제 페이지와 어긋난다.
  const structuredData = createFaqStructuredData(
    faqs,
    new URL(`${path}#faq`, metadataBase).toString()
  );

  if (!structuredData) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: serializeStructuredData(structuredData)
      }}
    />
  );
}
