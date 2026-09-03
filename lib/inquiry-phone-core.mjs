const domesticInquiryPhone = /^010\d{8}$/;
export const inquiryPhonePattern = '010[0-9]{8}';

export function isValidOptionalInquiryPhone(value) {
  const phone = typeof value === 'string' ? value.trim() : '';
  return phone === '' || domesticInquiryPhone.test(phone);
}

export function toDomesticInquiryPhone(value) {
  const phone = typeof value === 'string' ? value.trim() : '';
  if (/^\+8210\d{8}$/.test(phone)) return `0${phone.slice(3)}`;
  return phone;
}

export function sanitizeInquiryPhoneInput(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 11);
}
