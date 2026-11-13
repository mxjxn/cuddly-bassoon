# On-Chain Design

Living design notes from conversation with Max. Captures the intended autonomous-world / on-chain model for this sandbox. Not a spec frozen in amber — update as decisions land.

Related: [DESIGN.md](../DESIGN.md) (world premise and sim slice).

---

## Vision: An Autonomous World

People in the world act on their own. Players never navigate or command characters.

The player drives **intent and conditions** — weather, not hands. You tilt odds, place forces, and set the climate of a region. The sim keeps walking.

- **Official goal:** get a job and survive in the wage system.
- **Alternate path:** thrive through mutual aid, scenes, and organizing.

The watchable history log is the main feedback loop: a factory town that eventually spawns a masterwork guild so workers gain leverage from bosses is the kind of story the design should produce, not script.

---

## On-Chain Model: Inputs On Chain, Not the World

Put **inputs** on chain. Keep the world off chain and fully reproducible.

### What the chain holds

- **Seed** — genesis of the world.
- **Clock** — game tick = block (~12s Ethereum, ~2s Base).
- **Player actions** — seasonal baskets, placements, commits/reveals, etc.

### What clients do

Anyone runs a client that replays a pure deterministic function:

```text
state(tick) = step(state(tick-1), actions up to tick, seed, block randomness)
```

Optional periodic **state-hash commitments** let replays be checked. Later: optimistic / fraud proofs or ZK for trustless state verification.

### Alternatives and scale

- **Fully on-chain sim** (e.g. MUD on Redstone, Dojo on Starknet) is a noted but expensive alternative — fine for experiments, heavy for a long Kenshi/DF-scale history.
- **Long histories** need checkpoints / snapshots so new viewers need not replay from genesis.

---

## Determinism Requirements

The client sim must be a pure function of on-chain inputs:

- Integer / fixed-point math (no floats that diverge across runtimes)
- Seeded RNG everywhere; no `Math.random`
- No wall-clock time
- Stable iteration order over maps, sets, and entity lists
- Randomness from block `prevrandao` / `blockhash` so the future is **forecastable but not exactly solvable**

---

## Player Influence

### Seasonal basket

Once per long cycle (e.g. a week of blocks), a player weights tokens across forces in a region they are tied to, for example:

- Mutual aid
- Guild craft
- Company capital
- Wild growth
- Old spirits

Weights tilt event odds (masterwork splitting off, pantry forming, forest reclaiming a failed charter, haunting spreading). **One transaction bundles a season of influence.**

### Placements

Objects as on-chain records (`type`, `position`, `block placed`): statues, altars, caves, technology / machines, and so on.

They emit **fields** that diffuse over the map — sacred, danger, ore, pollution, jobs, fertility — which nearby people, plants, and events read. Effects ripple outward through pure functions.

### Effect shapes

- **Slow burns** — orchard, shrine
- **One-time big effects** — flood, strike, cave-in
- **Areas of effect** — auras, roads, rivers carrying influence downstream
- **Counters and combos** between forces

### Commit-reveal

Commit-reveal across seasons (face-down cards) to prevent last-second sniping of another player's basket.

### Metaphor

**Chess combined with Magic: The Gathering** — open, forecastable board information plus cards with different timing and reach.

---

## Natural Layer Expansion

History should leave scars that become forces players can lean into:

- Blight
- Migrating herds
- Floods
- Ore veins attracting companies
- Sacred groves
- Haunted / cursed ground where atrocities happened
- Heavy forest growth reclaiming ruined charters

These are not flavor only — they are inputs to the same field / odds systems players already tilt.

---

## Economics Without a Rug Game

Max dislikes rug dynamics. Design goals:

- **Short-term participation** via prediction on outcomes (e.g. "will Steamport unionize this season?") settling in **reputation or season points that reset**, not a tradable speculative coin.
- **Influence decays** unless renewed so whales cannot lock regions forever.
- **Commons influence** scales with the number of distinct backers (quadratic-ish).
- **Company capital** scales with money.

Organizing should beat money *mechanically*, not only thematically.

---

## Open Questions

- Is a player anchored to a home town / person, or a floating spirit over the world?
- Which chain: Base vs Ethereum vs L3 / appchain?
- Season length (in blocks / wall time)?
- Token design (if any beyond season points / reputation)?
- Checkpoint / proof strategy (hash commits → optimistic → ZK)?
- How do zoom levels (world, town, later interiors) relate to on-chain state?

---

## Suggested Next Steps

1. Make the sim **strictly deterministic** — audit floats and `Math.random`.
2. Define an **action record schema** (seasonal basket, placement, commit/reveal).
3. Prototype **local replay** from a fake action log.
4. Ship a **testnet contract** that only logs actions (no world state on chain).

---

## Changelog

- Initial capture of design conversation with Max (autonomous world, inputs-on-chain, seasonal influence, no-rug economics).
