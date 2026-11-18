// LUMENFALL — the world and its rules. One job: everything that is true
// about a run (terrain, NPCs, enemies, quests, combat, shop, save) and every
// rule that changes it. Rendering lives in render.js, screens in main.js.

import { CFG, ZONES, ENEMY_DEFS, QUEST_STEPS, SHOP_ITEMS, DIALOGUE } from './config.js';
import { makeRng } from './random.js';

export function zoneAt(x, y) {
  for (const z of ZONES) {
    if (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) return z;
  }
  return ZONES[0];
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function createWorld(seed) {
  const rng = makeRng(seed);
  const w = {
    seed,
    rng,
    time: 0,
    dayT: 0.08, // morning
    player: {
      x: 420, y: 560, hp: CFG.baseMaxHp, maxHp: CFG.baseMaxHp,
      level: 1, xp: 0, xpNext: CFG.xpBase,
      gold: 0, shards: [false, false, false],
      swordBonus: 0, speedBonus: 0, hasBow: false, potions: 1,
      face: -Math.PI / 2, swingT: 0, swingCd: 0, dashT: 0, dashCd: 0,
      bowCd: 0, hurtT: 0, dead: false, moving: false,
    },
    enemies: [],
    projectiles: [],
    pickups: [],
    particles: [],
    floaters: [],
    npcs: [
      { id: 'elder', name: 'Elder Maren', x: 470, y: 470, color: '#e8d8a0', role: 'elder' },
      { id: 'merchant', name: 'Merchant Brin', x: 640, y: 620, color: '#7fd8a8', role: 'merchant' },
      { id: 'wanderer', name: 'Wanderer', x: 1560, y: 300, color: '#b78cff', role: 'wanderer' },
    ],
    chests: [{ x: 2680, y: 620, opened: false, shard: 0 }],
    obstacles: [],
    ponds: [
      { x: 1050, y: 880, rx: 150, ry: 95 },
      { x: 2300, y: 950, rx: 180, ry: 110 },
      { x: 700, y: 1900, rx: 200, ry: 120 },
    ],
    petals: [],
    satchel: { x: 1150, y: 1750, taken: false, returned: false },
    golem: null,
    boss: null,
    bossActive: false,
    forgeLit: false,
    won: false,
    over: false,
    quest: { step: 0, petals: 0 },
    dialogue: null,
    shopOpen: false,
    toast: null,
    stats: { kills: 0, goldEarned: 0, damageDealt: 0, playTime: 0 },
    shake: 0,
    spawnT: 2,
    fireflies: [],
  };

  // Scatter props: trees, pines, ruins, rocks — never on the spawn clearing,
  // the NPCs, the arena or the forge.
  const clear = (x, y) => {
    if (dist(x, y, 420, 560) < 220) return false;
    if (dist(x, y, CFG.forge.x, CFG.forge.y) < 260) return false;
    for (const n of w.npcs) if (dist(x, y, n.x, n.y) < 90) return false;
    if (x > CFG.arena.x - 60 && x < CFG.arena.x + CFG.arena.w + 60 && y > CFG.arena.y - 60 && y < CFG.arena.y + CFG.arena.h + 60) return false;
    for (const p of w.ponds) {
      const dx = (x - p.x) / p.rx, dy = (y - p.y) / p.ry;
      if (dx * dx + dy * dy < 1.3) return false;
    }
    return true;
  };
  for (let i = 0; i < 420; i++) {
    const x = rng.range(40, CFG.worldW - 40);
    const y = rng.range(40, CFG.worldH - 40);
    if (!clear(x, y)) continue;
    const z = zoneAt(x, y);
    const kind = z.prop === 'tree' ? (rng.chance(0.75) ? 'tree' : 'rock')
      : z.prop === 'pine' ? (rng.chance(0.8) ? 'pine' : 'rock')
      : (rng.chance(0.55) ? 'ruin' : 'rock');
    w.obstacles.push({ x, y, r: kind === 'ruin' ? rng.range(26, 40) : rng.range(16, 26), kind });
  }

  // Moonpetals: five, spread across the meadow and gloomwood.
  const petalSpots = [[900, 300], [1300, 1000], [1900, 250], [2400, 700], [1500, 1050]];
  for (const [x, y] of petalSpots) w.petals.push({ x, y, taken: false });

  // Fireflies for the night.
  for (let i = 0; i < 40; i++) {
    w.fireflies.push({ x: rng.range(0, CFG.worldW), y: rng.range(0, CFG.worldH), phase: rng.range(0, Math.PI * 2) });
  }

  // The Ruin Golem waits in Frostfall, guarding the second shard.
  w.golem = spawnEnemy(w, 'golem', 2400, 1850);
  // Opening cast, kept away from the spawn clearing.
  spawnEnemy(w, 'mote', 800, 300);
  spawnEnemy(w, 'mote', 1100, 700);
  spawnEnemy(w, 'wisp', 1900, 400);
  spawnEnemy(w, 'husk', 900, 1600);
  spawnEnemy(w, 'mote', 1500, 2000);
  return w;
}

export function spawnEnemy(w, type, x, y) {
  const def = ENEMY_DEFS[type];
  const e = {
    type, def, name: def.name,
    x, y, hp: def.hp, maxHp: def.hp,
    vx: 0, vy: 0, t: w.rng.range(0, 10), shootCd: w.rng.range(1, 2.5),
    burstT: 3, summonT: 8, chargeT: 6, mode: 'chase', modeT: 0,
    flashT: 0, dead: false, wobble: w.rng.range(0, Math.PI * 2),
    miniBoss: !!def.miniBoss, boss: !!def.boss,
  };
  w.enemies.push(e);
  return e;
}

export function spawnBoss(w) {
  if (w.boss) return w.boss;
  w.boss = spawnEnemy(w, 'warden', CFG.forge.x, CFG.forge.y - 120);
  w.bossActive = true;
  return w.boss;
}

function burst(w, x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + w.rng.range(-0.2, 0.2);
    w.particles.push({
      x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      life: 0.5, maxLife: 0.5, color, size: w.rng.range(2, 5),
    });
  }
}

