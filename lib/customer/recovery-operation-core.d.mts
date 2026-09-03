export type RecoveryFunctionOutcome = 'success' | 'definiteFailure' | 'unknown';

export function bindPasswordRecoveryOperation(input: {
  operationKey: string;
  loginName: string;
  password: string;
  secret: string;
}): string;

export function classifyRecoveryFunctionResponse(status: number): RecoveryFunctionOutcome;
