export function isNextDynamicServerError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  if ('digest' in error && error.digest === 'DYNAMIC_SERVER_USAGE') {
    return true;
  }

  return error instanceof Error && error.message.includes('Dynamic server usage');
}
