/* Tiny DOM + easing helpers shared across scenes */

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export function qs(sel, root = document) {
  return root.querySelector(sel);
}

export function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

/* Reveal text word-by-word (staggered soft fade, elegant not typewriter) */
export function wordReveal(root, text, { speed = 60, className = "word" } = {}) {
  root.innerHTML = "";
  const words = text.split(" ");
  const frag = document.createDocumentFragment();
  words.forEach((word, i) => {
    const w = el("span", className, word);
    w.style.transitionDelay = `${i * speed}ms`;
    frag.appendChild(w);
    if (i < words.length - 1) frag.appendChild(document.createTextNode(" "));
  });
  root.appendChild(frag);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      qsa(`.${className}`, root).forEach((w) => w.classList.add("show"));
    });
  });
}

/* fade-in-up helper for elements with the .fade-in-up class */
export function revealUp(node, delay = 0) {
  if (!node) return;
  node.style.transitionDelay = `${delay}ms`;
  requestAnimationFrame(() => requestAnimationFrame(() => node.classList.add("in")));
}

/* deterministic pseudo-random in [0,1) */
export function rnd() {
  return Math.random();
}

/* pick a random item */
export function pick(arr) {
  return arr[Math.floor(rnd() * arr.length)];
}