const validationUrl = required(process.env.CUSTOMER_GRANT_VALIDATION_URL);
const customerApiKey = required(process.env.CUSTOMER_INTERNAL_API_KEY);

export async function handler(event) {
  if (event.triggerSource !== 'PreSignUp_SignUp') {
    return event;
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
    body: JSON.stringify({registrationGrant}),
    signal: AbortSignal.timeout(8_000)
  });
  if (!response.ok) {
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
