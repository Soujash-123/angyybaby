/* Scene 1 — the punch arcade: hit Soujash, Momo protects Aaina. */

import { el, qs, wait, revealUp } from "../ui.js";
import { state, setState } from "../state.js";

const KNOCKOUT_AT = 5;
const RESPAWN_MS = 3000;
const COOLDOWN_MS = 420;

const IMPACTS = [
  { cls: "punch-bump", word: "BONK!" },
  { cls: "punch-slam", word: "BAM!" },
  { cls: "punch-rattle", word: "WHAM!" },
  { cls: "punch-oomph", word: "OOF!" },
];

export const createPunchScene = ({ stage, audio, particles, onAdvance }) => {
  const scene = el("section", "scene punch-scene");
  scene.setAttribute("aria-label", "Punch Soujash. Momo protects Aaina.");

  scene.innerHTML = `
    <div class="loc fade-in-up">
      <h1 class="serif">Okay bebe...</h1>
      <p class="hand">You've earned this.</p>
    </div>
    <div class="punch-title-block fade-in-up">
      <div class="big">PUNCH ONE</div>
      <div class="small hand">As much as you like. He can take it.</div>
    </div>
    <div class="punch-cards fade-in-up">
      <article class="char-card aaina-card">
        <div class="char-photo" role="button" tabindex="0" aria-label="Aaina is protected, do not hurt her">
          <img src="./assets/aaina.png" alt="Aaina">
        </div>
        <div class="char-name">Aaina</div>
        <div class="momo-shield">
          <div class="shield-icon"><span class="momo-face" aria-hidden="true">🐱</span></div>
        </div>
      </article>
      <article class="char-card soujash-card hoverable">
        <div class="char-photo" role="button" tabindex="0" aria-label="Soujash, punch me">
          <img src="./assets/soujash-normal.jpg" alt="Soujash, ready to be punched">
          <div class="dead-stars" aria-hidden="true">
            <div class="star-orbit" style="--r:46px; --dur:1.7s"><span class="star">✨</span></div>
            <div class="star-orbit" style="--r:62px; --dur:2.3s"><span class="star">★</span></div>
            <div class="star-orbit" style="--r:34px; --dur:1.4s"><span class="star">⭐</span></div>
          </div>
          <div class="ko-badge" aria-hidden="true">K.O.</div>
          <span class="bonk" aria-hidden="true"></span>
        </div>
        <div class="char-name">Soujash</div>
        <div class="char-tag hand">punch me →</div>
      </article>
    </div>

    <div class="protected-toast" role="status" aria-live="polite">
      <div class="pt-title">PROTECTED BY MOMO 🛡️</div>
      <div class="pt-sub hand">Punch Josh as much as you want.</div>
    </div>

    <div class="punch-footer">
      <div class="unlock-msg" aria-live="polite"></div>
      <button class="pill-btn punch-next is-locked" type="button" aria-disabled="true">NEXT →</button>
    </div>
  `;

  stage.appendChild(scene);

  const app = document.querySelector("#app");
  const soujashCard = qs(".soujash-card", scene);
  const soujashPhoto = qs(".soujash-card .char-photo", scene);
  const soujashImg = qs(".soujash-card img", scene);
  const bonk = qs(".bonk", scene);
  const koBadge = qs(".ko-badge", scene);
  const aainaCard = qs(".aaina-card", scene);
  const aainaPhoto = qs(".aaina-card .char-photo", scene);
  const shield = qs(".momo-shield", scene);
  const toast = qs(".protected-toast", scene);
  const nextBtn = qs(".punch-next", scene);
  const unlockMsg = qs(".unlock-msg", scene);

  let animating = false;
  let shieldTimer = null;

  const vibrate = (ms) => {
    if ("vibrate" in navigator && !state.reducedMotion) navigator.vibrate(ms);
  };

  const spawnImpact = (px, py) => {
    for (let i = 0; i < 6; i++) {
      const dot = el("span", "impact");
      dot.style.left = `${px}px`;
      dot.style.top = `${py}px`;
      dot.style.setProperty("--dx", `${(Math.random() - 0.5) * 90}px`);
      dot.style.setProperty("--dy", `${-30 - Math.random() * 60}px`);
      soujashPhoto.appendChild(dot);
      setTimeout(() => dot.remove(), 650);
    }
  };

  const doPunch = (e) => {
    if (animating || soujashCard.classList.contains("dead")) return;
    animating = true;

    const rect = soujashPhoto.getBoundingClientRect();
    const px = (e.clientX ?? rect.left + rect.width / 2) - rect.left;
    const py = (e.clientY ?? rect.top + rect.height / 2) - rect.top;

    state.punchCount += 1;
    const count = state.punchCount;

    audio.punchHit(Math.min(count, 4));
    vibrate(count >= 3 ? 40 + count * 10 : 25);

    spawnImpact(px, py);

    if (count >= KNOCKOUT_AT) {
      knockout(e);
    } else {
      const fx = IMPACTS[count - 1];
      bonk.textContent = fx.word;
      bonk.classList.remove("pop");
      void bonk.offsetWidth;
      bonk.classList.add("pop");
      soujashPhoto.classList.remove(fx.cls);
      void soujashPhoto.offsetWidth;
      soujashPhoto.classList.add(fx.cls);
      app.classList.remove("stage-shake", "stage-shake-hard");
      app.classList.add(count >= 3 ? "stage-shake-hard" : "stage-shake");
      setTimeout(() => {
        app.classList.remove("stage-shake", "stage-shake-hard");
      }, 650);
      setTimeout(() => {
        animating = false;
      }, COOLDOWN_MS);
    }
  };

  const knockout = () => {
    soujashCard.classList.add("dead");
    koBadge.dataset.show = "1";
    bonk.textContent = "KNOCKED OUT!";
    bonk.classList.remove("pop");
    void bonk.offsetWidth;
    bonk.classList.add("pop");
    soujashImg.src = "./assets/soujash-ded.jpg";
    soujashImg.alt = "Soujash, successfully knocked out";
    app.classList.remove("stage-shake-hard");
    app.classList.add("stage-shake-hard");
    setTimeout(() => app.classList.remove("stage-shake-hard"), 650);
    vibrate([40, 60, 90]);

    if (!state.soujashKnockedOut) {
      setState("soujashKnockedOut", true);
      unlockNext();
    }

    setTimeout(() => respawn(), state.reducedMotion ? 100 : RESPAWN_MS);
    animating = false;
  };

  const respawn = () => {
    soujashCard.classList.remove("dead");
    soujashCard.classList.remove("respawn");
    void soujashCard.offsetWidth;
    soujashCard.classList.add("respawn");
    soujashImg.src = "./assets/soujash-normal.jpg";
    soujashImg.alt = "Soujash, ready to be punched";
    setState("punchCount", 0);
    delete koBadge.dataset.show;
    setTimeout(() => soujashCard.classList.remove("respawn"), 750);
  };

  const unlockNext = async () => {
    const s = state.reducedMotion ? 0 : 1;
    unlockMsg.classList.add("show");
    unlockMsg.textContent = "Okay...";
    await wait(700 * s);
    unlockMsg.textContent = "Sufficient violence detected. 😭";
    await wait(500 * s);
    if (s) particles.burstHearts();
    setState("nextUnlocked", true);
    nextBtn.classList.remove("is-locked");
    nextBtn.setAttribute("aria-disabled", "false");
    nextBtn.classList.remove("unlock-pulse");
    void nextBtn.offsetWidth;
    nextBtn.classList.add("unlock-pulse");
  };

  const showShield = () => {
    if (shield.classList.contains("in")) {
      clearTimeout(shieldTimer);
      shield.classList.remove("in", "ring-out");
      void shield.offsetWidth;
      shield.classList.add("in");
      toast.classList.remove("in");
      void toast.offsetWidth;
      toast.classList.add("in");
    } else {
      shield.classList.add("in");
      toast.classList.add("in");
    }
    audio.playBoing();
    vibrate(18);
    shieldTimer = setTimeout(() => {
      shield.classList.remove("in");
      shield.classList.add("ring-out");
      toast.classList.remove("in");
      setTimeout(() => shield.classList.remove("ring-out"), 500);
    }, 2400);
  };

  const onNext = () => {
    if (!state.nextUnlocked) {
      nextBtn.classList.remove("punch-bump");
      void nextBtn.offsetWidth;
      nextBtn.classList.add("punch-bump");
      return;
    }
    onAdvance();
  };

  soujashPhoto.addEventListener("pointerdown", doPunch);
  soujashPhoto.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      doPunch({ clientX: 0, clientY: 0 });
    }
  });
  aainaPhoto.addEventListener("pointerdown", showShield);
  aainaPhoto.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      showShield();
    }
  });
  nextBtn.addEventListener("click", onNext);

  return {
    node: scene,
    shown() {
      const seq = qsaFade(scene);
      seq.forEach((node, i) => revealUp(node, i * 140));
    },
    hidden() {},
  };
};

function qsaFade(scene) {
  return Array.from(scene.querySelectorAll(".fade-in-up"));
}