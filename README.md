# Unnamed Sandbox

A Kenshi-like sandbox in a Dwarf Fortress-style generated world, playable in the browser. You start as a nobody in a world that already has history — a history of people using a landscape.

## Concept

This is a sandbox game set in a procedurally generated world where **the map is the residue of history**. Terrain generates with height, water, biomes, and resources. Societies with different economic logics (extraction, craft, trade, mutual aid) found sites where the land fits them. A year loop runs before you arrive, simulating production, consumption, trade routes, construction, failures, and commons that emerge from ruins. Roads and buildings exist because they had a reason.

## Running Locally

```bash
npm install
npm run dev
```

Then open the URL shown in your terminal (typically `http://localhost:5173`).

## This Slice Includes

### Worldgen as History Simulation
- **Terrain generation**: Larger procedural maps (300×200) with heightmaps, water, biomes (plains, forest, hills, mountains, coast), and resources (ore, timber, farmland, harbors)
- **Economic founding logic**: Sites emerge where land and economics align
  - Company towns on ore deposits (wage labor)
  - Freeports on harbors (trade)
  - Guild cities near materials and people (craft)
  - Commons on farmland or leftover ground (mutual aid)
- **Year loop simulation** (80 years before spawn):
  - Sites produce and consume based on type
  - Trade routes form when surplus meets demand
  - Share routes extend mutual aid to failed settlements
  - Construction happens (grids, stores, docks, workshops, pantries)
  - Roads decay if unused
  - Company towns can fail when resources run out or trade collapses
  - Commons emerge near failed charters
- **Generated history** records causal events, not templates

### Rendering
- **Terrain, water, biomes** visible in both view modes
- **Roads**: Trade routes (tan) vs share routes (green), visually distinct
- **Sites**: Founded for reasons, shown with terrain context
- **Dual view modes**: 
  - **ASCII/ANSI top-down**: Dwarf Fortress-style character-based view using IBM VGA 16-color palette, CP437 glyphs, and box-drawing characters for roads. Terrain appears as colored backgrounds with typographic marks; roads are overlaid with connected line segments; sites have distinct glyphs by type
  - **Isometric**: 3D-projected view of the same simulation
- **Watchable generation**: World forms before your eyes — terrain shapes, sites found, roads cut, constructions rise, failures occur, commons emerge

### Gameplay
- **Player character** with WASD/arrow key movement
- **Camera** follows player across the greater world
- **HUD** shows position, location, and view mode
- **History panel** tells the timeline of what happened
- **Controls**: View toggle, seed display, world regeneration
- **Generation controls**: Skip animation or jump to completion while watching world form

## Later Work

Not yet implemented:
- Enterable site-interior street maps
- Multiple start scenarios (wanderer, company hire, dock casual, guild apprentice, charter remnant, scene member)
- Job and wage systems after spawn
- Needs and survival mechanics (hunger, exhaustion, shelter)
- Live ticking economies after player arrives
- Mutual aid networks and share programs as gameplay systems
- Scenes (friend-groups that teach alternatives to wage labor)
- NPCs, pathfinding crowds
- Combat

## Tech Stack

- Vite + Preact + TypeScript
- HTML Canvas 2D rendering (no Three.js)
- Pure client-side (no backend)
- Deterministic world generation from seed

## Architecture

The codebase separates concerns:
- `src/sim/` - World simulation, generation, and state (view-agnostic)
  - `terrain.ts` - Heightmap, biomes, resources
  - `worldgen.ts` - Site founding and year loop
  - `economy.ts` - Production, roads, construction, failures
  - `pathfinding.ts` - A* for trade and share routes
- `src/render/` - Canvas rendering systems (ASCII top-down and isometric)
  - `topdown.ts` - ASCII/ANSI character-based renderer with CP437 glyphs
  - `ansiColors.ts` - IBM VGA 16-color palette and glyph definitions
  - `boxDrawing.ts` - Road connectivity and box-drawing character selection
  - `isometric.ts` - 3D projection renderer
- `src/ui/` - Preact UI components and controls

### Font Notes
The ASCII/ANSI top-down renderer uses monospaced fonts with CP437 character support. The font stack prioritizes Consolas (Windows), DejaVu Sans Mono (Linux), and Courier New (fallback) for crisp rendering of box-drawing characters, terrain glyphs, and site markers. All fonts used are system fonts available on standard operating systems.
