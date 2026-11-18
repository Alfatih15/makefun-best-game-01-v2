// LUMENFALL — the game loop and screens. One job: own the canvas, the
// camera, the screen state machine (title / play / victory / game over,
// with pause, dialogue and shop overlays), and drive update + render each
// frame. Rules live in world.js, drawing in render.js.

import { CFG } from './config.js';
import {
  createWorld, updateWorld, buyItem, loadBest, loadSave, saveGame,
} from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { render } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
canvas.width = CFG.viewW;
canvas.height = CFG.viewH;

function fitCanvas() {
  const scale = Math.min(window.innerWidth / CFG.viewW, window.innerHeight / CFG.viewH);
  canvas.style.width = `${Math.floor(CFG.viewW * scale)}px`;
  canvas.style.height = `${Math.floor(CFG.viewH * scale)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

const input = createInput(canvas);
const audio = createAudio();
let world = createWorld(20261117);
let screen = 'title';
let paused = false;
let best = loadBest();
let saveExists = false;
try {
  saveExists = !!window.localStorage.getItem('lumenfall-save');
} catch {
  saveExists = false;
}

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
let frozen = false;
if (shotName) {
  screen = stageShot(world, shotName);
  frozen = true;
}

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function startRun(fromSave) {
  audio.ensure();
  audio.startMusic();
  if (fromSave && loadSave(world)) {
    setStatus('Lumenfall: your journey continues.');
  } else {
    setStatus('Lumenfall: the Starforge waits. Find the three Sky Shards.');
  }
  screen = 'play';
}

function restartToTitle() {
  world = createWorld((Date.now() % 100000) + 7);
  best = loadBest();
  try {
    saveExists = !!window.localStorage.getItem('lumenfall-save');
  } catch {
    saveExists = false;
  }
  screen = 'title';
  setStatus('Lumenfall: title screen.');
}

// Screen transitions and overlay keys. Runs after the world update so a key
// that opens a panel cannot also advance it in the same frame.
function handleScreens() {
  if (input.wasPressed('KeyM')) audio.setMuted(!audio.muted);
  if (input.mouse.clicked || input.anyKey) audio.ensure();

  if (screen === 'title') {
    if (input.wasPressed('Enter', 'Space') || input.mouse.clicked) startRun(false);
    else if (input.wasPressed('KeyC') && saveExists) startRun(true);
    return;
  }
  if (screen === 'victory' || screen === 'over') {
    if (input.wasPressed('Enter', 'Space') || input.mouse.clicked) restartToTitle();
    return;
  }
  // Playing.
  if (world.shopOpen) {
    if (world.shopFresh) {
      world.shopFresh = false;
      return;
    }
    const buyKeys = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'];
    buyKeys.forEach((code, i) => {
      if (input.wasPressed(code)) buyItem(world, ['potion', 'blade', 'boots', 'charm', 'bow'][i], audio);
    });
    if (input.mouse.clicked) {
      const rect = canvas.getBoundingClientRect();
      const my = input.mouse.y * (CFG.viewH / rect.height);
      const mx = input.mouse.x * (CFG.viewW / rect.width);
      if (mx > CFG.viewW / 2 - 240 && mx < CFG.viewW / 2 + 240) {
        const idx = Math.floor((my - 196) / 56);
        if (idx >= 0 && idx < 5) buyItem(world, ['potion', 'blade', 'boots', 'charm', 'bow'][idx], audio);
      }
    }
    if (input.wasPressed('KeyE', 'Escape')) world.shopOpen = false;
    return;
  }
  if (world.dialogue) {
    const d = world.dialogue;
    if (d.fresh) {
      d.fresh = false;
      return;
    }
    if (input.wasPressed('KeyE', 'Enter', 'Space') || input.mouse.clicked) {
      d.idx += 1;
      if (d.idx >= d.lines.length) world.dialogue = null;
    }
    return;
  }
  if (input.wasPressed('KeyP', 'Escape')) {
    paused = !paused;
    setStatus(paused ? 'Lumenfall: paused.' : 'Lumenfall: playing.');
  }
}

const cam = { x: 0, y: 0 };
let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  const p = world.player;
  cam.x = Math.max(0, Math.min(CFG.worldW - CFG.viewW, p.x - CFG.viewW / 2));
  cam.y = Math.max(0, Math.min(CFG.worldH - CFG.viewH, p.y - CFG.viewH / 2));

  // Aim: mouse position in world coordinates.
  const rect = canvas.getBoundingClientRect();
  input.aimX = cam.x + input.mouse.x * (CFG.viewW / rect.width);
  input.aimY = cam.y + input.mouse.y * (CFG.viewH / rect.height);

  if (!frozen) {
    if (screen === 'play' && !paused && !world.dialogue && !world.shopOpen) {
      updateWorld(world, input, dt, audio);
      audio.update(dt);
    }
    if (screen === 'play' && world.won) {
      screen = 'victory';
      best = loadBest();
      setStatus('Lumenfall: the forge burns bright. You win.');
    }
    if (screen === 'play' && world.over) {
      screen = 'over';
      best = loadBest();
      setStatus('Lumenfall: the light fades. Game over.');
    }
    handleScreens();
  }

  render(ctx, world, cam, screen, { paused, best, saveExists });

  window.__lumenfall = {
    screen,
    hp: p.hp,
    maxHp: p.maxHp,
    x: Math.round(p.x),
    y: Math.round(p.y),
    level: p.level,
    gold: p.gold,
    kills: world.stats.kills,
    quest: world.quest.step,
    shards: p.shards.filter(Boolean).length,
    enemies: world.enemies.length,
    boss: !!world.boss,
    dialogue: !!world.dialogue,
    shop: world.shopOpen,
    won: world.won,
    over: world.over,
    paused,
  };
  if (frozen) window.__shotReady = true;
  // Debug handle for automated playtests (read-only use in tests).
  window.__world = world;

  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
setStatus('Lumenfall: title screen. Press Enter to begin.');
