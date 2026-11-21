/* 清明上河图 · 声音：汴河水声 / 市井人声 / 鸟鸣 / 古琴 */
(function (QM) {
  'use strict';

  const A = {
    ctx: null,
    started: false,
    muted: false,
    master: null,
    ambience: null,
    music: null,
    timer: null,
    nextNote: 0,
    step: 0
  };
  QM.audio = A;

  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]; // D 宫五声
  const ROOT = 146.83; // D3
  const noteFreq = (semi) => ROOT * Math.pow(2, semi / 12);

  function makeNoiseBuffer(ctx, seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        d[i] = last * 3.2;
      }
    }
    return buf;
  }

  function makeImpulse(ctx, seconds, decay) {
    const rate = ctx.sampleRate, len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (i < rate * 0.02 ? 0.3 : 1);
      }
    }
    return buf;
  }

  A.init = function () {
    if (A.ctx) return A.ctx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx();
    A.ctx = ctx;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 22;
    comp.ratio.value = 3.5;
    comp.attack.value = 0.01;
    comp.release.value = 0.35;

    const master = ctx.createGain();
    master.gain.value = 0.0;
    master.connect(comp);
    comp.connect(ctx.destination);
    A.master = master;

    // 混响
    const reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(ctx, 3.2, 2.6);
    const revGain = ctx.createGain();
    revGain.gain.value = 0.55;
    reverb.connect(revGain);
    revGain.connect(master);
    A.reverb = reverb;

    // 环境总线
    const amb = ctx.createGain();
    amb.gain.value = 0.9;
    amb.connect(master);
    A.ambience = amb;

    // 音乐总线
    const mus = ctx.createGain();
    mus.gain.value = 0.68;
    mus.connect(master);
    mus.connect(reverb);
    A.music = mus;

    const noiseBuf = makeNoiseBuffer(ctx, 4.5);

    /* --- 河水 --- */
    const water = ctx.createBufferSource();
    water.buffer = noiseBuf; water.loop = true;
    const wf = ctx.createBiquadFilter();
    wf.type = 'lowpass'; wf.frequency.value = 620; wf.Q.value = 0.7;
    const wg = ctx.createGain(); wg.gain.value = 0.23;
    water.connect(wf); wf.connect(wg); wg.connect(amb);
    water.start();
    // 水声起伏
    const wlfo = ctx.createOscillator();
    wlfo.frequency.value = 0.11;
    const wlg = ctx.createGain(); wlg.gain.value = 0.07;
    wlfo.connect(wlg); wlg.connect(wg.gain); wlfo.start();
    const wlfo2 = ctx.createOscillator();
    wlfo2.frequency.value = 0.047;
    const wlg2 = ctx.createGain(); wlg2.gain.value = 240;
    wlfo2.connect(wlg2); wlg2.connect(wf.frequency); wlfo2.start();

    /* --- 水拍岸 --- */
    const lap = ctx.createBufferSource();
    lap.buffer = noiseBuf; lap.loop = true;
    const lf = ctx.createBiquadFilter();
    lf.type = 'bandpass'; lf.frequency.value = 340; lf.Q.value = 0.9;
    const lg = ctx.createGain(); lg.gain.value = 0.13;
    lap.connect(lf); lf.connect(lg); lg.connect(amb);
    lap.start();
    const llfo = ctx.createOscillator();
    llfo.frequency.value = 0.33;
    const llg = ctx.createGain(); llg.gain.value = 0.075;
    llfo.connect(llg); llg.connect(lg.gain); llfo.start();

    /* --- 市井人声（多路带通噪声，模拟远处嘈杂） --- */
    for (let i = 0; i < 5; i++) {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf; src.loop = true;
      src.playbackRate.value = 0.75 + Math.random() * 0.6;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 260 + Math.random() * 420;
      bp.Q.value = 3.2;
      const g = ctx.createGain();
      g.gain.value = 0.042 + Math.random() * 0.025;
      src.connect(bp); bp.connect(g); g.connect(amb);
      src.start(ctx.currentTime + Math.random() * 2);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.6 + Math.random() * 1.8;
      const lfg = ctx.createGain(); lfg.gain.value = g.gain.value * 1.5;
      lfo.connect(lfg); lfg.connect(g.gain); lfo.start();
      // 语音音节感
      const lfo2 = ctx.createOscillator();
      lfo2.type = 'square';
      lfo2.frequency.value = 2.2 + Math.random() * 3.5;
      const l2g = ctx.createGain(); l2g.gain.value = g.gain.value * 0.7;
      lfo2.connect(l2g); l2g.connect(bp.frequency); lfo2.start();
    }

    /* --- 鸟鸣 --- */
    A.birdTimer();
    /* --- 远处钟声 --- */
    A.bellTimer();
    /* --- 古琴 --- */
    A.nextNote = ctx.currentTime + 1.2;
    A.timer = setInterval(A.schedule, 220);

    return ctx;
  };

  /* 单音古琴（拨弦合成） */
  A.pluck = function (freq, when, vel) {
    const ctx = A.ctx;
    const t0 = when || ctx.currentTime;
    const v = vel === undefined ? 0.5 : vel;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(A.music);

    // 拨弦谐波
    const parts = [
      { mul: 1, gain: 1.0, decay: 2.4, type: 'triangle' },
      { mul: 2.01, gain: 0.34, decay: 1.5, type: 'sine' },
      { mul: 3.02, gain: 0.16, decay: 1.0, type: 'sine' },
      { mul: 4.98, gain: 0.06, decay: 0.7, type: 'sine' }
    ];
    parts.forEach(p => {
      const o = ctx.createOscillator();
      o.type = p.type;
      o.frequency.value = freq * p.mul;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(p.gain * v * 0.38, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + p.decay);
      o.connect(g); g.connect(out);
      o.start(t0); o.stop(t0 + p.decay + 0.05);
    });
    // 指甲拨弦噪声
    const nb = ctx.createBufferSource();
    const len = Math.floor(ctx.sampleRate * 0.05);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    nb.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = freq * 3; bp.Q.value = 1.4;
    const ng = ctx.createGain(); ng.gain.value = 0.06 * v;
    nb.connect(bp); bp.connect(ng); ng.connect(out);
    nb.start(t0);

    out.gain.setValueAtTime(0, t0);
    out.gain.linearRampToValueAtTime(0.9, t0 + 0.01);
    out.gain.setTargetAtTime(0.0001, t0 + 0.3, 1.4);
  };

  /* 箫声 */
  A.flute = function (freq, when, dur, vel) {
    const ctx = A.ctx;
    const t0 = when, v = vel || 0.3;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const o2 = ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = freq * 2;
    const g2 = ctx.createGain(); g2.gain.value = 0.06;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(v * 0.12, t0 + 0.28);
    g.gain.setValueAtTime(v * 0.12, t0 + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    // 颤音
    const vib = ctx.createOscillator();
    vib.frequency.value = 4.6 + Math.random() * 0.8;
    const vg = ctx.createGain(); vg.gain.value = freq * 0.006;
    vib.connect(vg); vg.connect(o.frequency); vg.connect(o2.frequency);
    // 气声
    const n = ctx.createBufferSource();
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
    n.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq * 1.01; bp.Q.value = 2;
    const ng = ctx.createGain(); ng.gain.value = v * 0.03;
    n.connect(bp); bp.connect(ng); ng.connect(g);

    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(A.music);
    o.start(t0); o2.start(t0); vib.start(t0); n.start(t0);
    o.stop(t0 + dur + 0.1); o2.stop(t0 + dur + 0.1); vib.stop(t0 + dur + 0.1); n.stop(t0 + dur + 0.1);
  };

  /* 钟 / 磬 */
  A.bell = function (when, vel) {
    const ctx = A.ctx;
    const t0 = when, v = vel || 0.5;
    const freqs = [1, 2.4, 3.9, 5.4, 7.1];
    const out = ctx.createGain(); out.gain.value = 1; out.connect(A.music);
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = 92 * f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(v * 0.09 / (i + 1), t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 4.5 / (i * 0.4 + 1));
      o.connect(g); g.connect(out);
      o.start(t0); o.stop(t0 + 5);
    });
  };

  A.birdTimer = function () {
    const bird = () => {
      if (!A.ctx) return;
      const ctx = A.ctx;
      const t0 = ctx.currentTime + Math.random() * 0.6;
      const n = 2 + Math.floor(Math.random() * 5);
      const base = 1800 + Math.random() * 1900;
      for (let i = 0; i < n; i++) {
        const o = ctx.createOscillator();
        o.type = 'sine';
        const st = t0 + i * (0.05 + Math.random() * 0.07);
        const dur = 0.04 + Math.random() * 0.05;
        o.frequency.setValueAtTime(base * (0.9 + Math.random() * 0.3), st);
        o.frequency.exponentialRampToValueAtTime(base * (1.3 + Math.random() * 0.5), st + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, st);
        g.gain.linearRampToValueAtTime(0.02 + Math.random() * 0.02, st + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
        o.connect(g); g.connect(A.ambience);
        o.start(st); o.stop(st + dur + 0.02);
      }
      setTimeout(bird, 900 + Math.random() * 4200);
    };
    setTimeout(bird, 600);
  };

  A.bellTimer = function () {
    const ring = () => {
      if (!A.ctx) return;
      A.bell(A.ctx.currentTime + 0.2, 0.35 + Math.random() * 0.2);
      setTimeout(ring, 32000 + Math.random() * 26000);
    };
    setTimeout(ring, 12000);
  };

  /* 古琴曲调度（五声音阶，散板） */
  A.schedule = function () {
    const ctx = A.ctx;
    if (!ctx) return;
    const look = ctx.currentTime + 2.0;
    while (A.nextNote < look) {
      const t = A.nextNote;
      const s = A.step++;
      if (s % 17 === 0) {
        // 乐句：低音散音 + 泛音
        A.pluck(noteFreq(0), t, 0.85);
        A.pluck(noteFreq(7) * 2, t + 0.9, 0.32);
        A.nextNote += 3.4;
      } else if (s % 11 === 5) {
        A.flute(noteFreq(PENTA[3 + Math.floor(Math.random() * 4)]) * 2, t, 3.2 + Math.random() * 2, 0.5);
        A.nextNote += 2.6;
      } else if (Math.random() < 0.72) {
        const idx = Math.floor(Math.random() * 7);
        A.pluck(noteFreq(PENTA[idx]), t, 0.22 + Math.random() * 0.4);
        if (Math.random() < 0.3) A.pluck(noteFreq(PENTA[idx]) * 2, t + 0.03, 0.15);
        A.nextNote += 0.55 + Math.random() * 1.5;
      } else {
        A.nextNote += 1.2 + Math.random() * 1.8;
      }
    }
  };

  A.start = function () {
    const ctx = A.init();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    A.started = true;
    const t = ctx.currentTime;
    A.master.gain.cancelScheduledValues(t);
    A.master.gain.setValueAtTime(0.0001, t);
    A.master.gain.exponentialRampToValueAtTime(A.muted ? 0.0001 : 1.0, t + 3.5);
  };

  A.setMuted = function (m) {
    A.muted = m;
    if (!A.ctx) return;
    const t = A.ctx.currentTime;
    A.master.gain.cancelScheduledValues(t);
    A.master.gain.setTargetAtTime(m ? 0.0001 : 1.0, t, 0.35);
  };

})(window.QM);
