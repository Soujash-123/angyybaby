/* Scene 0 — the envelope. Tap to open, which also unlocks + starts song1.
   Song1 (and later song2) plays as background music; a NEXT button appears
   5s after opening so the song never blocks progress. */

import { el, qs, wait, wordReveal } from "../ui.js";
import { state, setState } from "../state.js";

export function createEnvelopeScene({ stage, audio, onAdvance }) {
  const scene = el("section", "scene env-scene");
  scene.setAttribute("aria-label", "A sealed envelope for you");

  const wrap = el("div", "env-wrap");
  wrap.innerHTML = `
    <div class="env-halo"></div>
    <div class="env" role="button" tabindex="0" aria-label="Open the envelope">
      <div class="env-back"></div>
      <div class="env-letter">
        <div class="sorry-photo"><img src="./assets/sowie.jpg" alt="Sowie, looking very sorry"></div>
      </div>
      <div class="env-pocket"></div>
      <div class="env-flap"><div class="face"></div><div class="face back"></div></div>
      <div class="seal-line" aria-hidden="true">♥</div>
    </div>
  `;

  const caption = el("div", "env-caption");
  caption.innerHTML = `
    <span class="hl hand">For my babydoll.</span>
    <span class="hint hand">Open this before judging me further. 🥺</span>
  `;

  const stand = el("div", "env-stand");
  stand.innerHTML = `
    <div class="stand-photo"><img src="./assets/sowie.jpg" alt="Sowie, emerging from the envelope"></div>
    <div class="stand-msg"><span class="sowie">Sowieeeee 🥺</span></div>
    <div class="stand-apology">
      <div class="line1">I know.</div>
      <div class="line2">I'm very, very sorry. 🥺</div>
    </div>
  `;

  const nextBtn = el("button", "pill-btn env-next", "NEXT →");
  nextBtn.type = "button";

  scene.append(wrap, caption, stand, nextBtn);
  stage.appendChild(scene);

  const env = qs(".env", wrap);
  const standPhoto = qs(".stand-photo", stand);
  const standMsg = qs(".stand-msg .sowie", stand);
  const line1 = qs(".line1", stand);
  const line2 = qs(".line2", stand);

  let busy = false;
  let song1Handled = false;
  let fallbackTimer = null;
  let advanced = false;

  /* song1 is background music only: when it finishes on its own, we hand
     off to song2 (the ambient loop). It never forces a page change. */
  const handOffToSong2 = () => {
    if (song1Handled) return;
    song1Handled = true;
    if (fallbackTimer) clearTimeout(fallbackTimer);
    setState("song1Finished", true);
    audio.startSong2();
  };

  const scheduleSong2Fallback = () => {
    if (fallbackTimer) return;
    const known = audio.song1Duration;
    const ms = (known != null && known > 0 ? known * 1000 : 16000) + 400;
    fallbackTimer = setTimeout(handOffToSong2, ms);
  };

  const revealNext = () => {
    if (nextBtn.classList.contains("show") || advanced) return;
    nextBtn.classList.add("show");
  };

  const advance = () => {
    if (advanced) return;
    advanced = true;
    onAdvance();
  };

  const openSequence = async () => {
    if (busy || state.envelopeOpened) return;
    busy = true;
    setState("envelopeOpened", true);

    audio.init();
    audio.playSong1({
      onEnded: () => handOffToSong2(),
      onError: () => scheduleSong2Fallback(),
    });

    if (!advanced) {
      setTimeout(revealNext, state.reducedMotion ? 0 : 5000);
    }

    const s = state.reducedMotion ? (n) => 0 : (n) => n;

    wrap.classList.add("prepare");
    await wait(s(430));
    wrap.classList.remove("prepare");
    wrap.classList.add("opened");
    await wait(s(1500));

    wrap.classList.add("emerge");
    await wait(s(900));
    wrap.classList.add("retreat");
    await wait(s(380));

    wrap.classList.add("done");
    scene.classList.add("showing-stand");
    stand.classList.add("visible");
    standPhoto.classList.add("spring-in");
    await wait(s(420));
    standMsg.classList.add("show");
    await wait(s(60));
    standPhoto.classList.add("shaking");
    await wait(s(800));
    standPhoto.classList.remove("shaking");

    if (!advanced) {
      await wait(s(120));
      wordReveal(line1, "I know.", { speed: 90 });
      await wait(s(1300));
      wordReveal(line2, "I'm very, very sorry. 🥺", { speed: 80 });
    }
  };

  const onTap = (e) => {
    e.preventDefault();
    openSequence();
  };
  const onKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openSequence();
    }
  };

  env.addEventListener("click", onTap);
  env.addEventListener("keydown", onKey);
  wrap.addEventListener("pointerup", (e) => {
    if (e.target !== env) {
      onTap(e);
    }
  });
  nextBtn.addEventListener("click", advance);

  return {
    node: scene,
    shown() {},
    hidden() {},
    reset() {
      busy = false;
      advanced = false;
      wrap.className = "env-wrap";
      scene.classList.remove("showing-stand");
      stand.classList.remove("visible");
      standPhoto.classList.remove("spring-in", "shaking");
      nextBtn.classList.remove("show");
      line1.textContent = "I know.";
      line2.textContent = "I'm very, very sorry. 🥺";
    },
  };
}