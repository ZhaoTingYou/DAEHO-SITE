const contactInquiryTypes = ['appointment', 'championship', 'bespoke', 'other'];

export function resolveContactInquiryType(search) {
  const type = new URLSearchParams(search).get('type') ?? '';
  return contactInquiryTypes.includes(type) ? type : 'appointment';
}

export function resolveGolfInquiryQuery(search, options) {
  const params = new URLSearchParams(search);
  const headId = supportedValue(params.get('head'), options.headIds);
  const shaftId = supportedValue(params.get('shaft'), options.shaftIds);
  const style = supportedValue(params.get('style')?.trim(), options.styles);
  const engraving = (params.get('engraving')?.trim().slice(0, 80) || options.defaultEngraving);

  return {headId, shaftId, style, engraving};
}

function supportedValue(value, options) {
  return value && options.includes(value) ? value : (options[0] ?? '');
}
