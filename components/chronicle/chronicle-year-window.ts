export type ChronicleYearWindow = {
  start: number;
  end: number;
};

export function getChronicleYearWindow(
  totalItems: number,
  activeIndex: number,
  windowSize = 7
): ChronicleYearWindow {
  const total = Math.max(0, Math.trunc(totalItems));

  if (total === 0) {
    return {start: 0, end: 0};
  }

  const requestedSize = Math.max(1, Math.trunc(windowSize));
  const oddWindowSize = requestedSize % 2 === 0 ? requestedSize - 1 : requestedSize;
  const size = Math.min(total, oddWindowSize);
  const active = Math.min(total - 1, Math.max(0, Math.trunc(activeIndex)));
  const start = Math.min(Math.max(0, active - Math.floor(size / 2)), total - size);

  return {start, end: start + size};
}
