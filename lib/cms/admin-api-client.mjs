export async function fetchAdminApi(input, init = {}) {
  const requestInit = {
    ...init,
    credentials: init.credentials ?? 'same-origin'
  };
  const response = await fetch(input, requestInit);

  if (response.status !== 401) {
    return response;
  }

  const recoveryResponse = await fetch(adminApiSessionRecoveryUrl(input), {
    method: 'POST',
    credentials: 'same-origin'
  });

  if (!recoveryResponse.ok) {
    return response;
  }

  return fetch(input, requestInit);
}

function adminApiSessionRecoveryUrl(input) {
  const value =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url;

  try {
    return new URL('/admin/api-session', value).toString();
  } catch {
    return '/admin/api-session';
  }
}
