const CHRONICLE_SCROLL_HINT_HIDE_PROGRESS = 0.01;

export function isChronicleScrollHintVisible(
  introComplete: boolean,
  controlsVisible: boolean,
  lineProgress: number
) {
  return introComplete && controlsVisible && lineProgress <= CHRONICLE_SCROLL_HINT_HIDE_PROGRESS;
}
