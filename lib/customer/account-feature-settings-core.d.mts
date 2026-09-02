export type AccountFeatureSettings = {
  customerAccountsEnabled: boolean;
  inquiryAccountRequired: boolean;
};

export function resolveAccountFeatureSettings(
  infrastructureEnabled: boolean,
  source: Partial<AccountFeatureSettings> | null | undefined
): AccountFeatureSettings;
