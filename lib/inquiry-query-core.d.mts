export type ContactInquiryType = 'appointment' | 'championship' | 'bespoke' | 'other';

export function resolveContactInquiryType(search: string): ContactInquiryType;

export function resolveGolfInquiryQuery(
  search: string,
  options: {
    headIds: readonly string[];
    shaftIds: readonly string[];
    styles: readonly string[];
    defaultEngraving: string;
  }
): {
  headId: string;
  shaftId: string;
  style: string;
  engraving: string;
};
