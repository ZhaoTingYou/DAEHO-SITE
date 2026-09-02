export type AuthLocale = 'ko' | 'en';
export type PasswordPolicyIssue = 'minLength' | 'uppercase' | 'lowercase' | 'number' | 'symbol';

export function authLocaleForReturnTo(returnTo: unknown): AuthLocale;
export function normalizeKoreanPhoneForCognito(input: unknown): string;
export function usernamePolicyIssues(input: unknown): Array<'length' | 'startsWithLetter' | 'characters'>;
export function normalizeLoginName(input: unknown): string;
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
export type RegistrationErrorCode =
  | 'invalidPassword'
  | 'usernameExists'
  | 'duplicatePhone'
  | 'expiredGrant'
  | 'rateLimit'
  | 'generic';
export function registrationErrorCode(error?: {type?: unknown; message?: unknown}): RegistrationErrorCode;
export type LoginErrorCode =
  | 'invalidCredentials'
  | 'resetRequired'
  | 'rateLimit'
  | 'generic';
export function loginErrorCode(error?: {type?: unknown; message?: unknown}): LoginErrorCode;