function floater(w, x, y, text, color) {
  w.floaters.push({ x, y, text, color, life: 1 });
}

export function toast(w, text) {
  w.toast = { text, t: 3.2 };
}

function dropPickup(w, x, y, kind, value) {
  w.pickups.push({ kind, x: x + w.rng.range(-14, 14), y: y + w.rng.range(-14, 14), value, t: w.rng.range(0, 6) });
}

function grantShard(w, idx, audio) {
  w.player.shards[idx] = true;
  audio.sfx('shard');
  burst(w, w.player.x, w.player.y, '#ffe98a', 26, 190);
  if (idx === 0) {
    w.quest.step = 2;
    toast(w, 'Sky Shard found! (1 of 3) — the Ruin Golem guards the next.');
  } else if (idx === 1) {
    w.quest.step = 3;
    toast(w, 'Sky Shard found! (2 of 3) — the Void Warden holds the last.');
  } else {
    w.quest.step = 4;
    toast(w, 'Sky Shard found! (3 of 3) — relight the Starforge! (E)');
  }
  saveGame(w);
}

export function addXp(w, n, audio) {
  const p = w.player;
  p.xp += n;
  while (p.xp >= p.xpNext && p.level < CFG.maxLevel) {
    p.xp -= p.xpNext;
    p.level += 1;
    p.xpNext = CFG.xpBase + p.level * CFG.xpPerLevel;
    p.maxHp += 10;
    p.hp = Math.min(p.maxHp, p.hp + 25);
    audio.sfx('level');
    floater(w, p.x, p.y - 30, 'LEVEL UP!', '#7fe0a8');
    burst(w, p.x, p.y, '#7fe0a8', 18, 150);
  }
}

function damageEnemy(w, e, dmg, dirx, diry, audio) {
  if (e.dead) return;
  e.hp -= dmg;
  e.flashT = 0.12;
  w.stats.damageDealt += dmg;
  floater(w, e.x, e.y - e.def.radius - 6, String(Math.round(dmg)), '#ffe98a');
  burst(w, e.x, e.y, e.def.color, 6, 120);
  if (e.type !== 'golem' && !e.boss) {
    e.x += dirx * 14;
    e.y += diry * 14;
  }
  if (e.hp <= 0) killEnemy(w, e, audio);
  else audio.sfx('hit');
}

