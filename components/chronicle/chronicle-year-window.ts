export type ChronicleYearReelLayout = {
  activeIndex: number;
  centerRow: number;
  visibleRows: number;
};

export function getChronicleChromeVisibility(controlsVisible: boolean, lineProgress: number) {
  return {
    endNavVisible: controlsVisible && lineProgress > 0.92,
    yearNavVisible: controlsVisible
  };
}

export function getChronicleYearReelLayout(
  totalItems: number,
  activeIndex: number,
  requestedRows = 7
): ChronicleYearReelLayout {
  const total = Math.max(0, Math.trunc(totalItems));
  const normalizedRows = Math.max(1, Math.trunc(requestedRows));
  const visibleRows = normalizedRows % 2 === 0 ? normalizedRows - 1 : normalizedRows;
  const resolvedActiveIndex =
    total === 0 ? 0 : Math.min(total - 1, Math.max(0, Math.trunc(activeIndex)));

  return {
    activeIndex: resolvedActiveIndex,
    centerRow: Math.floor(visibleRows / 2),
    visibleRows
  };
}
