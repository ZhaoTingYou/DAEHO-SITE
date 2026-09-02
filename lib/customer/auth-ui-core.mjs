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

export function registrationErrorCode(error = {}) {
  const type = String(error.type ?? '').split('#').at(-1);
  const providerMessage = String(error.message ?? '').toLowerCase();

  if (type === 'InvalidPasswordException') {
    return 'invalidPassword';
  }
  if (type === 'UsernameExistsException') {
    return 'usernameExists';
  }
  if (providerMessage.includes('daeho_duplicate_phone')) {
    return 'duplicatePhone';
  }
  if (type === 'UserLambdaValidationException'
      || providerMessage.includes('registration grant')
      || providerMessage.includes('invalid_registration_grant')) {
    return 'expiredGrant';
  }
  if (type === 'TooManyRequestsException' || type === 'LimitExceededException'
      || providerMessage.includes('too many')) {
    return 'rateLimit';
  }
  return 'generic';
}

export function loginErrorCode(error = {}) {
  const type = String(error.type ?? '').split('#').at(-1);
  if (type === 'NotAuthorizedException' || type === 'UserNotFoundException') {
    return 'invalidCredentials';
  }
  if (type === 'PasswordResetRequiredException' || type === 'UserNotConfirmedException') {
    return 'resetRequired';
  }
  if (type === 'TooManyRequestsException' || type === 'LimitExceededException') {
    return 'rateLimit';
  }
  return 'generic';
}