function killEnemy(w, e, audio) {
  e.dead = true;
  const p = w.player;
  w.stats.kills += 1;
  audio.sfx('kill');
  burst(w, e.x, e.y, e.def.color, 22, 200);
  burst(w, e.x, e.y, '#ffffff', 8, 120);
  addXp(w, e.def.xp, audio);
  const gold = e.def.gold + w.rng.int(0, 4);
  p.gold += gold;
  w.stats.goldEarned += gold;
  floater(w, e.x, e.y - 24, `+${gold}g`, '#ffd75e');
  if (w.rng.chance(0.3)) dropPickup(w, e.x, e.y, 'heart', 20);
  if (w.rng.chance(0.25)) dropPickup(w, e.x, e.y, 'gold', 8);
  if (e.miniBoss) {
    grantShard(w, 1, audio);
    toast(w, 'The Ruin Golem breaks — its Sky Shard is yours.');
  }
  if (e.boss) {
    w.bossActive = false;
    w.boss = null;
    grantShard(w, 2, audio);
    dropPickup(w, e.x, e.y, 'heart', 40);
    dropPickup(w, e.x + 30, e.y, 'gold', 40);
  }
}

export function damagePlayer(w, dmg, audio) {
  const p = w.player;
  if (p.dead || p.dashT > 0 || p.hurtT > 0) return;
  p.hp -= dmg;
  p.hurtT = 0.6;
  w.shake = 9;
  audio.sfx('hurt');
  burst(w, p.x, p.y, '#ff5d73', 10, 140);
  if (p.hp <= 0) {
    p.hp = 0;
    p.dead = true;
    w.over = true;
    audio.sfx('over');
    audio.stopMusic();
    saveBest(w);
  }
}

function collideCircle(w, e, r) {
  // World bounds.
  e.x = Math.max(r, Math.min(CFG.worldW - r, e.x));
  e.y = Math.max(r, Math.min(CFG.worldH - r, e.y));
  // Obstacles.
  for (const o of w.obstacles) {
    const dx = e.x - o.x, dy = e.y - o.y;
    const d = Math.hypot(dx, dy);
    const min = r + o.r * 0.8;
    if (d > 0.01 && d < min) {
      e.x = o.x + (dx / d) * min;
      e.y = o.y + (dy / d) * min;
    }
  }
  // Ponds block walking (approximated as circles).
  for (const p of w.ponds) {
    const dx = (e.x - p.x) / p.rx, dy = (e.y - p.y) / p.ry;
    const d = dx * dx + dy * dy;
    if (d < 1) {
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      e.x = p.x + Math.cos(a) * (p.rx + r);
      e.y = p.y + Math.sin(a) * (p.ry + r);
    }
  }
}

function swordSwing(w, audio) {
  const p = w.player;
  if (p.swingCd > 0) return;
  p.swingCd = CFG.swordCooldown;
  p.swingT = 0.22;
  audio.sfx('swing');
  const dmg = CFG.baseDamage + p.swordBonus;
  for (const e of w.enemies) {
    if (e.dead) continue;
    const d = dist(p.x, p.y, e.x, e.y);
    if (d > CFG.swordRange + e.def.radius) continue;
    const a = angleTo(p.x, p.y, e.x, e.y);
    if (Math.abs(angleDiff(a, p.face)) > CFG.swordArc / 2 + 0.3) continue;
    damageEnemy(w, e, dmg, Math.cos(a), Math.sin(a), audio);
  }
}

function shootBow(w, audio) {
  const p = w.player;
  if (!p.hasBow || p.bowCd > 0) return;
  p.bowCd = CFG.bowCooldown;
  audio.sfx('shoot');
  w.projectiles.push({
    x: p.x + Math.cos(p.face) * 22, y: p.y + Math.sin(p.face) * 22,
    vx: Math.cos(p.face) * CFG.arrowSpeed, vy: Math.sin(p.face) * CFG.arrowSpeed,
    friendly: true, dmg: CFG.bowDamage + p.swordBonus * 0.5, r: 5, life: 1.1, kind: 'arrow',
  });
}

