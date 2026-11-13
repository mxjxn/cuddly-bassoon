# Town View Screenshots

## Overview

This directory contains screenshots demonstrating the town zoom level feature.

## Screenshots

### World Map (01-world-map.png)
The top-down ASCII/ANSI world map showing sites as single glyphs. Different site types have different symbols and colors:
- Company Town: Yellow ■
- Freeport: Cyan ◆  
- Guild City: Yellow ●
- Failed Charter: Gray ▢
- Commons: Green ✦

### Commons Town (02-commons.png)
A commons settlement showing:
- Organic street layout following curves
- Community Pantry (if constructed)
- Free Library  
- Shared residential plots
- Assembly Hall for gatherings
- Cooperative workshops (if constructed)
- Optional Solidarity Café

## Town Type Layouts

Each site type generates a distinct, deterministic layout based on its worldgen history:

### Company Town
- Grid street pattern
- Company Store (central, if constructed)
- Processing Mill/Cannery
- Barracks for workers
- Company Housing blocks
- Optional bar ("The Wage Cage")

### Freeport
- Irregular street pattern
- Multiple docks/piers along the bottom edge
- Central Free Market
- Warehouses (if constructed)
- Residential areas
- "The Free Anchor" bar

### Guild City
- Radial street pattern from center
- Multiple Guild Halls (Smiths, Carpenters, Weavers, Masons)
- Workshops (if constructed)
- Master's Houses (residential)
- Guild Commons venue in center

### Failed Charter
- Deteriorated irregular streets
- Ruined company store (abandoned)
- Multiple ruins of various building types
- Small survivor shelters
- Optional "Last Stand Tavern"

### Commons
- Organic, flowing street layout
- Community Pantry (if constructed)
- Free Library
- Shared residential plots
- Assembly Hall
- Cooperative workshops (if constructed)
- Optional Solidarity Café

## Rendering Style

All towns use ASCII/ANSI 16-color rendering:
- Walls: `#` (various colors by building type)
- Doors: `+` (bright colors)
- Floors: `.` (dark colors)
- Streets: `═` (gray box-drawing characters)
- Ruins: `▒` walls, `·` floors, `÷` doors (all gray)

Buildings show their name on hover/selection.
