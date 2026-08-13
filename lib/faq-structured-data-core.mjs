export function createFaqStructuredData(faqs, id) {
  const entries = faqs
    .map((item) => ({
      question: item.question?.trim() ?? '',
      answer: item.answer?.trim() ?? ''
    }))
    .filter((item) => item.question && item.answer);

  if (entries.length === 0) {
    return null;
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': id,
    mainEntity: entries.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
    }))
  };
}

export function serializeStructuredData(structuredData) {
  return JSON.stringify(structuredData).replace(/</g, '\\u003c');
}
