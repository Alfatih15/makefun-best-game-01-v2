// LUMENFALL — deterministic screenshot scenes. One job: given a shot name
// from ?shot=, put the world into a fixed, readable state and say which
// screen to show. The main loop freezes updates in shot mode, so the frame
// the browser captures is exactly the staged one.

import { CFG } from './config.js';
import { spawnEnemy } from './world.js';

export function stageShot(w, name) {
  const p = w.player;
  if (name === 'start') {
    // w.time 0.5 puts the "Press ENTER" pulse at full brightness.
    w.time = 0.5;
    return 'title';
  }
  if (name === 'play') {
    // Mid-run in Ember Meadow: a fight in progress, HUD full, quest live.
    p.x = 1150; p.y = 620;
    p.hp = 78; p.level = 4; p.xp = 55; p.xpNext = 180;
    p.gold = 145; p.potions = 2; p.swordBonus = 8;
    p.shards = [true, false, false];
    w.quest.step = 2;
    w.quest.petals = 3;
    w.stats.kills = 47;
    w.stats.goldEarned = 210;
    w.stats.playTime = 342;
    w.time = 30;
    w.dayT = 0.12;
    spawnEnemy(w, 'mote', p.x + 180, p.y - 90);
    spawnEnemy(w, 'mote', p.x + 250, p.y + 60);
    spawnEnemy(w, 'wisp', p.x - 200, p.y - 120);
    spawnEnemy(w, 'husk', p.x + 330, p.y - 170);
    spawnEnemy(w, 'mote', p.x - 270, p.y + 150);
    w.pickups.push({ kind: 'gold', x: p.x + 90, y: p.y + 90, value: 8, t: 1 });
    w.pickups.push({ kind: 'heart', x: p.x - 90, y: p.y + 70, value: 20, t: 2 });
    p.face = Math.atan2(-90, 180);
    p.swingT = 0.18;
    return 'play';
  }
  if (name === 'boss') {
    // The Void Warden at night in the Starforge arena, boss bar up.
    p.x = CFG.forge.x; p.y = CFG.forge.y + 110;
    p.hp = 62; p.maxHp = 140; p.level = 8; p.xp = 120; p.xpNext = 320;
    p.gold = 310; p.potions = 3;
    p.shards = [true, true, false];
    p.swordBonus = 16; p.hasBow = true; p.speedBonus = 0.25;
    w.quest.step = 3;
    w.stats.kills = 118;
    w.stats.goldEarned = 480;
    w.stats.playTime = 780;
    w.time = 80;
    w.dayT = 0.62;
    const boss = spawnEnemy(w, 'warden', CFG.forge.x, CFG.forge.y - 90);
    w.boss = boss;
    w.bossActive = true;
    boss.hp = Math.round(boss.maxHp * 0.58);
    spawnEnemy(w, 'wisp', CFG.forge.x - 160, CFG.forge.y + 20);
    spawnEnemy(w, 'wisp', CFG.forge.x + 160, CFG.forge.y - 40);
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6;
      w.projectiles.push({
        x: CFG.forge.x + Math.cos(a) * 150, y: CFG.forge.y - 90 + Math.sin(a) * 150,
        vx: Math.cos(a) * 240, vy: Math.sin(a) * 240,
        friendly: false, dmg: 20, r: 8, life: 2.2, kind: 'orb',
      });
    }
    p.face = -Math.PI / 2;
    p.swingT = 0.15;
    return 'play';
  }
  if (name === 'victory') {
    // The forge lit: the results screen with real run stats.
    p.shards = [true, true, true];
    p.level = 9; p.gold = 520; p.hp = 96; p.maxHp = 140;
    w.forgeLit = true;
    w.won = true;
    w.stats.kills = 134;
    w.stats.goldEarned = 540;
    w.stats.playTime = 912;
    w.time = 0.5;
    return 'victory';
  }
  return 'title';
}
