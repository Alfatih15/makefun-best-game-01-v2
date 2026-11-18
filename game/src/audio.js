// LUMENFALL — synthesised sound. One job: every effect and every music note
// is made with WebAudio oscillators and noise, so the game ships no audio
// files at all. All calls are safe before the user gestures: ensure() builds
// the context on first interaction and every method no-ops without one.

export function createAudio() {
  const audio = {
    ctx: null,
    master: null,
    musicGain: null,
    muted: false,
    musicOn: false,
    musicTimer: 0,
    musicStep: 0,
    zone: 'meadow',
  };

  // A gentle pentatonic wander, one note every 0.24 s, per zone.
  const SCALES = {
    meadow: [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5],
    gloom: [440.0, 523.25, 554.37, 659.25, 698.46, 880.0],
    frost: [493.88, 587.33, 698.46, 783.99, 987.77, 1174.66],
  };
  const BASS = { meadow: 130.81, gloom: 110.0, frost: 146.83 };

  audio.ensure = () => {
    if (audio.ctx) {
      if (audio.ctx.state === 'suspended') audio.ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      audio.ctx = new AC();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = audio.muted ? 0 : 0.5;
      audio.master.connect(audio.ctx.destination);
      audio.musicGain = audio.ctx.createGain();
      audio.musicGain.gain.value = 0.16;
      audio.musicGain.connect(audio.master);
      return true;
    } catch {
      return false;
    }
  };

  audio.setMuted = (m) => {
    audio.muted = m;
    if (audio.master) audio.master.gain.value = m ? 0 : 0.5;
  };

  function tone(freq, dur, type, vol, when = 0, slideTo = 0) {
    if (!audio.ctx || audio.muted) return;
    const t0 = audio.ctx.currentTime + when;
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol, freq, when = 0) {
    if (!audio.ctx || audio.muted) return;
    const t0 = audio.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(audio.ctx.sampleRate * dur));
    const buffer = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = audio.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = audio.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = audio.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audio.master);
    src.start(t0);
  }

  const SFX = {
    swing() {
      noise(0.14, 0.25, 2400);
    },
    hit() {
      tone(190, 0.09, 'square', 0.16, 0, 90);
      noise(0.08, 0.18, 1800);
    },
    kill() {
      tone(320, 0.16, 'triangle', 0.2, 0, 70);
      tone(480, 0.1, 'sine', 0.14, 0.05, 120);
    },
    hurt() {
      tone(140, 0.22, 'sawtooth', 0.2, 0, 60);
    },
    coin() {
      tone(988, 0.07, 'sine', 0.16);
      tone(1319, 0.12, 'sine', 0.16, 0.06);
    },
    heart() {
      tone(523, 0.12, 'sine', 0.18);
      tone(784, 0.18, 'sine', 0.18, 0.09);
    },
    potion() {
      tone(392, 0.1, 'sine', 0.16);
      tone(523, 0.1, 'sine', 0.16, 0.08);
      tone(659, 0.16, 'sine', 0.16, 0.16);
    },
    level() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'triangle', 0.18, i * 0.09));
    },
    quest() {
      tone(784, 0.14, 'sine', 0.18);
      tone(988, 0.22, 'sine', 0.18, 0.1);
    },
    shard() {
      [1046, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.3, 'sine', 0.16, i * 0.1));
    },
    boss() {
      tone(98, 0.6, 'sawtooth', 0.22, 0, 49);
      tone(147, 0.5, 'sawtooth', 0.14, 0.15, 73);
    },
    shoot() {
      noise(0.1, 0.2, 3200);
      tone(660, 0.08, 'square', 0.1, 0, 330);
    },
    dash() {
      noise(0.16, 0.2, 3600);
    },
    chest() {
      tone(392, 0.12, 'triangle', 0.18);
      tone(523, 0.12, 'triangle', 0.18, 0.1);
      tone(659, 0.2, 'triangle', 0.18, 0.2);
    },
    buy() {
      tone(1319, 0.08, 'sine', 0.16);
      tone(1568, 0.14, 'sine', 0.16, 0.07);
    },
    deny() {
      tone(220, 0.12, 'square', 0.12, 0, 180);
    },
    victory() {
      [523, 659, 784, 1046, 1319, 1568].forEach((f, i) => tone(f, 0.35, 'triangle', 0.18, i * 0.12));
    },
    over() {
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.4, 'triangle', 0.16, i * 0.16));
    },
  };

  audio.sfx = (name) => {
    if (SFX[name]) SFX[name]();
  };

  audio.startMusic = () => {
    audio.musicOn = true;
  };
  audio.stopMusic = () => {
    audio.musicOn = false;
  };
  audio.setZone = (zone) => {
    audio.zone = zone;
  };

  // Call every frame: steps the music sequencer.
  audio.update = (dt) => {
    if (!audio.ctx || audio.muted || !audio.musicOn) return;
    audio.musicTimer -= dt;
    if (audio.musicTimer > 0) return;
    audio.musicTimer = 0.24;
    const scale = SCALES[audio.zone] || SCALES.meadow;
    audio.musicStep += 1;
    // A wandering melody: mostly stepwise, sometimes a leap, rests often.
    if (audio.musicStep % 2 === 0) {
      const idx = (audio.musicStep * 7 + 3) % scale.length;
      const f = scale[idx] * (audio.musicStep % 16 === 0 ? 2 : 1);
      if (audio.musicStep % 5 !== 0) {
        const osc = audio.ctx.createOscillator();
        const gain = audio.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0, audio.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.5, audio.ctx.currentTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, audio.ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(audio.musicGain);
        osc.start();
        osc.stop(audio.ctx.currentTime + 0.55);
      }
    }
    if (audio.musicStep % 8 === 0) {
      const osc = audio.ctx.createOscillator();
      const gain = audio.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = BASS[audio.zone] || BASS.meadow;
      gain.gain.setValueAtTime(0, audio.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.6, audio.ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.ctx.currentTime + 1.6);
      osc.connect(gain);
      gain.connect(audio.musicGain);
      osc.start();
      osc.stop(audio.ctx.currentTime + 1.7);
    }
  };

  return audio;
}