export function usePotion(w, audio) {
  const p = w.player;
  if (p.potions <= 0 || p.hp >= p.maxHp || p.dead) {
    audio.sfx('deny');
    return;
  }
  p.potions -= 1;
  p.hp = Math.min(p.maxHp, p.hp + CFG.potionHeal);
  audio.sfx('potion');
  floater(w, p.x, p.y - 30, `+${CFG.potionHeal} HP`, '#7fe0a8');
  burst(w, p.x, p.y, '#7fe0a8', 12, 110);
}

export function buyItem(w, itemId, audio) {
  const item = SHOP_ITEMS.find((i) => i.id === itemId);
  const p = w.player;
  if (!item) return;
  if (item.once && ((item.id === 'blade' && p.swordBonus > 0) || (item.id === 'boots' && p.speedBonus > 0) || (item.id === 'charm' && p.maxHp > CFG.baseMaxHp) || (item.id === 'bow' && p.hasBow))) {
    audio.sfx('deny');
    return;
  }
  if (p.gold < item.price) {
    audio.sfx('deny');
    toast(w, 'Not enough gold.');
    return;
  }
  p.gold -= item.price;
  if (item.id === 'potion') p.potions += 1;
  if (item.id === 'blade') p.swordBonus += 8;
  if (item.id === 'boots') p.speedBonus += 0.25;
  if (item.id === 'charm') {
    p.maxHp += 40;
    p.hp = Math.min(p.maxHp, p.hp + 40);
  }
  if (item.id === 'bow') p.hasBow = true;
  audio.sfx('buy');
  floater(w, p.x, p.y - 30, item.name + '!', '#ffd75e');
}

function openDialogue(w, npc, lines) {
  // fresh: the opening keypress must not also advance the first line.
  w.dialogue = { npc, lines, idx: 0, fresh: true };
}

export function tryInteract(w, audio) {
  const p = w.player;
  // NPCs first.
  for (const n of w.npcs) {
    if (dist(p.x, p.y, n.x, n.y) < CFG.interactRange + 14) {
      if (n.id === 'elder') {
        if (w.quest.step === 0) {
          openDialogue(w, n, DIALOGUE.elder);
          w.quest.step = 1;
        } else if (w.player.shards.every(Boolean)) {
          openDialogue(w, n, DIALOGUE.elderDone);
        } else {
          openDialogue(w, n, DIALOGUE.elderMid);
        }
      } else if (n.id === 'merchant') {
        if (w.satchel.taken && !w.satchel.returned) {
          openDialogue(w, n, DIALOGUE.merchantSatchel);
          w.satchel.returned = true;
          p.gold += 80;
          w.stats.goldEarned += 80;
          if (w.quest.step < 1) w.quest.step = 1;
        } else {
          w.shopOpen = true;
          // shopFresh: the opening keypress must not also close it.
          w.shopFresh = true;
        }
      } else {
        openDialogue(w, n, DIALOGUE.wanderer);
      }
      return;
    }
  }
  // The Starforge.
  if (dist(p.x, p.y, CFG.forge.x, CFG.forge.y) < 110) {
    if (p.shards.every(Boolean) && !w.forgeLit) {
      w.forgeLit = true;
      w.won = true;
      audio.sfx('victory');
      audio.stopMusic();
      burst(w, CFG.forge.x, CFG.forge.y, '#ffe98a', 60, 260);
      saveBest(w);
      saveGame(w);
    } else if (!p.shards.every(Boolean)) {
      toast(w, 'The forge is cold. It needs all three Sky Shards.');
      audio.sfx('deny');
    }
    return;
  }
  // Chests.
  for (const c of w.chests) {
    if (!c.opened && dist(p.x, p.y, c.x, c.y) < CFG.interactRange) {
      c.opened = true;
      audio.sfx('chest');
      burst(w, c.x, c.y, '#ffd75e', 16, 150);
      if (c.shard === 0) grantShard(w, 0, audio);
      else {
        p.gold += 40;
        floater(w, c.x, c.y - 20, '+40g', '#ffd75e');
      }
      return;
    }
  }
  // The lost satchel.
  if (!w.satchel.taken && dist(p.x, p.y, w.satchel.x, w.satchel.y) < CFG.interactRange) {
    w.satchel.taken = true;
    audio.sfx('quest');
    toast(w, 'Found Merchant Brin’s satchel! Return it for a reward.');
    return;
  }
}

