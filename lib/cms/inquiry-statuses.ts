import type {AdminLocale} from '@/lib/admin-locales';
import type {CmsInquiryStatusDefinition} from '@/lib/cms/repositories';

export type InquiryStatusOption = {
  code: string;
  label: string;
  color: 'slate' | 'blue' | 'amber' | 'green' | 'red' | 'purple';
  isActive: boolean;
};

export function inquiryStatusOptions(
  definitions: CmsInquiryStatusDefinition[],
  locale: AdminLocale
): InquiryStatusOption[] {
  return definitions.map((item) => ({
    code: item.code,
    label: localizedInquiryStatusLabel(item, locale),
    color: item.color,
    isActive: item.isActive
  }));
}

export function localizedInquiryStatusLabel(item: CmsInquiryStatusDefinition, locale: AdminLocale) {
  if (locale === 'ko') return item.labelKo;
  if (locale === 'zh') return item.labelZh || item.labelKo;
  return item.labelEn || item.labelKo;
}
