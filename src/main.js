import "./style.css";

import { initState, state, setState } from "./state.js";
import { qs, wait } from "./ui.js";
import { Particles } from "./particles.js";
import { AudioManager } from "./audio.js";
import { createEnvelopeScene } from "./scenes/envelope.js";
import { createPunchScene } from "./scenes/punch.js";
import { createSorrySliderScene } from "./scenes/slider.js";
import {
  createLoadingScene,
  createRevealScene,
  createUpsetScene,
} from "./scenes/final.js";

/* ---------------- boot ---------------- */

initState();

const app = qs("#app");
const stage = qs("#stage");
const particles = new Particles(qs("#particles"));
const audio = new AudioManager();

const scenes = [];

scenes.push(createEnvelopeScene({ stage, audio, onAdvance: () => go(1) }));
scenes.push(
  createPunchScene({ stage, audio, particles, onAdvance: () => go(2) })
);
scenes.push(createSorrySliderScene({ stage, audio, onAdvance: () => go(3) }));
scenes.push(
  createLoadingScene({
    stage,
    onComplete: () => {
      audio.fadeOutAll(4);
      go(4);
    },
  })
);
scenes.push(createRevealScene({ stage, audio, onAdvance: () => go(5) }));
scenes.push(
  createUpsetScene({
    stage,
    app,
    onLoop: () => {
      scenes[0].reset?.();
      setState("envelopeOpened", false);
      setState("song1Finished", false);
      setState("song2Started", false);
      go(0);
    },
    onPuchi: () => go(4),
  })
);

/* ---------------- scene manager ---------------- */

let current = 0;

async function go(next) {
  if (next === current) return;
  const from = scenes[current];
  const to = scenes[next];

  from.node.classList.remove("active");
  from.node.classList.add("out");
  from.hidden?.();

  await wait(state.reducedMotion ? 30 : 620);

  from.node.classList.remove("out");

  setState("currentScene", next);
  to.node.classList.add("active");
  current = next;
  to.shown?.();

  await wait(state.reducedMotion ? 30 : 780);
}

scenes[0].node.classList.add("active");
scenes[0].shown?.();

particles.start();

/* ---------------- audio toggle ---------------- */

const audioToggle = qs("#audio-toggle");
const audioIcon = qs(".audio-toggle-icon", audioToggle);

setTimeout(() => audioToggle.classList.add("visible"), 1200);

audioToggle.addEventListener("click", () => {
  const muted = audio.toggleMute();
  audioToggle.classList.toggle("muted", muted);
  audioToggle.setAttribute("aria-label", muted ? "Unmute music" : "Mute music");
  audioIcon.textContent = muted ? "♪" : "♪";
});

/* ---------------- first paint niceties ---------------- */

window.addEventListener("error", (e) => {
  if (e.message && e.message.includes("Autoplay")) {
    e.preventDefault();
  }
});

window.__bbanggyy = { state, scenes, audio };