function updatePlayer(w, input, dt, audio) {
  const p = w.player;
  if (p.dead) return;
  const mx = (input.isDown('KeyD', 'ArrowRight') ? 1 : 0) - (input.isDown('KeyA', 'ArrowLeft') ? 1 : 0);
  const my = (input.isDown('KeyS', 'ArrowDown') ? 1 : 0) - (input.isDown('KeyW', 'ArrowUp') ? 1 : 0);
  const len = Math.hypot(mx, my) || 1;
  const speed = CFG.baseSpeed * (1 + p.speedBonus);
  p.moving = mx !== 0 || my !== 0;
  if (p.dashT > 0) {
    p.dashT -= dt;
    p.x += Math.cos(p.dashDir) * CFG.dashSpeed * dt;
    p.y += Math.sin(p.dashDir) * CFG.dashSpeed * dt;
    if (w.rng.chance(0.6)) {
      w.particles.push({ x: p.x, y: p.y, vx: w.rng.range(-30, 30), vy: w.rng.range(-30, 30), life: 0.3, maxLife: 0.3, color: '#bfe8ff', size: 4 });
    }
  } else {
    p.x += (mx / len) * speed * dt;
    p.y += (my / len) * speed * dt;
  }
  if (p.dashCd > 0) p.dashCd -= dt;
  if (p.swingCd > 0) p.swingCd -= dt;
  if (p.swingT > 0) p.swingT -= dt;
  if (p.bowCd > 0) p.bowCd -= dt;
  if (p.hurtT > 0) p.hurtT -= dt;

  // Aim follows the mouse (screen coords are translated by the caller).
  if (input.aimX !== undefined) {
    p.face = Math.atan2(input.aimY - p.y, input.aimX - p.x);
  } else if (p.moving) {
    p.face = Math.atan2(my, mx);
  }

  // Dash.
  if (input.wasPressed('Space', 'ShiftLeft', 'ShiftRight') && p.dashCd <= 0 && p.dashT <= 0) {
    p.dashCd = CFG.dashCooldown;
    p.dashT = CFG.dashTime;
    p.dashDir = p.moving ? Math.atan2(my, mx) : p.face;
    audio.sfx('dash');
  }
  // Sword.
  if (input.mouse.clicked || input.wasPressed('KeyJ')) swordSwing(w, audio);
  // Bow.
  if (input.mouse.rightClicked || input.wasPressed('KeyK')) shootBow(w, audio);
  // Potion.
  if (input.wasPressed('Digit1')) usePotion(w, audio);
  // Interact.
  if (input.wasPressed('KeyE')) tryInteract(w, audio);

  collideCircle(w, p, CFG.playerRadius);

  // Boss trigger: stepping into the arena with two shards wakes the Warden.
  // Once its shard is taken the arena stays quiet.
  const a = CFG.arena;
  const inArena = p.x > a.x && p.x < a.x + a.w && p.y > a.y && p.y < a.y + a.h;
  if (inArena && p.shards[0] && p.shards[1] && !p.shards[2] && !w.boss && !w.forgeLit) {
    spawnBoss(w);
    audio.sfx('boss');
    toast(w, 'The Void Warden wakes!');
  }
  // Arena walls while the boss lives.
  if (w.bossActive && w.boss) {
    p.x = Math.max(a.x + 20, Math.min(a.x + a.w - 20, p.x));
    p.y = Math.max(a.y + 20, Math.min(a.y + a.h - 20, p.y));
  }
}

