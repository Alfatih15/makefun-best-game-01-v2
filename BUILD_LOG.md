# BUILD_LOG — Lumenfall (best-game-01-v2)

## What was built

An original top-down action-adventure, **Lumenfall — The Last Starforge**, at
`~/workspace/makefun/entries/best-game-01-v2/`. A second, clearly different
entry from v1 (Emberfall Keep, a wave arena shooter): this one is an
explorable world with a quest chain, NPCs, a shop, and a boss.

- **Loop:** title → explore three biomes → quests and shop → boss in the
  Starforge arena → relight the forge (victory) or fall (game over) → restart.
  Pause, save/continue in localStorage, best score kept.
- **Depth:** 5 enemy kinds (Mote, Wisp, Husk archer, Ruin Golem mini-boss,
  Void Warden boss with ring bursts, wisp summons, and charge attacks), XP
  levels to 12, gold, a 5-item shop (potion, blade, boots, charm, bow),
  main quest in 5 steps plus 2 side quests, day/night cycle with fireflies.
- **Feel:** particles, screen shake, hit flash, dash trail, floating damage
  numbers, fully synthesised WebAudio effects + music loop (no audio files),
  M to mute.
- **Structure (judge outline):** one job per file — `config.js` (tuning /
  palette / zones / enemies / quests / shop), `random.js` (seeded RNG),
  `audio.js` (synth sound), `input.js` (keyboard+pointer), `world.js`
  (rules: terrain, entities, quests, combat, boss, shop, save),
  `render.js` (all drawing: world, HUD, minimap, panels, screens),
  `shots.js` (deterministic screenshot scenes), `main.js` (fixed 1/60 s
  loop, screens). No libraries, no network requests, stdlib-only `main.ts`.
- **Kit:** `vendor/makefun-game.ts` copied from the kit unchanged (sha256
  verified identical to kit.json), `LICENSE` MIT, `README.md`, `shots.json`,
  `.makefun/owner.json` with wallet
  `Cfdgeggmd6ij5dLpqwmqAaGExTbi4JPZJYcRdi4iSjSW`.

## What was verified

- **Scripted playtest (headless Chrome 140, real keyboard+mouse via CDP):**
  title → Enter starts the game; walking moves the player; talking to Elder
  Maren opens dialogue and advances the quest 0→1; talking to Merchant Brin
  opens the shop; buying with 0 gold is refused, buying with 200 gold works
  (potion 200→170g, potions 1→2; Ember Blade 170→50g, swordBonus 0→8);
  shop closes; pause/resume works; sword swings kill (kills 1, gold +6);
  stepping into the Starforge arena with two shards wakes the Void Warden;
  killing it grants the third shard (quest 4); pressing E at the forge with
  all three shards reaches the victory screen. Zero console errors and zero
  failed network requests in every run (favicon served as a data: URI).
  Two bugs found and fixed in testing: the opening keypress also closed a
  just-opened dialogue/shop panel (fresh-frame guard), and the boss
  respawned after being killed (trigger now requires the third shard
  still missing).
- **Real browser renders:** 4 screenshots are genuine renders of the game's
  own code (`?shot=…&seed=1`, waited for `window.__shotReady`), 1280x720
  JPEG q88, 39–68 KiB each (limit 256 KiB), each visually inspected: title
  screen, mid-fight play frame with full HUD (hearts, XP, gold, shards,
  quest tracker, minimap), boss fight with boss HP bar and void orbs,
  victory screen with stats and restart prompt. Start/victory shots were
  retaken on a fresh browser profile so no stale best-score line shows.
- **main.ts:** `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` run
  twice — outputs byte-identical (`diff -r` clean). Output holds
  `dossier.json` (374,163 bytes, under the 1.5 MiB cap), `game/` (77,274
  bytes) and all 4 screenshots. No network references in `game/` (grep for
  `http://`, `https://` — none).
- **Kit CLI check:** `node cli/makefun.mjs check --kit . --repo <entry>
  --worktree` → 4 passed (`competition_open`, `snapshot` 21 files /
  364,068 bytes, `license_osi`, `entrypoint`), 1 failed
  (`transcripts_present` — no transcripts supplied here; the main agent
  bundles and submits, as briefed), 14 skipped, 5 deferred to submission
  (repo public / owner / created-after-open / commit / duplicate snapshot).
  Kit files verified (24 files).
