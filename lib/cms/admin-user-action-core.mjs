export function createAdminUserIdleState() {
  return {status: 'idle', messageKey: ''};
}

export function createAdminUserSuccessState(messageKey, user, temporaryPassword) {
  return temporaryPassword
    ? {status: 'success', messageKey, user, temporaryPassword}
    : {status: 'success', messageKey, user};
}

export function createAdminUserErrorState(messageKey) {
  return {status: 'error', messageKey};
}