function updateEnemy(w, e, dt, audio) {
  if (e.dead) return;
  const p = w.player;
  e.t += dt;
  if (e.flashT > 0) e.flashT -= dt;
  const d = dist(e.x, e.y, p.x, p.y);
  const a = angleTo(e.x, e.y, p.x, p.y);

  if (e.boss) {
    // The Void Warden: chase, ring bursts, summons, charges.
    e.burstT -= dt;
    e.summonT -= dt;
    e.chargeT -= dt;
    if (e.mode === 'charge') {
      e.modeT -= dt;
      e.x += Math.cos(e.chargeDir) * 420 * dt;
      e.y += Math.sin(e.chargeDir) * 420 * dt;
      if (e.modeT <= 0) e.mode = 'chase';
    } else {
      e.x += Math.cos(a) * e.def.speed * dt;
      e.y += Math.sin(a) * e.def.speed * dt;
      if (e.chargeT <= 0) {
        e.mode = 'charge';
        e.modeT = 0.55;
        e.chargeDir = a;
        e.chargeT = 6;
        audio.sfx('boss');
      }
    }
    if (e.burstT <= 0) {
      e.burstT = 3.4;
      for (let i = 0; i < 12; i++) {
        const ba = (Math.PI * 2 * i) / 12 + e.t;
        w.projectiles.push({
          x: e.x, y: e.y, vx: Math.cos(ba) * 240, vy: Math.sin(ba) * 240,
          friendly: false, dmg: e.def.damage, r: 8, life: 2.2, kind: 'orb',
        });
      }
      audio.sfx('shoot');
    }
    if (e.summonT <= 0) {
      e.summonT = 9;
      for (let i = 0; i < 3; i++) {
        spawnEnemy(w, 'wisp', e.x + w.rng.range(-70, 70), e.y + w.rng.range(-70, 70));
      }
      floater(w, e.x, e.y - 60, 'The Warden calls wisps!', '#e05cff');
    }
    collideCircle(w, e, e.def.radius);
  } else if (e.type === 'husk') {
    // Keep range, shoot arrows.
    if (d > 300) {
      e.x += Math.cos(a) * e.def.speed * dt;
      e.y += Math.sin(a) * e.def.speed * dt;
    } else if (d < 180) {
      e.x -= Math.cos(a) * e.def.speed * dt;
      e.y -= Math.sin(a) * e.def.speed * dt;
    }
    e.shootCd -= dt;
    if (e.shootCd <= 0 && d < 420 && !p.dead) {
      e.shootCd = 2.2;
      w.projectiles.push({
        x: e.x, y: e.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300,
        friendly: false, dmg: e.def.damage, r: 6, life: 2, kind: 'arrow',
      });
      audio.sfx('shoot');
    }
    collideCircle(w, e, e.def.radius);
  } else if (e.type === 'wisp') {
    const zig = Math.sin(e.t * 6) * 0.9;
    const ma = a + zig;
    e.x += Math.cos(ma) * e.def.speed * dt;
    e.y += Math.sin(ma) * e.def.speed * dt;
    collideCircle(w, e, e.def.radius);
  } else if (e.type === 'golem') {
    // Slow chase; slam when close.
    if (d < 500) {
      e.x += Math.cos(a) * e.def.speed * dt;
      e.y += Math.sin(a) * e.def.speed * dt;
    }
    e.shootCd -= dt;
    if (e.shootCd <= 0 && d < 110) {
      e.shootCd = 3.5;
      w.shake = 8;
      burst(w, e.x, e.y, '#9aa7bd', 20, 180);
      if (d < 120) damagePlayer(w, e.def.damage, audio);
    }
    collideCircle(w, e, e.def.radius);
  } else {
    // Mote: steady chase with a wobble.
    if (d < e.def.aggro) {
      const wa = a + Math.sin(e.t * 3 + e.wobble) * 0.35;
      e.x += Math.cos(wa) * e.def.speed * dt;
      e.y += Math.sin(wa) * e.def.speed * dt;
    }
    collideCircle(w, e, e.def.radius);
  }

  // Touch damage.
  if (!p.dead && d < e.def.radius + CFG.playerRadius + 2) {
    damagePlayer(w, e.def.damage, audio);
    // Push the player out a little so one touch is one hit.
    p.x += Math.cos(a) * 10;
    p.y += Math.sin(a) * 10;
  }
}

