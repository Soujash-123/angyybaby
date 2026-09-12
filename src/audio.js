/* AudioManager
   - Web Audio API with a subtle synthetic reverb for the ambient loop
   - song1 (cold open) plays clean & full; on end, starts song2 (low ambient)
   - graceful fallback to plain <audio> if Web Audio is unavailable
   - tiny synthesized "BONK" / "boing" SFX, no external assets */

import { state } from "./state.js";

const ASSET = (name) => `./assets/${name}`;

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.song1El = null;
    this.song2El = null;
    this.song2Dry = null;
    this.song2Send = null;
    this.song2Rtn = null;
    this.song2Gain = null;
    this.webAudio = false;
    this.muted = state.audioMuted;
  }

  /* must be called from a user gesture (envelope tap) */
  async init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") {
        try {
          await this.ctx.resume();
        } catch (e) {
          /* noop */
        }
      }
      this._applyMute();
      return true;
    }

    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
      this.webAudio = false;
      state.audioReady = true;
      this._applyMute();
      return false;
    }

    try {
      const ctx = new Ctx();
      this.ctx = ctx;
      await ctx.resume();

      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(ctx.destination);

      this.reverb = ctx.createConvolver();
      this.reverb.buffer = this._makeImpulse(2.4, 2.4);
      this.reverbRtn = ctx.createGain();
      this.reverbRtn.gain.value = 0.9;
      this.reverb.connect(this.reverbRtn);
      this.reverbRtn.connect(this.master);

      this.webAudio = true;
      state.audioReady = true;
      this._applyMute();
      return true;
    } catch (e) {
      this.webAudio = false;
      state.audioReady = true;
      return false;
    }
  }

  _makeImpulse(duration, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * duration);
    const buffer = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buffer;
  }

  async _ensureContext() {
    if (!this.ctx && !state.audioReady) return false;
    if (!this.ctx) return false;
    if (this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch (e) {
        /* noop */
      }
    }
    return this.webAudio;
  }

  /* ------- song1 (cold open) ------- */
  playSong1({ onEnded, onError }) {
    const el = new Audio();
    el.preload = "auto";
    el.src = ASSET("song1.m4a");
    this.song1El = el;
    let started = false;

    el.addEventListener("error", () => onError?.(el), { once: true });

    const start = async () => {
      if (started) return;
      started = true;
      const useWeb = await this._ensureContext();
      if (useWeb && this.ctx) {
        try {
          const src = this.ctx.createMediaElementSource(el);
          const g = this.ctx.createGain();
          g.gain.value = 0.9;
          src.connect(g);
          g.connect(this.master);
          this.song1Gain = g;
        } catch (e) {
          this.webAudio = false;
          el.volume = 0.9;
        }
      } else {
        el.volume = 0.9;
      }
      state.song1Started = true;
      el.play().catch(() => onError?.(el));
    };

    el.addEventListener(
      "ended",
      () => {
        try {
          if (this.master) el.disconnect?.();
        } catch (e) {
          /* noop */
        }
        onEnded?.();
      },
      { once: true }
    );

    el.load();
    start();
  }

  get song1Duration() {
    return Number.isFinite(this.song1El?.duration) && this.song1El?.duration > 0
      ? this.song1El.duration
      : null;
  }

  /* ------- song2 (ambient loop) ------- */
  async startSong2() {
    if (state.song2Started) return;
    const el = new Audio();
    el.preload = "auto";
    el.loop = true;
    el.src = ASSET("song2.m4a");
    this.song2El = el;

    const targetGain = 0.16;

    const useWeb = await this._ensureContext();
    if (useWeb && this.ctx) {
      try {
        const src = this.ctx.createMediaElementSource(el);
        const dry = this.ctx.createGain();
        dry.gain.value = 0.72;
        const wet = this.ctx.createGain();
        wet.gain.value = 0.45;
        el.volume = 1;
        src.connect(dry);
        src.connect(wet);
        dry.connect(this.master);
        wet.connect(this.reverb);
        this.song2Gain = dry;
        this.song2Dry = dry;
        this.song2Send = wet;
        this.song2Rtn = this.reverbRtn;
        dry.gain.setValueAtTime(0.0001, this.ctx.currentTime);
        wet.gain.setValueAtTime(0.0001, this.ctx.currentTime);
        dry.gain.linearRampToValueAtTime(targetGain * 0.72, this.ctx.currentTime + 3);
        wet.gain.linearRampToValueAtTime(targetGain * 0.45, this.ctx.currentTime + 3);
      } catch (e) {
        this.webAudio = false;
        el.volume = targetGain;
      }
    } else {
      el.volume = targetGain;
    }

    state.song2Started = true;
    try {
      await el.play();
    } catch (e) {
      /* autoplay guard: try resume */
      try {
        await this.ctx?.resume();
      } catch (e2) {
        /* noop */
      }
      el.play().catch(() => {});
    }
  }

  /* softly fade song2 (before the video reveal) */
  fadeOutSong2(duration = 2.5) {
    if (!this.ctx || !this.song2Dry) {
      if (this.song2El) {
        const el = this.song2El;
        const t0 = performance.now();
        const step = (t) => {
          const p = Math.min(1, (t - t0) / (duration * 1000));
          el.volume = Math.max(0, 0.16 * (1 - p));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
      return;
    }
    const t = this.ctx.currentTime;
    try {
      this.song2Dry.gain.cancelScheduledValues(t);
      this.song2Dry.gain.setValueAtTime(this.song2Dry.gain.value, t);
      this.song2Dry.gain.linearRampToValueAtTime(0.0001, t + duration);
      this.song2Send.gain.cancelScheduledValues(t);
      this.song2Send.gain.setValueAtTime(this.song2Send.gain.value, t);
      this.song2Send.gain.linearRampToValueAtTime(0.0001, t + duration);
    } catch (e) {
      /* noop */
    }
  }

  /* softly fade song1 too (it may still be playing in the background
     if the user advanced past the envelope before it ended) */
  fadeOutSong1(duration = 2.5) {
    if (!this.ctx || !this.song1Gain) {
      if (this.song1El) {
        const el = this.song1El;
        const base = 0.9;
        const t0 = performance.now();
        const step = (t) => {
          const p = Math.min(1, (t - t0) / (duration * 1000));
          el.volume = Math.max(0, base * (1 - p));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
      return;
    }
    const t = this.ctx.currentTime;
    try {
      this.song1Gain.gain.cancelScheduledValues(t);
      this.song1Gain.gain.setValueAtTime(this.song1Gain.gain.value, t);
      this.song1Gain.gain.linearRampToValueAtTime(0.0001, t + duration);
    } catch (e) {
      /* noop */
    }
  }

  /* fade all background music (before the kiss video reveal) */
  fadeOutAll(duration = 4) {
    this.fadeOutSong1(duration);
    this.fadeOutSong2(duration);
  }

  /* ------- synthesized SFX ------- */
  async punchHit(level = 1) {
    if (!(await this._ensureContext()) || !this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const out = this.master || ctx.destination;
    const intensity = 0.5 + level * 0.12;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    const f = 130 - level * 12;
    osc.frequency.setValueAtTime(f, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.16);
    const g = ctx.createGain();
    g.gain.setValueAtTime(intensity * 0.9, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(g);
    g.connect(out);
    osc.start(t);
    osc.stop(t + 0.2);

    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.09, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 900 + level * 160;
    bp.Q.value = 0.8;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(intensity * 0.5, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    noise.connect(bp);
    bp.connect(ng);
    ng.connect(out);
    noise.start(t);
  }

  async playBoing() {
    if (!(await this._ensureContext()) || !this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const out = this.master || ctx.destination;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(620, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.22);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    osc.connect(g);
    g.connect(out);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  /* ------- mute control ------- */
  toggleMute() {
    this.muted = !this.muted;
    state.audioMuted = this.muted;
    this._applyMute();
    return this.muted;
  }

  _applyMute() {
    const target = this.muted ? 0 : 1;
    if (this.ctx && this.master) {
      const t = this.ctx.currentTime;
      try {
        this.master.gain.cancelScheduledValues(t);
        this.master.gain.setValueAtTime(this.master.gain.value, t);
        this.master.gain.linearRampToValueAtTime(target, t + 0.25);
      } catch (e) {
        this.master.gain.value = target;
      }
    }
    if (this.song1El) this.song1El.muted = this.muted;
    if (this.song2El) this.song2El.muted = this.muted;
  }
}