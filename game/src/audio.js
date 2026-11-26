// Senja Air — sound: everything is synthesised with WebAudio, no audio
// files. Engine hum, wind, ring chime, touchdown thud and the win fanfare.
'use strict';

const AudioEngine = {
  ctx: null,
  master: null,
  engineOsc: null,
  engineGain: null,
  windSource: null,
  windGain: null,
  windFilter: null,
  muted: false,
  unlocked: false,

  unlock() {
    if (this.unlocked) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      // Engine: two detuned sawtooths through a low-pass filter.
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.value = 55 * 1.01;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      const engineFilter = this.ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      this.engineOsc.connect(engineFilter);
      osc2.connect(engineFilter);
      engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
      osc2.start();
      this.engineOsc2 = osc2;
      // Wind: looped noise through a band-pass filter.
      const length = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      this.windSource = this.ctx.createBufferSource();
      this.windSource.buffer = buffer;
      this.windSource.loop = true;
      this.windFilter = this.ctx.createBiquadFilter();
      this.windFilter.type = 'bandpass';
      this.windFilter.frequency.value = 500;
      this.windFilter.Q.value = 0.6;
      this.windGain = this.ctx.createGain();
      this.windGain.gain.value = 0;
      this.windSource.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(this.master);
      this.windSource.start();
      this.unlocked = true;
    } catch (err) {
      this.unlocked = false;
    }
  },

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  },

  // Called every frame with the plane's state; the hum follows throttle.
  update(throttle, speed, airborne) {
    if (!this.unlocked || !this.ctx) return;
    const t = this.ctx.currentTime;
    const freq = 48 + throttle * 55 + speed * 0.25;
    this.engineOsc.frequency.setTargetAtTime(freq, t, 0.1);
    this.engineOsc2.frequency.setTargetAtTime(freq * 1.01, t, 0.1);
    const engineLevel = airborne || throttle > 0.05 ? 0.05 + throttle * 0.09 : 0;
    this.engineGain.gain.setTargetAtTime(engineLevel, t, 0.1);
    const windLevel = clampNumber((speed - 20) / 90, 0, 1) * 0.12;
    this.windGain.gain.setTargetAtTime(windLevel, t, 0.2);
    this.windFilter.frequency.setTargetAtTime(350 + speed * 9, t, 0.2);
  },

  blip(frequency, duration, type, volume, when) {
    if (!this.unlocked || !this.ctx) return;
    const start = this.ctx.currentTime + (when || 0);
    const osc = this.ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.value = frequency;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume || 0.25, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  },

  ringChime() {
    this.blip(880, 0.5, 'sine', 0.3);
    this.blip(1318, 0.7, 'sine', 0.22, 0.08);
  },

  touchdownThud() {
    this.blip(70, 0.25, 'triangle', 0.4);
  },

  crashSound() {
    this.blip(55, 0.8, 'sawtooth', 0.4);
    this.blip(38, 1.0, 'triangle', 0.35, 0.05);
  },

  winFanfare() {
    const notes = [523, 659, 784, 1046, 784, 1046];
    notes.forEach((note, i) => this.blip(note, 0.45, 'triangle', 0.25, i * 0.14));
  },

  loseTone() {
    this.blip(392, 0.4, 'triangle', 0.2);
    this.blip(311, 0.6, 'triangle', 0.2, 0.2);
  },
};
