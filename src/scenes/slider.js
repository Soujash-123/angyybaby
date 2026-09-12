/* Scene 2 — the apology slider. No matter where she drags it, it boings back
   to VERY VERY SORRY. */

import { el, qs, revealUp, wordReveal } from "../ui.js";
import { state, setState } from "../state.js";
import { createSpring } from "../spring.js";

export function createSorrySliderScene({ stage, audio, onAdvance }) {
  const scene = el("section", "scene slider-scene");
  scene.setAttribute("aria-label", "How sorry are you? Slider");

  scene.innerHTML = `
    <div class="loc fade-in-up">
      <h1 class="title-xl">How sorry do you think I am?</h1>
    </div>

    <div class="slider-wrap fade-in-up">
      <div class="slider-labels">
        <span class="l-label">VERY VERY SORRY</span>
        <span class="r-label">NOT SORRY AT ALL</span>
      </div>
      <div class="slider">
        <div class="slider-track" aria-hidden="true"></div>
        <div class="slider-fill" aria-hidden="true"></div>
        <div class="slider-thumb">
          <div class="thumb-face" aria-hidden="true"><span class="heart">♥</span></div>
        </div>
        <input class="slider-input" type="range" min="0" max="100" value="0" step="1"
               aria-label="How sorry are you? Very very sorry on the left." />
      </div>
      <div class="slider-hint hand">drag it wherever you want... it won't help 😌</div>
    </div>

    <div class="slider-msgs" aria-live="polite"></div>

    <button class="pill-btn slider-next fade-in-up" type="button" style="display:none;">next →</button>
  `;

  stage.appendChild(scene);

  const slider = qs(".slider", scene);
  const thumb = qs(".slider-thumb", scene);
  const fill = qs(".slider-fill", scene);
  const range = qs(".slider-input", scene);
  const msgs = qs(".slider-msgs", scene);
  const nextBtn = qs(".slider-next", scene);

  const spring = createSpring({ stiffness: 320, damping: 17, mass: 1 });
  let dragging = false;
  let springing = false;
  let rafId = 0;
  let pointerId = null;
  let trackW = 100;

  const updateTrack = () => {
    trackW = Math.max(1, slider.clientWidth - thumb.offsetWidth / 2 - 8);
    render();
  };

  const render = () => {
    const clamped = Math.max(0, Math.min(trackW, spring.pos));
    const value = (clamped / trackW) * 100;
    thumb.style.transform = `translate(${clamped}px, -50%)`;
    fill.style.width = `${value}%`;
    range.value = String(Math.round(value));
    thumb.classList.toggle("fast", value > 2);
    range.setAttribute("aria-valuetext", value > 50 ? "Not sorry at all" : "Very very sorry");
  };

  const stopSpring = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    springing = false;
  };

  const startSpring = () => {
    stopSpring();
    springing = true;
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      const done = spring.step(dt);
      render();
      if (done) {
        stopSpring();
        spring.jump(0);
        render();
      } else {
        rafId = requestAnimationFrame(loop);
      }
    };
    rafId = requestAnimationFrame(loop);
  };

  const onRelease = () => {
    if (!dragging) return;
    dragging = false;
    pointerId = null;
    document.body.classList.remove("dragging-slider");

    setState("sliderInteractionCount", state.sliderInteractionCount + 1);
    audio.playBoing();
    thumb.classList.add("boing");
    setTimeout(() => thumb.classList.remove("boing"), 700);

    spring.set(0);
    startSpring();
    showMessage();
    revealNext();
  };

  const onMove = (clientX) => {
    const rect = slider.getBoundingClientRect();
    const x = clientX - rect.left;
    spring.jump(x - thumb.offsetWidth / 2);
    spring.set(spring.pos);
    render();
  };

  const down = (e) => {
    stopSpring();
    dragging = true;
    pointerId = e.pointerId;
    slider.setPointerCapture(pointerId);
    document.body.classList.add("dragging-slider");
    onMove(e.clientX);
  };
  const move = (e) => {
    if (!dragging || e.pointerId !== pointerId) return;
    onMove(e.clientX);
  };
  const up = (e) => {
    if (!dragging || e.pointerId !== pointerId) return;
    onRelease();
  };

  slider.addEventListener("pointerdown", down);
  slider.addEventListener("pointermove", move);
  slider.addEventListener("pointerup", up);
  slider.addEventListener("pointercancel", up);

  /* keyboard via the range input */
  range.addEventListener("input", () => {
    if (!dragging) {
      const value = Number(range.value);
      spring.jump((value / 100) * trackW);
      spring.set(spring.pos);
      render();
    }
  });
  range.addEventListener("change", () => {
    if (dragging) return;
    onRelease();
  });

  const messages = [
    "Nice try bebe. 😭",
    "You're not getting that answer out of me.",
    "VERY VERY SORRY. ❤️",
  ];

  const showMessage = () => {
    const idx = state.sliderInteractionCount - 1;
    if (idx < 0 || idx >= messages.length) return;
    const line = el("div", "s-msg", messages[idx]);
    if (idx === messages.length - 1) line.classList.add("final");
    msgs.appendChild(line);
    requestAnimationFrame(() => requestAnimationFrame(() => line.classList.add("show")));
  };

  const revealNext = () => {
    if (nextBtn.style.display === "none") {
      nextBtn.style.display = "";
      requestAnimationFrame(() => requestAnimationFrame(() => revealUp(nextBtn, 300)));
    }
  };

  nextBtn.addEventListener("click", () => onAdvance());

  return {
    node: scene,
    shown() {
      updateTrack();
      qsaFade(scene).forEach((node, i) => {
        if (node === nextBtn && nextBtn.style.display === "none") return;
        revealUp(node, i * 140);
      });
      const h1 = scene.querySelector(".loc h1");
      wordReveal(h1, "How sorry do you think I am?", { speed: 34 });
      if (state.sliderInteractionCount > 0) {
        revealNext();
      }
    },
    hidden() {
      stopSpring();
    },
  };
}

function qsaFade(scene) {
  return Array.from(scene.querySelectorAll(".fade-in-up")).filter(
    (n) => !(n.classList.contains("slider-next") && n.style.display === "none")
  );
}