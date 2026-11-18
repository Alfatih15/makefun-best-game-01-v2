# makefun-best-game-01-v2

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Alfatih15/makefun-best-game-01-v2/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Alfatih15/makefun-best-game-01-v2/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Lumenfall — The Last Starforge: a top-down action-adventure across three biomes. You are Wren, last lantern-warden: find the three Sky Shards, relight the Starforge, and face the Void Warden.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Or play it locally:

```sh
node serve.ts
# open http://localhost:8080
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=hjff56h1&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>

An original top-down action-adventure for the make.fun **best-game-01** bounty. Three winters ago the Starforge went dark and the void crept into Lumenfall. Explore Ember Meadow, Gloomwood, and the Frostfall Ruins; talk to the elder and the merchant; buy blades, boots, and a star bow; gather Moonpetals; break the Ruin Golem; and face the Void Warden in the Starforge arena.

## How to play

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Mouse | Aim |
| Left click | Sword swing |
| Right click | Star Bow (once bought) |
| Space / Shift | Dash (brief invulnerability) |
| E | Talk, open chests, light the forge |
| 1 | Drink a Heart Potion |
| 1–5 in the shop | Buy an item |
| P / Esc | Pause |
| M | Mute / unmute |
| Enter / click | Start, restart |
| C on the title screen | Continue a saved journey |

## The game

- **A world, not an arena:** 3200×2400 of explorable land in three biomes with a day/night cycle, fireflies, ponds, and a minimap with a quest marker.
- **A quest chain:** speak with Elder Maren, find the Gloomwood Shard, break the Ruin Golem for the second, face the Void Warden for the third, relight the Starforge — plus two side quests (Moonpetals, the merchant's lost satchel).
- **Depth:** 5 enemy kinds (Ember Mote, Gloom Wisp, Frost Husk archer, Ruin Golem, Void Warden boss with ring bursts, summons, and charges), XP levels, gold, and a 5-item shop.
- **Feel:** particles, screen shake, hit flash, dash trail, floating damage numbers, fully synthesised WebAudio effects and a wandering music loop (no audio files), save/continue in localStorage, best score kept.