function updateProjectiles(w, dt, audio) {
  const p = w.player;
  for (const pr of w.projectiles) {
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    pr.life -= dt;
    if (pr.friendly) {
      for (const e of w.enemies) {
        if (e.dead) continue;
        if (dist(pr.x, pr.y, e.x, e.y) < e.def.radius + pr.r) {
          damageEnemy(w, e, pr.dmg, Math.cos(Math.atan2(pr.vy, pr.vx)), Math.sin(Math.atan2(pr.vy, pr.vx)), audio);
          pr.life = 0;
          break;
        }
      }
    } else if (!p.dead && p.dashT <= 0 && dist(pr.x, pr.y, p.x, p.y) < CFG.playerRadius + pr.r) {
      damagePlayer(w, pr.dmg, audio);
      pr.life = 0;
    }
    if (pr.x < 0 || pr.x > CFG.worldW || pr.y < 0 || pr.y > CFG.worldH) pr.life = 0;
  }
  w.projectiles = w.projectiles.filter((pr) => pr.life > 0);
}

function updateSpawner(w, dt) {
  if (w.bossActive) return;
  w.spawnT -= dt;
  if (w.spawnT > 0) return;
  w.spawnT = CFG.spawnInterval;
  if (w.enemies.filter((e) => !e.dead).length >= CFG.enemyCap) return;
  const p = w.player;
  const z = zoneAt(p.x, p.y);
  const table = z.id === 'meadow' ? ['mote', 'mote', 'mote', 'wisp']
    : z.id === 'gloomwood' ? ['wisp', 'wisp', 'mote', 'husk']
    : ['husk', 'husk', 'wisp', 'mote'];
  const type = w.rng.pick(table);
  const a = w.rng.range(0, Math.PI * 2);
  const d = w.rng.range(420, 680);
  const x = Math.max(30, Math.min(CFG.worldW - 30, p.x + Math.cos(a) * d));
  const y = Math.max(30, Math.min(CFG.worldH - 30, p.y + Math.sin(a) * d));
  if (dist(x, y, p.x, p.y) < 380) return;
  spawnEnemy(w, type, x, y);
}

export function updateWorld(w, input, dt, audio) {
  w.time += dt;
  w.stats.playTime += dt;
  w.dayT = (w.dayT + dt / CFG.dayLength) % 1;
  if (w.toast) {
    w.toast.t -= dt;
    if (w.toast.t <= 0) w.toast = null;
  }
  if (w.shake > 0) w.shake = Math.max(0, w.shake - dt * 30);

  updatePlayer(w, input, dt, audio);
  for (const e of w.enemies) updateEnemy(w, e, dt, audio);
  w.enemies = w.enemies.filter((e) => !e.dead);
  updateProjectiles(w, dt, audio);

  // Pickups.
  const p = w.player;
  for (const pk of w.pickups) {
    pk.t += dt;
    if (!p.dead && dist(pk.x, pk.y, p.x, p.y) < CFG.pickupRadius + 10) {
      if (pk.kind === 'heart') {
        p.hp = Math.min(p.maxHp, p.hp + pk.value);
        audio.sfx('heart');
        floater(w, p.x, p.y - 30, `+${pk.value} HP`, '#7fe0a8');
      } else if (pk.kind === 'gold') {
        p.gold += pk.value;
        w.stats.goldEarned += pk.value;
        audio.sfx('coin');
        floater(w, p.x, p.y - 30, `+${pk.value}g`, '#ffd75e');
      }
      pk.taken = true;
    }
  }
  w.pickups = w.pickups.filter((pk) => !pk.taken && pk.t < 25);

  // Moonpetals.
  for (const pt of w.petals) {
    if (!pt.taken && !p.dead && dist(pt.x, pt.y, p.x, p.y) < CFG.pickupRadius + 8) {
      pt.taken = true;
      w.quest.petals += 1;
      audio.sfx('quest');
      floater(w, p.x, p.y - 30, `Moonpetal ${w.quest.petals}/5`, '#c9a7ff');
      if (w.quest.petals >= 5) {
        p.gold += 60;
        w.stats.goldEarned += 60;
        toast(w, 'All five Moonpetals! The elder’s blessing: +60 gold.');
      }
    }
  }

  // Particles and floaters.
  for (const pt of w.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.92;
    pt.vy *= 0.92;
    pt.life -= dt;
  }
  w.particles = w.particles.filter((pt) => pt.life > 0);
  for (const f of w.floaters) {
    f.y -= 34 * dt;
    f.life -= dt;
  }
  w.floaters = w.floaters.filter((f) => f.life > 0);

  // Enemy separation (cheap pairwise push).
  const alive = w.enemies;
  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i], b = alive[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = a.def.radius + b.def.radius;
      if (d > 0.01 && d < min) {
        const push = (min - d) / 2;
        const nx = dx / d, ny = dy / d;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
      }
    }
  }

  updateSpawner(w, dt);

  // Zone music follows the player.
  audio.setZone(zoneAt(p.x, p.y).id);
}

