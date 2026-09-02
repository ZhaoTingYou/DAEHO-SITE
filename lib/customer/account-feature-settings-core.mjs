export function resolveAccountFeatureSettings(infrastructureEnabled, source) {
  const customerAccountsEnabled = infrastructureEnabled === true
    && source?.customerAccountsEnabled === true;
  return {
    customerAccountsEnabled,
    inquiryAccountRequired: customerAccountsEnabled
      && source?.inquiryAccountRequired === true
  };
}
