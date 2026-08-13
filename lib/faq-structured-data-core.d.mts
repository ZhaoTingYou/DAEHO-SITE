export type FaqEntry = {
  question?: string;
  answer?: string;
};

export type FaqPageStructuredData = {
  '@context': 'https://schema.org';
  '@type': 'FAQPage';
  '@id': string;
  mainEntity: Array<{
    '@type': 'Question';
    name: string;
    acceptedAnswer: {
      '@type': 'Answer';
      text: string;
    };
  }>;
};

export function createFaqStructuredData(
  faqs: readonly FaqEntry[],
  id: string
): FaqPageStructuredData | null;

export function serializeStructuredData(structuredData: FaqPageStructuredData): string;
