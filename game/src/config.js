// LUMENFALL — tuning, palette, zones, enemies, quests, shop.
// One job: every number and name the rest of the game reads. No code runs here.

export const CFG = {
  title: 'LUMENFALL',
  subtitle: 'The Last Starforge',
  worldW: 3200,
  worldH: 2400,
  viewW: 1280,
  viewH: 720,
  dayLength: 150, // seconds per full day/night cycle
  playerRadius: 16,
  baseSpeed: 215,
  baseDamage: 14,
  baseMaxHp: 100,
  swordRange: 78,
  swordArc: 2.1, // radians of the swing arc
  swordCooldown: 0.34,
  dashSpeed: 620,
  dashTime: 0.18,
  dashCooldown: 1.15,
  bowDamage: 12,
  bowCooldown: 0.42,
  arrowSpeed: 560,
  potionHeal: 45,
  xpBase: 40,
  xpPerLevel: 35,
  maxLevel: 12,
  enemyCap: 26,
  spawnInterval: 1.6,
  interactRange: 64,
  pickupRadius: 22,
  arena: { x: 1360, y: 1960, w: 480, h: 380 }, // Starforge arena, Frostfall south
  forge: { x: 1600, y: 2080 },
};

export const PALETTE = {
  ui: '#f5e9c8',
  uiDim: '#b8a888',
  panel: 'rgba(12, 16, 34, 0.88)',
  panelEdge: '#6b5a2e',
  gold: '#ffd75e',
  heart: '#ff5d73',
  xp: '#7fe0a8',
  mana: '#7fb8ff',
  danger: '#ff4d4d',
  night: 'rgba(8, 10, 38, 0.42)',
  dusk: 'rgba(64, 32, 64, 0.20)',
};

// Three biomes, each with its own ground, props and mood.
export const ZONES = [
  {
    id: 'meadow', name: 'Ember Meadow',
    x: 0, y: 0, w: 1600, h: 1200,
    ground: '#5d8a4a', ground2: '#59844a', accent: '#e8c85a',
    prop: 'tree', propColor: '#2f6b2f', dark: false,
    music: 'meadow',
  },
  {
    id: 'gloomwood', name: 'Gloomwood',
    x: 1600, y: 0, w: 1600, h: 1200,
    ground: '#3d4a5e', ground2: '#3a465a', accent: '#9d7bff',
    prop: 'pine', propColor: '#22384a', dark: true,
    music: 'gloom',
  },
  {
    id: 'frostfall', name: 'Frostfall Ruins',
    x: 0, y: 1200, w: 3200, h: 1200,
    ground: '#7d8aa0', ground2: '#79869c', accent: '#8fd8ff',
    prop: 'ruin', propColor: '#5a6478', dark: false,
    music: 'frost',
  },
];

export const ENEMY_DEFS = {
  mote: {
    name: 'Ember Mote', hp: 22, speed: 58, damage: 8, xp: 10, gold: 3,
    radius: 14, aggro: 320, color: '#ff9a3d', dark: '#c25e10', score: 10,
    zones: ['meadow', 'gloomwood'],
  },
  wisp: {
    name: 'Gloom Wisp', hp: 13, speed: 118, damage: 6, xp: 12, gold: 4,
    radius: 12, aggro: 380, color: '#b78cff', dark: '#6a3fd4', score: 15,
    zones: ['gloomwood', 'frostfall'],
  },
  husk: {
    name: 'Frost Husk', hp: 28, speed: 46, damage: 8, xp: 18, gold: 6,
    radius: 15, aggro: 460, ranged: true, range: 300, color: '#cfe8ff', dark: '#7d9bbd', score: 20,
    zones: ['frostfall', 'gloomwood'],
  },
  golem: {
    name: 'Ruin Golem', hp: 150, speed: 30, damage: 18, xp: 70, gold: 30,
    radius: 30, aggro: 520, color: '#9aa7bd', dark: '#5f6b80', score: 100,
    zones: ['frostfall'], boss: false, miniBoss: true,
  },
  warden: {
    name: 'Void Warden', hp: 460, speed: 62, damage: 20, xp: 320, gold: 120,
    radius: 44, aggro: 9999, color: '#e05cff', dark: '#7a1fa2', score: 500,
    zones: ['frostfall'], boss: true,
  },
};

// The main quest, one step at a time. The tracker shows the current step.
export const QUEST_STEPS = [
  { id: 'elder', title: 'Speak with Elder Maren', hint: 'The elder waits by the old lantern in Ember Meadow.' },
  { id: 'shard1', title: 'Find the Gloomwood Shard', hint: 'A shard sleeps in a mossy chest deep in Gloomwood, east.' },
  { id: 'shard2', title: 'Break the Ruin Golem', hint: 'A stone golem guards the second shard in Frostfall Ruins, south.' },
  { id: 'shard3', title: 'Face the Void Warden', hint: 'The Warden holds the last shard in the Starforge arena.' },
  { id: 'forge', title: 'Relight the Starforge', hint: 'Carry all three shards to the forge and light it. (E)' },
  { id: 'done', title: 'The light returns', hint: 'Lumenfall is saved.' },
];

export const SHOP_ITEMS = [
  { id: 'potion', name: 'Heart Potion', desc: 'Restores 45 HP. Press 1 to drink.', price: 30 },
  { id: 'blade', name: 'Ember Blade', desc: '+8 sword damage, forever.', price: 120, once: true },
  { id: 'boots', name: 'Swift Boots', desc: '+25% move speed, forever.', price: 90, once: true },
  { id: 'charm', name: 'Star Charm', desc: '+40 max HP and heal 40 now.', price: 150, once: true },
  { id: 'bow', name: 'Star Bow', desc: 'Right-click to loose a star arrow.', price: 140, once: true },
];

export const DIALOGUE = {
  elder: [
    'Elder Maren: The Starforge went dark three winters ago, Wren. Its light kept the void out.',
    'Elder Maren: Three Sky Shards hold its fire now — one in Gloomwood, one in the Frostfall Ruins, one with the Void Warden.',
    'Elder Maren: Take this lantern. Where its light falls, the dark cannot hide. Come back when you carry a shard.',
  ],
  elderMid: [
    'Elder Maren: The shards hum when you are near one. Follow the sound, and mind the husks in the snow.',
  ],
  elderDone: [
    'Elder Maren: All three! Go, Wren — the forge waits at the south ruins. Relight it, and Lumenfall wakes.',
  ],
  merchant: [
    'Merchant Brin: Potions, blades, boots — everything a warden needs, and I take gold, not promises.',
    'Merchant Brin: Lost my satchel somewhere in the Frostfall snow, if you happen to trip over it. There is a reward in it for you.',
  ],
  merchantSatchel: [
    'Merchant Brin: My satchel! You found it! Take 80 gold, Wren — and my thanks. The forge road is south.',
  ],
  wanderer: [
    'Wanderer: The golem in the ruins only wakes when you come close. Hit it, step back, hit it again. Patience, warden.',
    'Wanderer: The Warden fires in rings. Stand in the gaps, dash through the bolts, and it will fall.',
  ],
};

export const STORY = [
  'Three winters ago the Starforge went dark,',
  'and the void crept into Lumenfall.',
  'You are Wren, last lantern-warden.',
  'Find the three Sky Shards. Relight the forge.',
];
