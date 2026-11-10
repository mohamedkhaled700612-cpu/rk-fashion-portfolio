// Background music: off by default (browsers block autoplay), starts on the visitor's tap.
// If assets/audio/theme.mp3 exists it is played; otherwise a soft lounge/runway loop is synthesised
// with the Web Audio API (warm chord pads, muted pulse, brushed hats, sparkling arpeggio).
import { $ } from "./ui.js";
import { t } from "./i18n.js";

const KEY = "rk:music";
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const CHORDS = [[48, 52, 55, 59, 62], [45, 48, 52, 55, 59], [50, 53, 57, 60, 64], [43, 47, 53, 57, 64]];   // Cmaj9 · Am9 · Dm9 · G13
const BPM = 100, BEAT = 60 / BPM, EIGHTH = BEAT / 2, PER_CHORD = 8;                                          // 8 beats per chord

function createSynth() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  const master = ctx.createGain(); master.gain.value = 0;
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp); comp.connect(ctx.destination);

  // reverb from a generated impulse
  const len = ctx.sampleRate * 2.8, imp = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = imp.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  const verb = ctx.createConvolver(); verb.buffer = imp;
  const wet = ctx.createGain(); wet.gain.value = 0.34; verb.connect(wet); wet.connect(master);
  const dry = ctx.createGain(); dry.gain.value = 0.8; dry.connect(master);
  const bus = ctx.createGain(); bus.connect(dry); bus.connect(verb);

  // echo for the sparkle line
  const echo = ctx.createDelay(1); echo.delayTime.value = BEAT * 0.75;
  const fb = ctx.createGain(); fb.gain.value = 0.38; echo.connect(fb); fb.connect(echo);
  const echoOut = ctx.createGain(); echoOut.gain.value = 0.5; echo.connect(echoOut); echoOut.connect(bus);

  const noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }

  const tone = (type, freq, t0, dur, vol, dest, attack = 0.02, lp) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = o;
    if (lp) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = lp; o.connect(f); node = f; }
    node.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + dur + 0.05);
  };

  const pad = (chord, t0) => {
    const dur = BEAT * PER_CHORD;
    chord.forEach((m, i) => [-6, 6].forEach((det) => {
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = "triangle"; o.frequency.value = mtof(m + 12); o.detune.value = det + i;
      f.type = "lowpass"; f.frequency.value = 1100;
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.03, t0 + 1.4); g.gain.linearRampToValueAtTime(0.022, t0 + dur - 0.4); g.gain.linearRampToValueAtTime(0.0001, t0 + dur + 1.2);
      o.connect(f); f.connect(g); g.connect(bus); o.start(t0); o.stop(t0 + dur + 1.3);
    }));
  };
  const kick = (t0) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(130, t0); o.frequency.exponentialRampToValueAtTime(44, t0 + 0.16);
    g.gain.setValueAtTime(0.34, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
    o.connect(g); g.connect(dry); o.start(t0); o.stop(t0 + 0.32);
  };
  const hat = (t0, vol) => {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; f.type = "highpass"; f.frequency.value = 7500;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t0); s.stop(t0 + 0.1);
  };

  let step = 0, nextTime = 0, timer = 0, lastPad = -1;
  const schedule = () => {
    while (nextTime < ctx.currentTime + 0.4) {
      const inChord = step % (PER_CHORD * 2), ci = Math.floor(step / (PER_CHORD * 2)) % CHORDS.length, chord = CHORDS[ci];
      if (inChord === 0 && lastPad !== step) { pad(chord, nextTime); lastPad = step; }
      const beatPos = inChord % 2 === 0;
      if (beatPos) kick(nextTime);                                             // soft four-on-the-floor
      else hat(nextTime, 0.05);                                                // offbeat hats
      if (inChord % 8 === 0 || inChord % 8 === 5) tone("sine", mtof(chord[0] - 12), nextTime, BEAT * 1.2, 0.2, dry, 0.01, 300);   // round bass
      if (Math.random() < 0.62) {                                              // glassy arpeggio, a touch of swing
        const m = chord[1 + Math.floor(Math.random() * (chord.length - 1))] + 24;
        const sw = inChord % 2 ? EIGHTH * 0.12 : 0;
        const g = ctx.createGain(); g.gain.value = 1; g.connect(bus); g.connect(echo);
        tone("triangle", mtof(m), nextTime + sw, 0.9, 0.05, g, 0.005, 3200);
      }
      nextTime += EIGHTH; step++;
    }
  };

  return {
    async start() {
      await ctx.resume();
      if (!timer) { nextTime = ctx.currentTime + 0.1; schedule(); timer = setInterval(schedule, 120); }
      master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.8);
    },
    stop() {
      master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
      setTimeout(() => { clearInterval(timer); timer = 0; ctx.suspend(); }, 900);
    },
    level() { return ctx.state === "running" ? 1 : 0; }
  };
}

export function initMusic() {
  const btn = $("#musicBtn");
  if (!btn) return;
  let engine = null, audio = null, on = false, wantsResume = false;
  try { wantsResume = localStorage.getItem(KEY) === "1"; } catch { /* storage unavailable */ }

  const label = () => {
    btn.setAttribute("aria-pressed", String(on));
    btn.classList.toggle("is-on", on);
    btn.querySelector(".music-btn__t").textContent = t(on ? "music.off" : "music.on");
  };
  const save = () => { try { localStorage.setItem(KEY, on ? "1" : "0"); } catch { /* ignore */ } };

  async function pickEngine() {
    if (engine || audio) return;
    try {
      const r = await fetch("assets/audio/theme.mp3", { method: "HEAD" });
      if (r.ok) { audio = new Audio("assets/audio/theme.mp3"); audio.loop = true; audio.volume = 0.6; return; }
    } catch { /* no file: use the synth */ }
    engine = createSynth();
  }

  async function play() {
    await pickEngine();
    try { audio ? await audio.play() : await engine?.start(); on = !!(audio || engine); } catch { on = false; }
    save(); label();
  }
  function pause() { audio ? audio.pause() : engine?.stop(); on = false; save(); label(); }

  btn.addEventListener("click", () => (on ? pause() : play()));
  document.addEventListener("visibilitychange", () => { if (document.hidden && on) { audio ? audio.pause() : engine?.stop(); } else if (!document.hidden && on) { audio ? audio.play().catch(() => {}) : engine?.start(); } });
  if (wantsResume) {   // the visitor turned it on last time: pick up on their first tap
    const resume = () => { removeEventListener("pointerdown", resume); removeEventListener("keydown", resume); play(); };
    addEventListener("pointerdown", resume, { once: true }); addEventListener("keydown", resume, { once: true });
  }
  document.addEventListener("rk:lang", label);
  label();
  window.__rkMusic = { get on() { return on; }, level: () => engine?.level?.() };
}
