// LUMENFALL — everything the eye sees. One job: draw the world, the
// entities, the HUD with its minimap, the dialogue and shop panels, and the
// title / victory / game-over screens. No rules live here; it only reads
// the world state and paints it.

import { CFG, ZONES, PALETTE, QUEST_STEPS, SHOP_ITEMS } from './config.js';
import { zoneAt } from './world.js';

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

// Deterministic speckle for a tile: same tile, same dots, every run.
function speckle(x, y, n) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s) < n;
}

function circle(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function text(ctx, str, x, y, size, color, align = 'left', font = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${font} ${size}px "Trebuchet MS", Verdana, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function panel(ctx, x, y, w, h, edge = PALETTE.panelEdge) {
  ctx.fillStyle = PALETTE.panel;
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
}

function drawGround(ctx, cam, w) {
  const tile = 80;
  const x0 = Math.max(0, Math.floor(cam.x / tile) * tile);
  const y0 = Math.max(0, Math.floor(cam.y / tile) * tile);
  const x1 = Math.min(CFG.worldW, cam.x + CFG.viewW + tile);
  const y1 = Math.min(CFG.worldH, cam.y + CFG.viewH + tile);
  for (let ty = y0; ty < y1; ty += tile) {
    for (let tx = x0; tx < x1; tx += tile) {
      const z = zoneAt(tx + tile / 2, ty + tile / 2);
      const alt = (Math.floor(tx / tile) + Math.floor(ty / tile)) % 2 === 0;
      ctx.fillStyle = alt ? z.ground : z.ground2;
      ctx.fillRect(tx, ty, tile, tile);
      // Speckles and grass tufts, deterministic per tile.
      if (speckle(tx, ty, 0.6)) {
        ctx.strokeStyle = z.dark ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.10)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tx + 18, ty + 30);
        ctx.lineTo(tx + 22, ty + 18);
        ctx.moveTo(tx + 30, ty + 34);
        ctx.lineTo(tx + 34, ty + 22);
        ctx.stroke();
      }
      if (speckle(tx + 7, ty + 3, 0.25)) {
        circle(ctx, tx + 55, ty + 55, 3, z.accent);
      }
    }
  }
  // Zone borders: a soft dotted line where biomes meet.
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 14]);
  ctx.beginPath();
  ctx.moveTo(1600, 0);
  ctx.lineTo(1600, 1200);
  ctx.moveTo(0, 1200);
  ctx.lineTo(3200, 1200);
  ctx.stroke();
  ctx.setLineDash([]);
  // Zone name labels, painted on the ground.
  ctx.globalAlpha = 0.28;
  text(ctx, 'EMBER MEADOW', 800, 150, 20, '#ffffff', 'center');
  text(ctx, 'GLOOMWOOD', 2400, 150, 20, '#cfc4ff', 'center');
  text(ctx, 'FROSTFALL RUINS', 1600, 1350, 20, '#dff2ff', 'center');
  ctx.globalAlpha = 1;
}

