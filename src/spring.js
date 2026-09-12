/* Lightweight spring integrator with a slight bass-bounce overshoot.
   Used for the "slider always returns to VERY VERY SORRY" mechanic. */

export function createSpring({ stiffness = 260, damping = 16, mass = 1 } = {}) {
  return {
    pos: 0,
    vel: 0,
    target: 0,
    params: { stiffness, damping, mass },
    set(value) {
      this.target = value;
    },
    jump(value) {
      this.pos = value;
      this.vel = 0;
      this.target = value;
    },
    step(dt) {
      const { stiffness, damping, mass } = this.params;
      if (damping === 0) return;
      const force = (this.target - this.pos) * stiffness;
      const dampingForce = -this.vel * damping;
      const acc = (force + dampingForce) / mass;
      this.vel += acc * dt;
      this.pos += this.vel * dt;
      if (Math.abs(this.pos - this.target) < 0.08 && Math.abs(this.vel) < 0.08) {
        this.pos = this.target;
        this.vel = 0;
        return true;
      }
      return false;
    },
  };
}

/* Reasonably performant spring easing keyframe used by CSS so the whole
   envelope / photo emergence can feel springy without a raf loop */
export const springEase = "cubic-bezier(0.34, 1.56, 0.64, 1)";