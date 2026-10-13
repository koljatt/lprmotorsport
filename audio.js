/* Procedural game sounds: no downloads, and no audio before a user gesture. */
window.LPRGameAudio = class LPRGameAudio {
  constructor() {
    this.enabled = true;
    try { this.enabled = localStorage.getItem('lpr-sound') !== 'off'; } catch {}
    this.context = null;
    this.paused = false;
    this.effects = new Set();
    this.lastImpact = -Infinity;
  }

  unlock() {
    if (!this.enabled || this.paused) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.createGraph();
      }
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
    } catch { /* Audio support must never prevent driving. */ }
  }

  createGraph() {
    const ctx = this.context;
    this.master = ctx.createGain();
    this.master.gain.value = .45;
    const warmth = ctx.createBiquadFilter(), rumbleCut = ctx.createBiquadFilter();
    warmth.type = 'lowpass'; warmth.frequency.value = 3200; warmth.Q.value = .5;
    rumbleCut.type = 'highpass'; rumbleCut.frequency.value = 35; rumbleCut.Q.value = .5;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -24; limiter.knee.value = 18; limiter.ratio.value = 3;
    limiter.attack.value = .02; limiter.release.value = .25;
    this.master.connect(rumbleCut); rumbleCut.connect(warmth); warmth.connect(limiter);
    limiter.connect(ctx.destination);
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const samples = this.noise.getChannelData(0);
    // Correlated noise keeps road texture and steam softer than white hiss.
    let smooth = 0;
    for (let i = 0; i < samples.length; i++) {
      const white = Math.random() * 2 - 1;
      smooth = .85 * smooth + .15 * white;
      samples[i] = .75 * smooth + .15 * white;
    }
    this.engine = this.loop('engine', 'lowpass', 600);
    this.engineBass = this.loop('triangle', 'lowpass', 350);
    this.skid = this.loop('noise', 'bandpass', 1000);
    this.road = this.loop('noise', 'lowpass', 450);
  }

  loop(type, filterType, frequency) {
    const ctx = this.context;
    const source = type === 'noise' ? ctx.createBufferSource() : ctx.createOscillator();
    if (type === 'noise') { source.buffer = this.noise; source.loop = true; }
    else if (type === 'engine') {
      // A rounded fundamental with restrained overtones instead of a buzzy sawtooth.
      source.setPeriodicWave(ctx.createPeriodicWave(
        new Float32Array(6), new Float32Array([0, 1, .3, .12, .045, .015])));
    } else source.type = type;
    const filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = .7;
    gain.gain.value = 0;
    source.connect(filter); filter.connect(gain); gain.connect(this.master);
    source.start();
    return { source, filter, gain };
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    try { localStorage.setItem('lpr-sound', enabled ? 'on' : 'off'); } catch {}
    if (!enabled) this.stopEffects();
    this.setPaused(this.paused);
    if (enabled) this.unlock();
  }

  setPaused(paused) {
    if (paused && !this.paused) this.stopEffects();
    this.paused = paused;
    if (this.master) {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(this.enabled && !paused ? .45 : 0, this.context.currentTime, .025);
    }
  }

  update(car) {
    if (!this.master) return;
    const ctx = this.context, now = ctx.currentTime;
    const driving = !this.paused && this.enabled && !car.crashed && !car.sauna && !car.sale && !car.pool;
    const speed = Math.abs(car.speed || 0);
    const throttle = Math.max(0, (car.throttleInput || 0) * (1 - (car.brakeInput || 0)));
    // The car has a single speed drivetrain: pitch rises continuously with speed.
    const pitch = 48 + Math.min(speed, 50) * 2.5 + throttle * 10;
    this.engine.source.frequency.setTargetAtTime(pitch, now, .16);
    this.engineBass.source.frequency.setTargetAtTime(pitch / 2, now, .16);
    this.engine.filter.frequency.setTargetAtTime(300 + throttle * 400 + Math.min(speed, 50) * 6, now, .16);
    this.engine.gain.gain.setTargetAtTime(driving ? .045 + throttle * .04 : 0, now, .1);
    this.engineBass.gain.gain.setTargetAtTime(driving ? .055 + throttle * .025 : 0, now, .1);
    const slip = Math.max(0, Math.abs(car.bodySlip || 0) - .11) * 2.5;
    const tire = Math.max(0, (car.tireUse || 0) - 1.03) * 1.5;
    const grass = Math.max(0, Math.min(1, car.grassFraction || 0));
    const squeal = Math.min(1, Math.max(slip, tire)) * Math.min(1, speed / 5) * (1 - grass);
    this.skid.filter.frequency.setTargetAtTime(800 + Math.min(speed, 50) * 12, now, .15);
    this.skid.gain.gain.setTargetAtTime(driving ? squeal * squeal * .045 : 0, now, .12);
    this.road.filter.frequency.setTargetAtTime(240 + grass * 400 + (car.kerbFraction || 0) * 250, now, .12);
    this.road.gain.gain.setTargetAtTime(driving ? Math.min(1, speed / 18) * (.008 + grass * .045 + (car.kerbFraction || 0) * .035) : 0, now, .12);
  }

  effect(type, frequency, endFrequency, volume, duration, delay = 0, attack = .03) {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running' || !this.enabled || this.paused) return;
    const source = type === 'noise' ? ctx.createBufferSource() : ctx.createOscillator();
    const filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    const start = ctx.currentTime + delay;
    if (type === 'noise') { source.buffer = this.noise; filter.type = 'lowpass'; }
    else { source.type = type; filter.type = 'lowpass'; filter.frequency.value = 2400; }
    const pitch = type === 'noise' ? filter.frequency : source.frequency;
    pitch.setValueAtTime(frequency, start);
    pitch.exponentialRampToValueAtTime(endFrequency, start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + attack);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(filter); filter.connect(gain); gain.connect(this.master);
    this.effects.add(source);
    source.onended = () => {
      source.disconnect(); filter.disconnect(); gain.disconnect(); this.effects.delete(source);
    };
    source.start(start); source.stop(start + duration + .02);
  }

  impact(speed) {
    if (!this.context || speed < .8 || this.context.currentTime - this.lastImpact < .22) return;
    this.lastImpact = this.context.currentTime;
    const strength = Math.min(1, speed / 10);
    this.effect('noise', 800, 140, .08 + strength * .14, .16 + strength * .18);
    this.effect('sine', 85, 45, strength * .12, .24);
  }

  lap(record) {
    (record ? [392, 493.88, 587.33, 783.99] : [392, 587.33]).forEach((frequency, index) =>
      this.effect('sine', frequency, frequency, .08, .38, index * .21, .045));
  }

  steam() { this.effect('noise', 2800, 700, .14, 1.9, 0, .18); }

  stopEffects() {
    for (const source of this.effects) { try { source.stop(); } catch {} }
    this.effects.clear();
  }
};
