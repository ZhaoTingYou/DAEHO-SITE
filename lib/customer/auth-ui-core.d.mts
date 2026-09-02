export type AuthLocale = 'ko' | 'en';
export type PasswordPolicyIssue = 'minLength' | 'uppercase' | 'lowercase' | 'number' | 'symbol';

export function authLocaleForReturnTo(returnTo: unknown): AuthLocale;
export function normalizeKoreanPhoneForCognito(input: unknown): string;
export function usernamePolicyIssues(input: unknown): Array<'length' | 'startsWithLetter' | 'characters'>;
export function normalizeLoginName(input: unknown): string;
export function usernamePolicyMessage(locale: 'ko' | 'en'): string;
export function managedLoginParameters(input: {
  clientId: string;
  redirectUri: string;
  returnTo?: string | null;
  state: string;
  nonce: string;
  challenge: string;
  loginHint?: string | null;
  reauth?: boolean;
}): Record<string, string>;
export function passwordPolicyIssues(password: unknown): PasswordPolicyIssue[];
export function passwordPolicyMessage(locale: AuthLocale, issue: PasswordPolicyIssue): string;
export function registrationErrorMessage(
  locale: AuthLocale,
  error?: {type?: unknown; message?: unknown}
): string;