export function scoreOf(w) {
  const p = w.player;
  const shards = p.shards.filter(Boolean).length;
  return w.stats.kills * 10 + w.stats.goldEarned + shards * 500 + p.level * 50 + (w.forgeLit ? 1000 : 0);
}

// Best result, kept in localStorage. Guarded: storage may be unavailable.
export function loadBest() {
  try {
    const raw = window.localStorage.getItem('lumenfall-best');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveBest(w) {
  try {
    const prev = loadBest();
    const score = scoreOf(w);
    const entry = {
      score,
      kills: w.stats.kills,
      level: w.player.level,
      time: Math.round(w.stats.playTime),
      won: w.forgeLit,
      when: Date.now(),
    };
    if (!prev || score > prev.score) window.localStorage.setItem('lumenfall-best', JSON.stringify(entry));
  } catch {
    // Storage unavailable; the run still counts.
  }
}

export function saveGame(w) {
  try {
    const p = w.player;
    window.localStorage.setItem('lumenfall-save', JSON.stringify({
      x: p.x, y: p.y, hp: p.hp, maxHp: p.maxHp, level: p.level, xp: p.xp, xpNext: p.xpNext,
      gold: p.gold, shards: p.shards, swordBonus: p.swordBonus, speedBonus: p.speedBonus,
      hasBow: p.hasBow, potions: p.potions, questStep: w.quest.step, petals: w.quest.petals,
      satchelTaken: w.satchel.taken, satchelReturned: w.satchel.returned,
      chestOpened: w.chests[0].opened, golemDead: !w.golem || w.golem.dead,
      kills: w.stats.kills, goldEarned: w.stats.goldEarned, playTime: w.stats.playTime,
    }));
  } catch {
    // Storage unavailable; ignore.
  }
}

export function loadSave(w) {
  try {
    const raw = window.localStorage.getItem('lumenfall-save');
    if (!raw) return false;
    const s = JSON.parse(raw);
    const p = w.player;
    p.x = s.x; p.y = s.y; p.hp = s.hp; p.maxHp = s.maxHp; p.level = s.level;
    p.xp = s.xp; p.xpNext = s.xpNext; p.gold = s.gold; p.shards = s.shards;
    p.swordBonus = s.swordBonus; p.speedBonus = s.speedBonus; p.hasBow = s.hasBow;
    p.potions = s.potions;
    w.quest.step = s.questStep; w.quest.petals = s.petals;
    w.satchel.taken = s.satchelTaken; w.satchel.returned = s.satchelReturned;
    w.chests[0].opened = s.chestOpened;
    w.stats.kills = s.kills; w.stats.goldEarned = s.goldEarned; w.stats.playTime = s.playTime;
    if (s.golemDead && w.golem) {
      w.golem.dead = true;
      w.enemies = w.enemies.filter((e) => e !== w.golem);
      w.golem = null;
    }
    return true;
  } catch {
    return false;
  }
}

export { QUEST_STEPS, SHOP_ITEMS };
