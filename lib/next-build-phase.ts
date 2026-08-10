export function isProductionBuildPhase() {
  return process.env.NEXT_PHASE === 'phase-production-build';
}
