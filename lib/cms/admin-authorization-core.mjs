import {randomBytes} from 'node:crypto';

export const adminCapabilities = [
  'content:read',
  'content:write',
  'content:delete',
  'inquiries:read',
  'inquiries:write',
  'analytics:read',
  'notifications:manage',
  'system:manage',
  'users:manage',
  'account:self'
];

const editorCapabilities = new Set(['content:read', 'content:write', 'account:self']);
const lowercase = 'abcdefghijkmnopqrstuvwxyz';
const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const digits = '23456789';
const symbols = '!@#$%^&*_-+=';
const passwordAlphabet = lowercase + uppercase + digits + symbols;
const passwordChangeOnlyPaths = new Set([
  '/admin/account',
  '/admin/api-session',
  '/admin/logout',
  '/api/admin/auth/session',
  '/api/admin/auth/change-own-password'
]);

export function normalizeAdminEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function hasAdminCapability(role, capability) {
  if (!adminCapabilities.includes(capability)) {
    return false;
  }
  return role === 'OWNER' || (role === 'EDITOR' && editorCapabilities.has(capability));
}

export function isPasswordChangeOnlyPath(pathname) {
  if (typeof pathname !== 'string') {
    return false;
  }
  const normalized = pathname.length > 1 && pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname;
  return passwordChangeOnlyPaths.has(normalized);
}

export function generateTemporaryAdminPassword() {
  const characters = [
    randomCharacter(lowercase),
    randomCharacter(uppercase),
    randomCharacter(digits),
    randomCharacter(symbols)
  ];

  while (characters.length < 20) {
    characters.push(randomCharacter(passwordAlphabet));
  }

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }
  return characters.join('');
}

function randomCharacter(alphabet) {
  return alphabet[randomIndex(alphabet.length)];
}

function randomIndex(upperBound) {
  const limit = Math.floor(256 / upperBound) * upperBound;
  while (true) {
    const value = randomBytes(1)[0];
    if (value < limit) {
      return value % upperBound;
    }
  }
}
