/* Scene 3 — mysterious loading sequence.
   Scene 4 — final kiss video reveal. */

import { el, qs, wait } from "../ui.js";
import { state, setState } from "../state.js";

export function createLoadingScene({ stage, onComplete }) {
  const scene = el("section", "scene loading-scene");
  scene.setAttribute("aria-label", "Preparing your final apology");

  scene.innerHTML = `
    <div class="load-core">
      <div class="load-ring" aria-hidden="true"></div>
      <div class="load-text">Preparing your final apology...</div>
      <div class="load-bar" aria-hidden="true"><i></i></div>
      <div class="load-progress" aria-hidden="true">0%</div>
    </div>
  `;
  stage.appendChild(scene);

  const text = qs(".load-text", scene);
  const bar = qs(".load-bar i", scene);
  const prog = qs(".load-progress", scene);

  let ran = false;

  return {
    node: scene,
    shown() {
      if (ran) return;
      ran = true;
      setState("finalSequenceStarted", true);
      run();
    },
    hidden() {},
  };

  async function run() {
    const s = state.reducedMotion ? (n) => 0 : (n) => n;
    const steps = [17, 43, 72, 99];
    for (const p of steps) {
      await wait(s(780));
      prog.textContent = `${p}%`;
      bar.style.width = `${p}%`;
    }
    await wait(s(700));
    prog.textContent = "100%";
    bar.style.width = "100%";
    scene.classList.add("complete");
    text.textContent = "Complete.";
    await wait(s(1100));
    scene.classList.add("gone");
    await wait(s(700));
    onComplete();
  }
}

export function createRevealScene({ stage, audio, onAdvance }) {
  const scene = el("section", "scene reveal-scene");
  scene.setAttribute("aria-label", "Your final apology");

  scene.innerHTML = `
    <div class="video-box">
      <video
        playsinline
        webkit-playsinline
        autoplay
        muted
        preload="auto"
        aria-label="A kiss, the real apology"
      >
        <source src="./assets/puchi.mp4" type="video/mp4" />
      </video>
      <div class="reveal-chrome" aria-hidden="true"></div>
    </div>
    <div class="reveal-message">
      <div class="rm-line">I love you, babydoll. ❤️</div>
      <div class="rm-soft">Come here. 🫂</div>
    </div>
    <button class="pill-btn reveal-next" type="button">NEXT →</button>
  `;
  stage.appendChild(scene);

  const box = qs(".video-box", scene);
  const video = qs("video", scene);
  const rmLine = qs(".rm-line", scene);
  const rmSoft = qs(".rm-soft", scene);
  const nextBtn = qs(".reveal-next", scene);
  nextBtn.addEventListener("click", onAdvance);

  let started = false;

  const revealMessage = () => {
    if (started) return;
    started = true;
    rmLine.classList.add("show");
    setTimeout(() => rmSoft.classList.add("show"), state.reducedMotion ? 0 : 800);
  };

  return {
    node: scene,
    shown() {
      if (video.ended) {
        video.currentTime = 0;
      }
      video.addEventListener(
        "playing",
        () => {
          setState("videoStarted", true);
          setTimeout(revealMessage, state.reducedMotion ? 0 : 1400);
        },
        { once: true }
      );
      video.addEventListener(
        "error",
        () => {
          setTimeout(revealMessage, 800);
        },
        { once: true }
      );
      setTimeout(() => box.classList.add("in"), 120);
      const tryPlay = () => {
        const p = video.play();
        if (p) p.catch(() => setTimeout(revealMessage, 1200));
      };
      if (video.readyState >= 2) tryPlay();
      else video.addEventListener("loadeddata", tryPlay, { once: true });
      setTimeout(() => {
        if (!state.videoStarted) revealMessage();
      }, 3000);
    },
    hidden() {
      try {
        video.pause();
      } catch (e) {
        /* noop */
      }
    },
  };
}

export function createUpsetScene({ stage, app, onLoop, onPuchi }) {
  const scene = el("section", "scene upset-scene");
  scene.setAttribute("aria-label", "Are you still upset?");
  scene.innerHTML = `
    <div class="upset-card">
      <div class="upset-kicker hand">One last thing...</div>
      <h1 class="title-hand upset-title">U still upset?</h1>
      <div class="upset-actions">
        <button class="pill-btn upset-yes" type="button">Yes</button>
        <button class="pill-btn upset-no" type="button">No</button>
      </div>
      <p class="upset-reply hand" aria-live="polite"></p>
    </div>
  `;
  stage.appendChild(scene);

  const yesBtn = qs(".upset-yes", scene);
  const noBtn = qs(".upset-no", scene);
  const reply = qs(".upset-reply", scene);
  let askedAgain = false;

  yesBtn.addEventListener("click", () => {
    if (document.fullscreenElement !== app && app.requestFullscreen) {
      const fullscreenRequest = app.requestFullscreen();
      fullscreenRequest.catch((error) => {
        console.error("Unable to enter fullscreen mode.", error);
      });
    }
    onLoop();
  });

  noBtn.addEventListener("click", () => {
    if (!askedAgain) {
      askedAgain = true;
      reply.textContent = "U sure?";
      noBtn.textContent = "Send me a puchi then";
      noBtn.classList.add("puchi-choice");
      yesBtn.classList.add("hidden-choice");
      return;
    }
    window.open("https://wa.me/919831970136", "_blank", "noopener,noreferrer");
  });

  return {
    node: scene,
    shown() {
      askedAgain = false;
      reply.textContent = "";
      noBtn.textContent = "No";
      noBtn.classList.remove("puchi-choice");
      yesBtn.classList.remove("hidden-choice");
    },
    hidden() {},
  };
}