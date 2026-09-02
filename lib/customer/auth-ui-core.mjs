const koreanPasswordMessages = {
  minLength: '비밀번호를 8자 이상 입력해 주세요.',
  uppercase: '비밀번호에 영문 대문자를 1개 이상 포함해 주세요.',
  lowercase: '비밀번호에 영문 소문자를 1개 이상 포함해 주세요.',
  number: '비밀번호에 숫자를 1개 이상 포함해 주세요.',
  symbol: '비밀번호에 특수문자를 1개 이상 포함해 주세요.'
};

const englishPasswordMessages = {
  minLength: 'Use at least 8 characters.',
  uppercase: 'Include at least one uppercase letter.',
  lowercase: 'Include at least one lowercase letter.',
  number: 'Include at least one number.',
  symbol: 'Include at least one symbol.'
};

export function authLocaleForReturnTo(returnTo) {
  return String(returnTo ?? '').startsWith('/en/') ? 'en' : 'ko';
}

export function normalizeKoreanPhoneForCognito(input) {
  const compact = String(input ?? '').replace(/[^0-9+]/g, '');
  if (/^010\d{8}$/.test(compact)) return `+82${compact.slice(1)}`;
  if (/^\+8210\d{8}$/.test(compact)) return compact;
  return '';
}

export function usernamePolicyIssues(input) {
  const value = String(input ?? '').trim().toLowerCase();
  const issues = [];
  if (value.length < 4 || value.length > 24) issues.push('length');
  if (!/^[a-z]/.test(value)) issues.push('startsWithLetter');
  if (!/^[a-z0-9._-]*$/.test(value)) issues.push('characters');
  return issues;
}

export function normalizeLoginName(input) {
  const value = String(input ?? '').trim().toLowerCase();
  return usernamePolicyIssues(value).length === 0 ? value : '';
}

export function usernamePolicyMessage(locale) {
  return locale === 'ko'
    ? '아이디는 영문자로 시작하고, 영문 소문자·숫자·마침표·밑줄·하이픈만 사용하여 4~24자로 입력해 주세요.'
    : 'Use 4–24 characters, start with a letter, and use only lowercase letters, numbers, dots, underscores, or hyphens.';
}

export function managedLoginParameters({
  clientId,
  redirectUri,
  returnTo,
  state,
  nonce,
  challenge,
  loginHint,
  reauth = false
}) {
  const normalizedHint = normalizeLoginName(loginHint);
  return {
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid email phone',
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    lang: authLocaleForReturnTo(returnTo),
    ...(normalizedHint ? {login_hint: normalizedHint} : {}),
    ...(reauth ? {prompt: 'login'} : {})
  };
}

export function passwordPolicyIssues(password) {
  const value = String(password ?? '');
  const issues = [];
  if (value.length < 8) issues.push('minLength');
  if (!/[A-Z]/.test(value)) issues.push('uppercase');
  if (!/[a-z]/.test(value)) issues.push('lowercase');
  if (!/[0-9]/.test(value)) issues.push('number');
  if (!/[\p{P}\p{S}]/u.test(value)) issues.push('symbol');
  return issues;
}

export function passwordPolicyMessage(locale, issue) {
  const messages = locale === 'ko' ? koreanPasswordMessages : englishPasswordMessages;
  return messages[issue] ?? (locale === 'ko'
    ? '비밀번호를 다시 확인해 주세요.'
    : 'Check the password and try again.');
}

export function registrationErrorMessage(locale, error = {}) {
  const ko = locale === 'ko';
  const type = String(error.type ?? '').split('#').at(-1);
  const providerMessage = String(error.message ?? '').toLowerCase();

  if (type === 'InvalidPasswordException') {
    return ko
      ? '비밀번호는 8자 이상이며 영문 대문자, 소문자, 숫자, 특수문자를 각각 1개 이상 포함해야 합니다.'
      : 'Use 8 or more characters with uppercase, lowercase, a number, and a symbol.';
  }
  if (type === 'UsernameExistsException') {
    return ko
      ? '이미 사용 중인 아이디입니다. 다른 아이디를 입력해 주세요.'
      : 'That username is already in use. Choose another username.';
  }
  if (providerMessage.includes('daeho_duplicate_phone')) {
    return ko
      ? '이미 가입된 휴대폰 번호입니다. 계정 복구 기능이 열리기 전에는 고객센터로 문의해 주세요.'
      : 'That phone number already has an account. Contact support until account recovery is available.';
  }
  if (type === 'UserLambdaValidationException'
      || providerMessage.includes('registration grant')
      || providerMessage.includes('invalid_registration_grant')) {
    return ko
      ? '휴대폰 인증 시간이 만료되었습니다. 인증번호를 다시 요청해 주세요.'
      : 'Phone verification has expired. Request a new verification code.';
  }
  if (type === 'TooManyRequestsException' || type === 'LimitExceededException'
      || providerMessage.includes('too many')) {
    return ko
      ? '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'
      : 'Too many requests. Wait a moment and try again.';
  }
  return ko
    ? '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
    : 'A temporary error occurred. Please try again shortly.';
}
