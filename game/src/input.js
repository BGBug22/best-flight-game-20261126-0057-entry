// Senja Air — keyboard and mouse input. Arrows fly the plane, W/S work
// the throttle, and the mouse clicks the on-screen buttons and can also
// steer while held down.
'use strict';

const Input = {
  keys: {},
  mouseX: 0,
  mouseY: 0,
  mouseDown: false,
  mouseDragX: 0,
  mouseDragY: 0,
  clicked: null, // {x, y} of the last click, consumed by the screens
  anyKeyPressed: false,

  install(canvas) {
    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault();
      }
      if (!event.repeat) {
        this.keys[event.key.toLowerCase()] = true;
        this.anyKeyPressed = true;
        if (event.key === 'Enter') this.keys.enter = true;
      }
    });
    window.addEventListener('keyup', (event) => {
      this.keys[event.key.toLowerCase()] = false;
      if (event.key === 'Enter') this.keys.enter = false;
    });
    canvas.addEventListener('pointerdown', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = event.clientX - rect.left;
      this.mouseY = event.clientY - rect.top;
      this.mouseDown = true;
      this.mouseDragX = 0;
      this.mouseDragY = 0;
      this.clicked = { x: this.mouseX, y: this.mouseY };
      AudioEngine.unlock();
    });
    window.addEventListener('pointermove', (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (this.mouseDown) {
        this.mouseDragX += x - this.mouseX;
        this.mouseDragY += y - this.mouseY;
      }
      this.mouseX = x;
      this.mouseY = y;
    });
    window.addEventListener('pointerup', () => { this.mouseDown = false; });
    window.addEventListener('blur', () => { this.keys = {}; this.mouseDown = false; });
  },

  // -1..1 pitch/roll demand from keys, plus mouse-drag steering.
  readStick() {
    let pitch = 0;
    let roll = 0;
    if (this.keys.arrowup) pitch -= 1; // up arrow = nose down (stick forward)
    if (this.keys.arrowdown) pitch += 1;
    if (this.keys.arrowleft) roll -= 1;
    if (this.keys.arrowright) roll += 1;
    if (this.mouseDown) {
      roll += clampNumber(this.mouseDragX / 60, -1, 1);
      pitch += clampNumber(this.mouseDragY / 60, -1, 1);
      this.mouseDragX *= 0.7;
      this.mouseDragY *= 0.7;
    }
    return { pitch: clampNumber(pitch, -1, 1), roll: clampNumber(roll, -1, 1) };
  },

  readThrottleChange(dt) {
    let change = 0;
    if (this.keys.w) change += 0.6 * dt;
    if (this.keys.s) change -= 0.6 * dt;
    if (this.keys.shift) change += 0.9 * dt;
    if (this.keys.control) change -= 0.9 * dt;
    return change;
  },

  pressed(key) {
    const hit = !!this.keys[key];
    if (hit) this.keys[key] = false;
    return hit;
  },

  consumeClick() {
    const click = this.clicked;
    this.clicked = null;
    return click;
  },
};