function drawPonds(ctx, w) {
  for (const p of w.ponds) {
    ctx.fillStyle = '#3d7ea6';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.ellipse(p.x - p.rx * 0.25, p.y - p.ry * 0.3, p.rx * 0.45, p.ry * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawObstacle(ctx, o, time) {
  if (o.kind === 'tree' || o.kind === 'pine') {
    // Trunk then a canopy that sways a hair.
    const sway = Math.sin(time * 1.2 + o.x * 0.01) * 2;
    ctx.fillStyle = '#5a3d22';
    ctx.fillRect(o.x - 4, o.y - 6, 8, 18);
    ctx.fillStyle = o.kind === 'tree' ? '#2f6b2f' : '#24405c';
    circle(ctx, o.x + sway, o.y - 14, o.r, o.kind === 'tree' ? '#2f6b2f' : '#24405c');
    circle(ctx, o.x - o.r * 0.4 + sway, o.y - 4, o.r * 0.62, o.kind === 'tree' ? '#3a7d3a' : '#2c4d6e');
    circle(ctx, o.x + o.r * 0.4 + sway, o.y - 4, o.r * 0.62, o.kind === 'tree' ? '#357235' : '#2c4d6e');
  } else if (o.kind === 'ruin') {
    ctx.fillStyle = '#5a6478';
    ctx.fillRect(o.x - o.r, o.y - o.r * 1.1, o.r * 2, o.r * 2.1);
    ctx.fillStyle = '#6d7889';
    ctx.fillRect(o.x - o.r, o.y - o.r * 1.1, o.r * 2, 8);
    ctx.fillStyle = '#8fd8ff';
    ctx.fillRect(o.x - 4, o.y - o.r * 0.6, 8, 12);
  } else {
    ctx.fillStyle = '#6b6f7a';
    circle(ctx, o.x, o.y, o.r, '#6b6f7a');
    ctx.fillStyle = '#828793';
    circle(ctx, o.x - o.r * 0.25, o.y - o.r * 0.25, o.r * 0.55, '#828793');
  }
}

function drawNpc(ctx, n, time, cam) {
  const bob = Math.sin(time * 2 + n.x) * 2;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(n.x, n.y + 14, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  circle(ctx, n.x, n.y + bob, 13, n.color);
  circle(ctx, n.x - 4, n.y - 3 + bob, 2.5, '#1c2436');
  circle(ctx, n.x + 4, n.y - 3 + bob, 2.5, '#1c2436');
  // The name tag hides when the NPC walks under the minimap.
  const underMap = cam && (n.x - cam.x > 1030) && (n.y - cam.y < 200);
  if (!underMap) {
    text(ctx, n.name, n.x, n.y - 26 + bob, 12, '#ffffff', 'center');
    text(ctx, 'E — talk', n.x, n.y + 28, 11, PALETTE.uiDim, 'center');
  }
}

function drawEnemy(ctx, e, time) {
  const def = e.def;
  const flash = e.flashT > 0;
  const body = flash ? '#ffffff' : def.color;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(e.x, e.y + def.radius * 0.8, def.radius, def.radius * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  if (e.type === 'mote') {
    circle(ctx, e.x, e.y, def.radius, body);
    circle(ctx, e.x - 5, e.y - 3, 3, '#1c2436');
    circle(ctx, e.x + 5, e.y - 3, 3, '#1c2436');
    ctx.fillStyle = '#1c2436';
    ctx.fillRect(e.x - 4, e.y + 4, 8, 2);
  } else if (e.type === 'wisp') {
    const wob = Math.sin(time * 5 + e.wobble) * 3;
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(e.x, e.y + wob, def.radius, Math.PI, 0);
    ctx.lineTo(e.x + def.radius, e.y + def.radius + wob);
    ctx.lineTo(e.x, e.y + def.radius * 0.6 + wob);
    ctx.lineTo(e.x - def.radius, e.y + def.radius + wob);
    ctx.closePath();
    ctx.fill();
    circle(ctx, e.x - 4, e.y - 2 + wob, 2.5, '#ffffff');
    circle(ctx, e.x + 4, e.y - 2 + wob, 2.5, '#ffffff');
  } else if (e.type === 'husk') {
    circle(ctx, e.x, e.y, def.radius, body);
    ctx.fillStyle = '#1c2436';
    ctx.fillRect(e.x - 7, e.y - 4, 4, 3);
    ctx.fillRect(e.x + 3, e.y - 4, 4, 3);
    ctx.fillRect(e.x - 3, e.y + 5, 6, 2);
    ctx.strokeStyle = '#8a6b3d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(e.x, e.y, def.radius + 4, -0.9, 0.9);
    ctx.stroke();
  } else if (e.type === 'golem') {
    ctx.fillStyle = body;
    ctx.fillRect(e.x - def.radius, e.y - def.radius, def.radius * 2, def.radius * 1.7);
    ctx.fillStyle = def.dark;
    ctx.fillRect(e.x - def.radius, e.y + def.radius * 0.4, def.radius * 2, 8);
    circle(ctx, e.x - 10, e.y - 8, 5, '#ffd75e');
    circle(ctx, e.x + 10, e.y - 8, 5, '#ffd75e');
    ctx.fillStyle = '#8fd8ff';
    ctx.fillRect(e.x - 4, e.y - 2, 8, 10);
  } else if (e.type === 'warden') {
    // Boss: horned silhouette, glowing core, crown of void flame.
    ctx.fillStyle = def.dark;
    ctx.beginPath();
    ctx.moveTo(e.x - 30, e.y - 20);
    ctx.lineTo(e.x - 44, e.y - 52);
    ctx.lineTo(e.x - 18, e.y - 34);
    ctx.moveTo(e.x + 30, e.y - 20);
    ctx.lineTo(e.x + 44, e.y - 52);
    ctx.lineTo(e.x + 18, e.y - 34);
    ctx.fill();
    circle(ctx, e.x, e.y, def.radius, body);
    circle(ctx, e.x, e.y, def.radius * 0.55, def.dark);
    circle(ctx, e.x - 14, e.y - 8, 5, '#ffffff');
    circle(ctx, e.x + 14, e.y - 8, 5, '#ffffff');
    circle(ctx, e.x, e.y + 6, 8, '#ff4d8d');
  }
  // HP bar for hurt enemies and bosses.
  if (e.hp < e.maxHp) {
    const bw = e.boss ? 90 : 36;
    const bx = e.x - bw / 2, by = e.y - def.radius - 14;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx - 1, by - 1, bw + 2, 7);
    ctx.fillStyle = e.boss ? '#e05cff' : '#ff5d73';
    ctx.fillRect(bx, by, bw * Math.max(0, e.hp / e.maxHp), 5);
  }
}

function drawPlayer(ctx, p, time) {
  const blink = p.hurtT > 0 && Math.floor(time * 14) % 2 === 0;
  if (blink) return; // hurt flicker
  const moving = p.moving;
  const bob = moving ? Math.sin(time * 12) * 2 : Math.sin(time * 2) * 1;
  // Lantern glow.
  const glow = ctx.createRadialGradient(p.x, p.y, 8, p.x, p.y, 110);
  glow.addColorStop(0, 'rgba(255, 233, 138, 0.30)');
  glow.addColorStop(1, 'rgba(255, 233, 138, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 110, 0, Math.PI * 2);
  ctx.fill();
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 14, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cloak and hood.
  ctx.fillStyle = '#3f6fb5';
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - 18 + bob);
  ctx.lineTo(p.x - 13, p.y + 12);
  ctx.lineTo(p.x + 13, p.y + 12);
  ctx.closePath();
  ctx.fill();
  circle(ctx, p.x, p.y - 8 + bob, 9, '#ffd9a0');
  circle(ctx, p.x - 3, p.y - 9 + bob, 1.8, '#1c2436');
  circle(ctx, p.x + 3, p.y - 9 + bob, 1.8, '#1c2436');
  // Lantern in hand.
  circle(ctx, p.x + Math.cos(p.face) * 16, p.y + Math.sin(p.face) * 16 + bob, 5, '#ffe98a');
  // Sword swing arc.
  if (p.swingT > 0) {
    const prog = 1 - p.swingT / 0.22;
    const a0 = p.face - CFG.swordArc / 2 + prog * CFG.swordArc;
    ctx.strokeStyle = 'rgba(255, 240, 180, 0.9)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, CFG.swordRange * 0.8, a0 - 0.5, a0 + 0.5);
    ctx.stroke();
  }
}

function drawForge(ctx, w, time) {
  const f = CFG.forge;
  const lit = w.forgeLit;
  // Stone ring.
  ctx.fillStyle = '#4d5468';
  circle(ctx, f.x, f.y, 46, '#4d5468');
  circle(ctx, f.x, f.y, 34, '#333a4d');
  // The flame: cold blue embers, or a roaring gold fire once lit.
  if (lit) {
    const fl = Math.sin(time * 9) * 6;
    const glow = ctx.createRadialGradient(f.x, f.y, 4, f.x, f.y, 120);
    glow.addColorStop(0, 'rgba(255, 200, 80, 0.55)');
    glow.addColorStop(1, 'rgba(255, 200, 80, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff9a3d';
    ctx.beginPath();
    ctx.moveTo(f.x - 16, f.y + 8);
    ctx.quadraticCurveTo(f.x - 10, f.y - 26 - fl, f.x, f.y - 34 - fl);
    ctx.quadraticCurveTo(f.x + 10, f.y - 26 - fl, f.x + 16, f.y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe98a';
    circle(ctx, f.x, f.y - 6, 9, '#ffe98a');
  } else {
    ctx.fillStyle = '#8fd8ff';
    circle(ctx, f.x - 8, f.y, 3, '#8fd8ff');
    circle(ctx, f.x + 8, f.y + 4, 3, '#8fd8ff');
    circle(ctx, f.x, f.y - 6, 3, '#8fd8ff');
  }
  text(ctx, 'STARFORGE', f.x, f.y - 62, 13, lit ? '#ffe98a' : '#bfe8ff', 'center');
}

function drawMinimap(ctx, w) {
  const mw = 208, mh = 156, mx = CFG.viewW - mw - 16, my = 16;
  panel(ctx, mx, my, mw, mh);
  const sx = mw / CFG.worldW, sy = mh / CFG.worldH;
  for (const z of ZONES) {
    ctx.fillStyle = z.ground;
    ctx.fillRect(mx + z.x * sx, my + z.y * sy, z.w * sx, z.h * sy);
  }
  // Forge and arena.
  ctx.fillStyle = '#ffe98a';
  ctx.fillRect(mx + CFG.forge.x * sx - 3, my + CFG.forge.y * sy - 3, 6, 6);
  // NPCs.
  for (const n of w.npcs) {
    ctx.fillStyle = n.color;
    ctx.beginPath();
    ctx.arc(mx + n.x * sx, my + n.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Objective star: the current quest's heart.
  const obj = objectivePoint(w);
  if (obj) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', mx + obj.x * sx, my + obj.y * sy);
  }
  // Boss.
  if (w.boss) {
    ctx.fillStyle = '#ff4d8d';
    ctx.beginPath();
    ctx.arc(mx + w.boss.x * sx, my + w.boss.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Player arrow.
  const p = w.player;
  ctx.fillStyle = '#ffffff';
  ctx.save();
  ctx.translate(mx + p.x * sx, my + p.y * sy);
  ctx.rotate(p.face);
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -4);
  ctx.lineTo(-5, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  text(ctx, 'LUMENFALL', mx + mw / 2, my + mh + 12, 10, PALETTE.uiDim, 'center');
}

function objectivePoint(w) {
  const step = w.quest.step;
  if (step === 0) return { x: 470, y: 470 };
  if (step === 1) return { x: 2680, y: 620 };
  if (step === 2) return { x: 2400, y: 1850 };
  if (step === 3) return { x: CFG.forge.x, y: CFG.forge.y };
  if (step === 4) return { x: CFG.forge.x, y: CFG.forge.y };
  return null;
}

function drawHud(ctx, w) {
  const p = w.player;
  // Hearts: one heart per 20 HP.
  for (let i = 0; i < Math.ceil(p.maxHp / 20); i++) {
    const x = 24 + i * 30, y = 28;
    const fill = clamp((p.hp - i * 20) / 20, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fill();
    if (fill > 0) {
      ctx.fillStyle = PALETTE.heart;
      ctx.beginPath();
      ctx.arc(x, y, 11 * fill, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.stroke();
  }
  // XP bar + level.
  panel(ctx, 16, 48, 190, 16);
  ctx.fillStyle = PALETTE.xp;
  ctx.fillRect(18, 50, 186 * clamp(p.xp / p.xpNext, 0, 1), 12);
  text(ctx, `Lv ${p.level}`, 214, 56, 13, PALETTE.ui);
  // Gold, potions, shards.
  text(ctx, `◆ ${p.gold} gold`, 20, 82, 15, PALETTE.gold);
  text(ctx, `🧪 ${p.potions}`, 130, 82, 15, '#ff9ecb');
  const shardX = 20;
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = p.shards[i] ? '#ffe98a' : 'rgba(255,255,255,0.22)';
    ctx.save();
    ctx.translate(shardX + i * 26, 104);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-7, -7, 14, 14);
    ctx.restore();
  }
  text(ctx, 'Sky Shards', 100, 104, 12, PALETTE.uiDim);
  // Quest tracker.
  const step = QUEST_STEPS[w.quest.step];
  panel(ctx, 16, 122, 300, 56);
  text(ctx, 'QUEST', 28, 138, 11, PALETTE.gold);
  text(ctx, step.title, 28, 156, 14, PALETTE.ui);
  text(ctx, step.hint, 28, 172, 11, PALETTE.uiDim);
  if (w.quest.petals > 0 && w.quest.petals < 5) {
    text(ctx, `Moonpetals ${w.quest.petals}/5`, 28, 190, 11, '#c9a7ff');
  }
  // Boss bar.
  if (w.bossActive && w.boss) {
    const bw = 420, bx = (CFG.viewW - bw) / 2, by = CFG.viewH - 46;
    text(ctx, 'VOID WARDEN', CFG.viewW / 2, by - 14, 15, '#e05cff', 'center');
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx - 2, by - 2, bw + 4, 16);
    ctx.fillStyle = '#e05cff';
    ctx.fillRect(bx, by, bw * Math.max(0, w.boss.hp / w.boss.maxHp), 12);
  }
  // Toast.
  if (w.toast) {
    ctx.globalAlpha = clamp(w.toast.t, 0, 1);
    panel(ctx, CFG.viewW / 2 - 260, 16, 520, 30);
    text(ctx, w.toast.text, CFG.viewW / 2, 31, 13, PALETTE.ui, 'center');
    ctx.globalAlpha = 1;
  }
  // Controls reminder, faint.
  text(ctx, 'WASD move · Click sword · Space dash · E interact · 1 potion · P pause', CFG.viewW / 2, CFG.viewH - 12, 11, 'rgba(245,233,200,0.55)', 'center');
}

function drawDialogue(ctx, w) {
  const d = w.dialogue;
  if (!d) return;
  panel(ctx, 140, CFG.viewH - 190, CFG.viewW - 280, 130);
  text(ctx, d.npc.name, 164, CFG.viewH - 166, 15, d.npc.color);
  const line = d.lines[d.idx];
  wrapText(ctx, line, 164, CFG.viewH - 138, CFG.viewW - 328, 15, PALETTE.ui);
  text(ctx, 'E / click — continue', CFG.viewW - 164, CFG.viewH - 78, 12, PALETTE.uiDim, 'right');
}

function wrapText(ctx, str, x, y, maxW, size, color) {
  ctx.fillStyle = color;
  ctx.font = `15px "Trebuchet MS", Verdana, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const words = str.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += 20;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

function drawShop(ctx, w) {
  panel(ctx, CFG.viewW / 2 - 260, 110, 520, 420);
  text(ctx, 'MERCHANT BRIN’S WARES', CFG.viewW / 2, 140, 18, PALETTE.gold, 'center');
  text(ctx, `Your gold: ◆ ${w.player.gold}`, CFG.viewW / 2, 166, 14, PALETTE.ui, 'center');
  SHOP_ITEMS.forEach((item, i) => {
    const y = 196 + i * 56;
    const owned = item.once && (
      (item.id === 'blade' && w.player.swordBonus > 0) ||
      (item.id === 'boots' && w.player.speedBonus > 0) ||
      (item.id === 'charm' && w.player.maxHp > CFG.baseMaxHp) ||
      (item.id === 'bow' && w.player.hasBow));
    ctx.fillStyle = owned ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)';
    ctx.fillRect(CFG.viewW / 2 - 240, y, 480, 48);
    text(ctx, `${i + 1}. ${item.name}`, CFG.viewW / 2 - 228, y + 14, 15, owned ? PALETTE.uiDim : PALETTE.ui);
    text(ctx, item.desc, CFG.viewW / 2 - 228, y + 34, 12, PALETTE.uiDim);
    text(ctx, owned ? 'OWNED' : `◆ ${item.price}`, CFG.viewW / 2 + 228, y + 24, 14, owned ? PALETTE.uiDim : PALETTE.gold, 'right');
  });
  text(ctx, 'Click an item or press 1–5 to buy · E / Esc to leave', CFG.viewW / 2, 500, 12, PALETTE.uiDim, 'center');
}

function drawTitle(ctx, w, best, saveExists) {
  // Sky gradient + stars + a big lantern moon.
  const g = ctx.createLinearGradient(0, 0, 0, CFG.viewH);
  g.addColorStop(0, '#1b2450');
  g.addColorStop(0.55, '#3a2a5e');
  g.addColorStop(1, '#0b0e1a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CFG.viewW, CFG.viewH);
  for (let i = 0; i < 90; i++) {
    const x = (i * 137.5) % CFG.viewW, y = (i * 89.3) % 420;
    ctx.fillStyle = `rgba(255,255,255,${0.25 + ((i * 7) % 10) / 18})`;
    ctx.fillRect(x, y, 2, 2);
  }
  const moon = ctx.createRadialGradient(1020, 130, 10, 1020, 130, 130);
  moon.addColorStop(0, 'rgba(255, 233, 138, 0.9)');
  moon.addColorStop(1, 'rgba(255, 233, 138, 0)');
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(1020, 130, 130, 0, Math.PI * 2);
  ctx.fill();
  circle(ctx, 1020, 130, 42, '#ffe98a');
  // Ground silhouette.
  ctx.fillStyle = '#1d2b1d';
  ctx.beginPath();
  ctx.moveTo(0, CFG.viewH);
  ctx.lineTo(0, 560);
  for (let x = 0; x <= CFG.viewW; x += 80) ctx.lineTo(x, 560 + Math.sin(x * 0.01) * 18);
  ctx.lineTo(CFG.viewW, CFG.viewH);
  ctx.closePath();
  ctx.fill();

  text(ctx, 'LUMENFALL', CFG.viewW / 2, 210, 84, '#ffe98a', 'center');
  text(ctx, '— The Last Starforge —', CFG.viewW / 2, 268, 24, PALETTE.ui, 'center');
  const lines = [
    'Three winters ago the Starforge went dark, and the void crept into Lumenfall.',
    'You are Wren, last lantern-warden. Find the three Sky Shards. Relight the forge.',
  ];
  lines.forEach((l, i) => text(ctx, l, CFG.viewW / 2, 320 + i * 26, 16, PALETTE.uiDim, 'center'));
  text(ctx, 'WASD move · Mouse aim · Click sword · Space dash · E talk / open · 1 potion · P pause', CFG.viewW / 2, 420, 14, PALETTE.ui, 'center');
  const pulse = 0.6 + Math.sin(w.time * 3) * 0.4;
  ctx.globalAlpha = pulse;
  text(ctx, 'Press ENTER or CLICK to begin', CFG.viewW / 2, 480, 20, '#ffffff', 'center');
  ctx.globalAlpha = 1;
  if (saveExists) text(ctx, 'Press C to continue your journey', CFG.viewW / 2, 514, 15, '#7fe0a8', 'center');
  if (best) {
    text(ctx, `Best: ${best.score} points · ${best.kills} foes · Lv ${best.level}${best.won ? ' · FORGE LIT' : ''}`, CFG.viewW / 2, 560, 14, PALETTE.gold, 'center');
  }
  text(ctx, 'An original game · no network · sound on (M to mute)', CFG.viewW / 2, CFG.viewH - 24, 12, 'rgba(245,233,200,0.5)', 'center');
}

function drawEndScreen(ctx, w, won, best) {
  ctx.fillStyle = won ? 'rgba(20, 30, 10, 0.82)' : 'rgba(20, 8, 16, 0.85)';
  ctx.fillRect(0, 0, CFG.viewW, CFG.viewH);
  // A few stars and a soft glow behind the headline, so the screen is not
  // a flat dark field.
  for (let i = 0; i < 70; i++) {
    const x = (i * 173.3) % CFG.viewW, y = (i * 97.7) % CFG.viewH;
    ctx.fillStyle = `rgba(255, 240, 200, ${0.15 + ((i * 7) % 10) / 30})`;
    ctx.fillRect(x, y, 2, 2);
  }
  const glow = ctx.createRadialGradient(CFG.viewW / 2, 200, 10, CFG.viewW / 2, 200, 420);
  glow.addColorStop(0, won ? 'rgba(255, 210, 90, 0.16)' : 'rgba(255, 93, 115, 0.12)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CFG.viewW, CFG.viewH);
  const p = w.player;
  if (won) {
    text(ctx, 'THE FORGE BURNS BRIGHT', CFG.viewW / 2, 200, 52, '#ffe98a', 'center');
    text(ctx, 'Lumenfall wakes. The void retreats. Wren, the light is yours.', CFG.viewW / 2, 262, 18, PALETTE.ui, 'center');
  } else {
    text(ctx, 'THE LIGHT FADES', CFG.viewW / 2, 200, 52, '#ff5d73', 'center');
    text(ctx, 'The lantern falls… but a warden always rises again.', CFG.viewW / 2, 262, 18, PALETTE.ui, 'center');
  }
  const score = w.stats.kills * 10 + w.stats.goldEarned + p.shards.filter(Boolean).length * 500 + p.level * 50 + (won ? 1000 : 0);
  const rows = [
    ['Score', String(score)],
    ['Foes felled', String(w.stats.kills)],
    ['Gold gathered', `◆ ${w.stats.goldEarned}`],
    ['Level reached', String(p.level)],
    ['Sky Shards', `${p.shards.filter(Boolean).length} / 3`],
    ['Time', `${Math.floor(w.stats.playTime / 60)}:${String(Math.floor(w.stats.playTime % 60)).padStart(2, '0')}`],
  ];
  rows.forEach(([k, v], i) => {
    text(ctx, k, CFG.viewW / 2 - 130, 320 + i * 30, 16, PALETTE.uiDim);
    text(ctx, v, CFG.viewW / 2 + 130, 320 + i * 30, 16, PALETTE.ui, 'right');
  });
  if (best) text(ctx, `Best: ${best.score} points`, CFG.viewW / 2, 520, 14, PALETTE.gold, 'center');
  const pulse = 0.6 + Math.sin(w.time * 3) * 0.4;
  ctx.globalAlpha = pulse;
  text(ctx, 'Press ENTER or CLICK to play again', CFG.viewW / 2, 566, 20, '#ffffff', 'center');
  ctx.globalAlpha = 1;
}

export function render(ctx, w, cam, screen, opts) {
  const { paused = false, best = null, saveExists = false } = opts || {};
  ctx.save();
  // Camera shake.
  if (w.shake > 0) {
    ctx.translate((Math.random() - 0.5) * w.shake, (Math.random() - 0.5) * w.shake);
  }
  if (screen === 'title') {
    drawTitle(ctx, w, best, saveExists);
    ctx.restore();
    return;
  }
  if (screen === 'victory') {
    drawEndScreen(ctx, w, true, best);
    ctx.restore();
    return;
  }
  if (screen === 'over') {
    drawEndScreen(ctx, w, false, best);
    ctx.restore();
    return;
  }

  // Play (and its overlays): the world, seen through the camera.
  ctx.save();
  ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
  drawGround(ctx, cam, w);
  drawPonds(ctx, w);
  // Chests, satchel, petals.
  for (const c of w.chests) {
    ctx.fillStyle = c.opened ? '#6b5a2e' : '#8a6b3d';
    ctx.fillRect(c.x - 16, c.y - 12, 32, 22);
    ctx.fillStyle = c.opened ? '#4d421f' : '#ffd75e';
    ctx.fillRect(c.x - 3, c.y - 12, 6, 8);
    if (!c.opened) text(ctx, 'E — open', c.x, c.y - 26, 11, PALETTE.uiDim, 'center');
  }
  if (!w.satchel.taken) {
    ctx.fillStyle = '#a8763e';
    ctx.fillRect(w.satchel.x - 10, w.satchel.y - 8, 20, 16);
    ctx.fillStyle = '#ffd75e';
    circle(ctx, w.satchel.x, w.satchel.y - 14, 4, '#ffd75e');
  }
  for (const pt of w.petals) {
    if (pt.taken) continue;
    const glow = Math.sin(w.time * 4 + pt.x) * 0.3 + 0.7;
    ctx.globalAlpha = glow;
    circle(ctx, pt.x, pt.y, 7, '#c9a7ff');
    circle(ctx, pt.x, pt.y, 3, '#ffffff');
    ctx.globalAlpha = 1;
  }
  drawForge(ctx, w, w.time);
  // Obstacles, sorted with entities by y for a little depth.
  const drawables = [];
  for (const o of w.obstacles) drawables.push({ y: o.y, draw: () => drawObstacle(ctx, o, w.time) });
  for (const n of w.npcs) drawables.push({ y: n.y, draw: () => drawNpc(ctx, n, w.time, cam) });
  for (const pk of w.pickups) {
    drawables.push({
      y: pk.y,
      draw: () => {
        const bob = Math.sin(pk.t * 5) * 3;
        if (pk.kind === 'heart') {
          circle(ctx, pk.x, pk.y + bob, 9, PALETTE.heart);
          circle(ctx, pk.x - 3, pk.y - 2 + bob, 2, '#ffffff');
        } else {
          circle(ctx, pk.x, pk.y + bob, 7, PALETTE.gold);
          text(ctx, 'g', pk.x, pk.y + bob, 11, '#7a5a00', 'center');
        }
      },
    });
  }
  for (const e of w.enemies) drawables.push({ y: e.y, draw: () => drawEnemy(ctx, e, w.time) });
  drawables.push({ y: w.player.y, draw: () => drawPlayer(ctx, w.player, w.time) });
  drawables.sort((a, b) => a.y - b.y);
  for (const d of drawables) d.draw();
  // Projectiles.
  for (const pr of w.projectiles) {
    circle(ctx, pr.x, pr.y, pr.r, pr.kind === 'orb' ? '#e05cff' : '#ffe98a');
    if (pr.kind === 'orb') circle(ctx, pr.x, pr.y, pr.r * 0.5, '#ffffff');
  }
  // Particles.
  for (const pt of w.particles) {
    ctx.globalAlpha = clamp(pt.life / pt.maxLife, 0, 1);
    circle(ctx, pt.x, pt.y, pt.size, pt.color);
  }
  ctx.globalAlpha = 1;
  // Floating text.
  for (const f of w.floaters) {
    ctx.globalAlpha = clamp(f.life, 0, 1);
    text(ctx, f.text, f.x, f.y, 14, f.color, 'center');
  }
  ctx.globalAlpha = 1;
  // Fireflies at night.
  const night = nightFactor(w);
  if (night > 0.15) {
    for (const f of w.fireflies) {
      const a = 0.25 + 0.55 * Math.abs(Math.sin(w.time * 0.8 + f.phase));
      ctx.globalAlpha = a * night;
      circle(ctx, f.x, f.y, 2.5, '#d8ff9a');
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // Night tint over the whole view.
  if (night > 0.02) {
    ctx.fillStyle = `rgba(8, 10, 38, ${(night * 0.42).toFixed(3)})`;
    ctx.fillRect(0, 0, CFG.viewW, CFG.viewH);
  }

  drawHud(ctx, w);
  drawMinimap(ctx, w);
  if (w.dialogue) drawDialogue(ctx, w);
  if (w.shopOpen) drawShop(ctx, w);
  if (paused) {
    ctx.fillStyle = 'rgba(5, 8, 20, 0.6)';
    ctx.fillRect(0, 0, CFG.viewW, CFG.viewH);
    text(ctx, 'PAUSED', CFG.viewW / 2, CFG.viewH / 2 - 20, 44, PALETTE.ui, 'center');
    text(ctx, 'WASD move · Click sword · Space dash · E interact · 1 potion · P resume · M mute', CFG.viewW / 2, CFG.viewH / 2 + 30, 14, PALETTE.uiDim, 'center');
  }
  ctx.restore();
}

export function nightFactor(w) {
  // 0 by day, 1 at deep night. dayT runs 0..1 across CFG.dayLength seconds.
  const t = w.dayT;
  if (t < 0.5) return 0;
  return Math.sin((t - 0.5) * Math.PI);
}
