const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const storage = new Map();
const param = () => ({ value: 0, setValueAtTime(v) { this.value = v; },
  setTargetAtTime(v) { this.value = v; }, linearRampToValueAtTime(v) { this.value = v; },
  exponentialRampToValueAtTime(v) { this.value = v; }, cancelScheduledValues() {} });
let contexts = 0, sources = 0;
class AudioContext {
  constructor() { contexts++; this.currentTime = 0; this.sampleRate = 100; this.state = 'suspended'; }
  resume() { this.state = 'running'; return Promise.resolve(); }
  node() { return { connect() {}, disconnect() {}, gain: param(), frequency: param(), Q: param(),
    start() {}, stop() { this.stopped = true; } }; }
  createGain() { return this.node(); }
  createBiquadFilter() { return this.node(); }
  createDynamicsCompressor() { return { ...this.node(), threshold: param(), knee: param(),
    ratio: param(), attack: param(), release: param() }; }
  createPeriodicWave(real, imaginary) { return { real, imaginary }; }
  createOscillator() { sources++; return { ...this.node(), setPeriodicWave(wave) { this.wave = wave; } }; }
  createBufferSource() { sources++; return this.node(); }
  createBuffer() { return { getChannelData: () => new Float32Array(200) }; }
}
const context = { window: { AudioContext }, localStorage: {
  getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value)
} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../audio.js'), 'utf8'), context);
const Audio = context.window.LPRGameAudio;
const audio = new Audio();
audio.update({ speed: 12 }); audio.lap(true);
assert.equal(contexts, 0, 'No audio before user interaction');
audio.unlock(); audio.unlock();
assert.equal(contexts, 1, 'Repeated gestures reuse one context');
assert.equal(sources, 4, 'Only four continuous sound sources');
audio.update({ speed: 0 });
const idlePitch = audio.engine.source.frequency.value;
audio.update({ speed: 20, throttleInput: 1, grassFraction: .5, bodySlip: .3, tireUse: 1 });
assert(audio.engine.source.frequency.value > idlePitch);
assert(audio.skid.gain.gain.value > 0);
assert(audio.road.gain.gain.value > 0);
audio.update({ speed: 20, tireUse: .98, bodySlip: .07 });
assert.equal(audio.skid.gain.gain.value, 0, 'Normal cornering does not produce constant tire hiss');
audio.update({ speed: 100, throttleInput: 1, tireUse: 2, bodySlip: 1, grassFraction: 0 });
assert(audio.engine.source.frequency.value < 200, 'Top speed stays in a mellow pitch range');
assert(audio.skid.gain.gain.value <= .045, 'Extreme slip remains quieter than the engine');
audio.update({ speed: 20, throttleInput: 1 });
const drivingGain = audio.engine.gain.gain.value;
audio.update({ speed: 20, throttleInput: 1, brakeInput: 1 });
assert(audio.engine.gain.gain.value < drivingGain, 'Brakes take priority over throttle');
for (const state of [{ sauna: true }, { sale: true }, { pool: true }, { crashed: true }]) {
  audio.update({ speed: 20, throttleInput: 1, ...state });
  assert.equal(audio.engine.gain.gain.value, 0);
  assert.equal(audio.skid.gain.gain.value, 0);
  assert.equal(audio.road.gain.gain.value, 0);
}
audio.impact(.1); assert.equal(audio.effects.size, 0);
audio.impact(8); assert.equal(audio.effects.size, 2);
audio.impact(8); assert.equal(audio.effects.size, 2, 'Contact sound has a cooldown');
audio.context.currentTime = 1;
audio.impact(8); assert.equal(audio.effects.size, 4);
audio.lap(true); audio.steam();
assert.equal(audio.effects.size, 9);
const activeEffects = [...audio.effects];
audio.setPaused(true);
assert(activeEffects.every(source => source.stopped));
assert.equal(audio.master.gain.value, 0);
audio.lap(true); audio.steam(); assert.equal(audio.effects.size, 0);
audio.setPaused(false); assert(audio.master.gain.value > 0);
audio.setEnabled(false); assert.equal(audio.master.gain.value, 0);
assert.equal(new Audio().enabled, false, 'Mute preference persists');
const before = sources;
audio.steam(); assert.equal(sources, before, 'Muted effects allocate no sources');
audio.setEnabled(true);
audio.context.state = 'suspended'; audio.unlock(); assert.equal(audio.context.state, 'running');
const unavailable = { window: {}, localStorage: { getItem() { throw Error(); } } };
vm.createContext(unavailable);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../audio.js'), 'utf8'), unavailable);
const silent = new unavailable.window.LPRGameAudio();
silent.unlock(); silent.update({ speed: 1 }); silent.steam(); silent.setEnabled(false);
assert.equal(silent.context, null, 'Unavailable audio and storage leave the game usable');
console.log('PASS: sound activation, driving, effects, cooldown, pause, mute and persistence');
