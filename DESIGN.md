# Design Document: Unnamed Sandbox

## Premise

A Kenshi-like sandbox in a Dwarf Fortress-style procedurally generated world. You are nobody in a world that already has history. The map contains company towns, freeports, guild cities, failed-charter remnants, and commons. There are two ways to live: the official economy (get a job, survive within the wage system) and the unofficial economy (mutual aid, share programs, libraries, food pantries, and friend-group scenes that transform people).

## World Structure

### Site Types

1. **Company Towns** - Corporate-owned settlements built around resource extraction or manufacturing. Ordered, hierarchical, wage-dependent. Safety and stability in exchange for autonomy.

2. **Freeports** - Independent trading hubs that maintain neutrality between competing powers. Merchant-run, pragmatic, profit-oriented. Freedom in exchange for self-reliance.

3. **Guild Cities** - Settlements organized by craft guilds and artisan collectives. Skill-based hierarchies, apprenticeship systems, quality over quantity. Tradition in exchange for conformity.

4. **Failed Charters** - Abandoned or collapsed settlements. Former company towns where the corporation pulled out. Ruins, scavengers, and holdouts. Freedom and danger.

5. **Commons** - Emergent communities built on mutual aid and resource sharing. No wages, no bosses, horizontal organization. Libraries, food pantries, share programs. Solidarity in exchange for participation.

## Start Scenarios (Future Implementation)

Each start provides different allegiances and resources on day one, but the world remains open:

- **Wanderer** - No allegiances, minimal resources, complete freedom
- **Company Hire** - Employed in a company town, stable wages, restricted mobility
- **Dock Casual** - Day labor in a freeport, flexible but precarious
- **Guild Apprentice** - Learning a craft, bound to a master, path to expertise
- **Charter Remnant** - Survivor in a failed settlement, resourceful, isolated
- **Scene Member** - Part of a commons, access to mutual aid, community obligations

## Economic Systems

### Official Economy (Wages)
- Employment at company facilities
- Guild contracts and commissions
- Dock work and trade
- Hierarchical, predictable, constrained

### Unofficial Economy (Mutual Aid)
- Resource sharing and gift economy
- Skill exchanges and time banking
- Community libraries and tool shares
- Food pantries and free stores
- Horizontal, unpredictable, liberating

Both systems coexist. Players navigate between them, and their choices shape which grows stronger.

## Scenes and Social Systems (Future)

Friend-group scenes exist in all settlement types but thrive in commons:
- Book clubs and study groups
- Maker spaces and repair cafes
- Music scenes and art collectives
- Political reading groups
- Skill shares and workshops

Scenes can radicalize characters, teaching skills outside the wage system and building solidarity networks.

## Current Worldgen Implementation

The core principle: **the map is the residue of history**. Worldgen is a history of people using a landscape.

### How It Works

1. **Terrain First** (300×200 tiles)
   - Heightmap generation with multiple octaves
   - Water placement below threshold
   - Biome assignment: water, coast, plains, forest, hills, mountains
   - Resource placement: ore (mountains/hills), timber (forest/hills), farmland (plains), harbors (coast)

2. **Economic Founding**
   Sites emerge where land and economics align:
   - **Company towns** (6-10): Founded on ore deposits. Extract resources, pay wages, need food and tools.
   - **Freeports** (3-6): Founded on harbors. Live on trade, need goods and food.
   - **Guild cities** (3-5): Founded near timber and materials. Produce goods and tools, need ore and food.
   - **Commons** (2-4): Founded on farmland or leftover ground. Share resources, produce food and timber.

3. **Year Loop** (80 years before spawn)
   Each year:
   - Sites produce based on resources and population
   - Sites have needs based on type
   - **Trade routes** form when a site's surplus meets another's need (pathfinding across accessible terrain)
   - **Share routes** extend from commons to failed settlements (mutual aid, not markets)
   - Every 3 years: construction attempts (grids, stores, docks, workshops, pantries) if connected
   - Every 8 years: failure checks for company towns (if ore depleted or isolated)
   - Failed sites become **failed-charter** type, lose population
   - Commons may form near failed sites (60% chance)
   - Roads decay slowly if unused
   - Dead roads removed periodically

4. **History as Consequence**
   Events record:
   - Site foundings with reasons
   - Trade route establishment
   - Share route extensions
   - Construction completion
   - Company town failures (causal)
   - Commons emergence from ruins
   
   Events sorted by year and importance. Top 50 shown in UI.

### Technical Details

**Pathfinding**: A* through terrain with difficulty costs (plains 1.0, coast 1.2, forest 1.5, hills 2.0)

**Determinism**: Same seed always produces same world (heightmap, site placement, year loop RNG)

**Rendering Scale**: Smaller tiles (8px top-down, 20px isometric) to show larger world

## First Slice Scope (Current Implementation)

✅ **Implemented:**
- Terrain generation with biomes and resources
- Economic founding logic for all site types
- Year loop simulation with production/consumption
- Trade routes and share routes (pathfinding)
- Construction based on connections and demand
- Causal site failures and commons formation
- Road decay and removal
- History events from simulation, not templates
- Player character with keyboard movement
- Camera following player across greater world
- Site detection (in site, near site, wilderness)
- Top-down and isometric rendering modes showing terrain, roads, sites
- UI: controls, seed display, history panel, HUD

❌ **Not Yet Implemented:**
- Enterable site-interior street maps
- Start scenarios and character configuration
- Job systems and employment (after spawn)
- Needs and survival mechanics
- Live ticking economy after player spawns
- NPCs and crowds
- Mutual aid systems as gameplay (currently only in worldgen)
- Scenes and social interactions
- Skill systems
- Combat or conflict

## Technical Architecture

**View-Agnostic Simulation**
- World state lives in `src/sim/`
- No rendering logic in simulation code
- View mode changes do not affect world state

**Dual Rendering**
- Top-down: traditional roguelike grid view
- Isometric: 2D isometric projection (no 3D, no Three.js)
- Both views render the same world state

**Deterministic Generation**
- Same seed always produces same world
- Seeded RNG for reproducibility
- History events tied to world generation

## Future Development

The next phases will add:
1. **Basic survival**: hunger, exhaustion, shelter needs
2. **Employment system**: jobs in company towns and freeports
3. **Guild mechanics**: apprenticeship, skill development
4. **Mutual aid networks**: resource sharing, community support
5. **Scenes**: social groups that provide alternatives to wage labor
6. **NPCs**: crowds, workers, guild members, scene participants
7. **Extended starts**: playable scenarios beyond wanderer
8. **Deeper simulation**: economies that respond to player choices

## Design Philosophy

- **Asymmetric start, open middle**: Your start matters less than what you do
- **No forced narrative**: The world has history, but you write your story
- **Systems over content**: Emergent gameplay from interacting systems
- **Both/and not either/or**: Navigate between official and unofficial economies
- **Solidarity is learned**: Scenes and communities teach alternatives to competition
