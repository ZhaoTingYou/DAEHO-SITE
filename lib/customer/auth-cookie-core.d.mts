export type LoginTransaction = {
  state: string;
  nonce: string;
  verifier: string;
  challenge: string;
  returnTo: string;
  expiresAt: number;
  cookieValue(secret: string): string;
};

export type CustomerSession = {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresAt: number;
  absoluteExpiresAt?: number;
  idleExpiresAt?: number;
  subject?: string;
  authTime?: number;
};

export function sanitizeReturnTo(value: unknown, fallback?: string): string;
export function createLoginTransaction(input?: {returnTo?: string; now?: number}): LoginTransaction;
export function verifyLoginTransaction(
  cookieValue: string | undefined,
  state: string,
  secret: string,
  now?: number
): Omit<LoginTransaction, 'challenge' | 'cookieValue'> | null;
export function encryptSession(session: CustomerSession, secret: string): string;
export function decryptSession(value: string | undefined, secret: string, now?: number): CustomerSession | null;
export function encryptRegistrationTransaction(registrationGrant: string, secret: string, now?: number): string;
export function decryptRegistrationTransaction(
  value: string | undefined,
  secret: string,
  now?: number
): {kind: 'registration'; registrationGrant: string; expiresAt: number} | null;
