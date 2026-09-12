export const state = {
  currentScene: 0,
  envelopeOpened: false,
  song1Started: false,
  song1Finished: false,
  song2Started: false,
  punchCount: 0,
  soujashKnockedOut: false,
  nextUnlocked: false,
  sliderInteractionCount: 0,
  finalSequenceStarted: false,
  videoStarted: false,
  audioMuted: false,
  reducedMotion: false,
  audioReady: false,
};

export function initState() {
  state.reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function setState(key, value) {
  state[key] = value;
}