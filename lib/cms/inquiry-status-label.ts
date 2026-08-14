export function statusLabel(
  statuses: ReadonlyArray<{code: string; label: string}>,
  code: string
) {
  return statuses.find((item) => item.code === code)?.label || code;
}
