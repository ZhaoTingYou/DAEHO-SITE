const validationUrl = required(process.env.CUSTOMER_GRANT_VALIDATION_URL);
const customerApiKey = required(process.env.CUSTOMER_INTERNAL_API_KEY);
const customUsernamePoolId = process.env.CUSTOM_USERNAME_POOL_ID ?? '';

export async function handler(event) {
  if (event.triggerSource !== 'PreSignUp_SignUp') {
    return event;
  }
  if (customUsernamePoolId && event.userPoolId === customUsernamePoolId
      && !/^[a-z][a-z0-9._-]{3,23}$/.test(String(event.userName ?? ''))) {
    throw new Error('Login name is invalid');
  }
  const registrationGrant = event.request?.clientMetadata?.registrationGrant;
  const phone = normalizePhone(event.request?.userAttributes?.phone_number);
  // Pools configured with phone_number/email as username attributes replace the
  // submitted Username with an internal UUID before invoking this trigger.
  // The verified phone must therefore be matched against userAttributes below,
  // not event.userName.
  if (!registrationGrant || !phone) {
    throw new Error('Verified registration is required');
  }
  const response = await fetch(validationUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-customer-service-key': customerApiKey
    },
    body: JSON.stringify({
      registrationGrant,
      userPoolId: event.userPoolId,
      clientId: event.callerContext?.clientId,
      username: event.userName
    }),
    signal: AbortSignal.timeout(8_000)
  });
  if (!response.ok) {
    const failure = await response.json().catch(() => ({}));
    if (failure?.error === 'duplicate_phone') {
      throw new Error('DAEHO_DUPLICATE_PHONE');
    }
    throw new Error('Registration grant is invalid or expired');
  }
  const verification = await response.json();
  if (verification.method !== 'sms_declaration' || !verification.adultVerified
      || normalizePhone(verification.phone) !== phone) {
    throw new Error('Registration grant does not match this phone');
  }
  event.response.autoConfirmUser = true;
  event.response.autoVerifyPhone = true;
  return event;
}

function normalizePhone(value) {
  const compact = String(value ?? '').replace(/[^0-9+]/g, '');
  if (compact.startsWith('010')) return `+82${compact.slice(1)}`;
  return /^\+8210\d{8}$/.test(compact) ? compact : '';
}

function required(value) {
  if (!value) throw new Error('Cognito pre-signup environment is incomplete');
  return value;
}
