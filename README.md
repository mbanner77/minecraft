# Minicraft — Minecraft im Browser

Ein von Grund auf nachgebautes Minecraft, das komplett im Browser läuft. Keine Original-Assets:
alle Texturen, Sounds und Modelle werden zur Laufzeit prozedural erzeugt.

Gebaut mit [Next.js](https://nextjs.org), [three.js](https://threejs.org) und TypeScript.

## Features

**Welt**
- Unendliche, prozedural generierte Welt (Simplex-Noise, seed-basiert und deterministisch)
- 8 Biome: Ebene, Wald, Birkenwald, Wüste, Berge, verschneite Ebene, Strand, Ozean
- Höhlensysteme, Erze (Kohle, Eisen, Gold, Diamant), Grundgestein
- Bäume, Blumen, Gras, Kakteen, Kürbisse, Melonen
- Tag/Nacht-Zyklus (20 Minuten) mit Sonne, Mond, Sternen und Wolken

**Technik**
- Chunk-Meshing mit Face-Culling, Smooth Lighting und Ambient Occlusion
- Minecraft-artiges Lichtsystem: Sonnen- und Blocklicht (0–15) als Flutfüllung,
  inkrementell aktualisiert beim Bauen/Abbauen — Fackeln beleuchten Höhlen
- Prozedural gezeichnete 16×16-Texturen in einem Atlas, prozedurale WebAudio-Sounds
- AABB-Physik: Springen, Sprinten, Schleichen (Kantenschutz), Schwimmen, Fliegen (Kreativ)
- Fallende Blöcke (Sand, Kies), Partikel-Effekte

**Gameplay**
- Überlebens- und Kreativmodus
- Abbauen mit Werkzeug-Geschwindigkeiten, Härte, Mindest-Werkzeugstufen und Haltbarkeit
- Inventar mit Hotbar, 2×2-Crafting, Werkbank (3×3), Ofen mit Brennstoff und Schmelzen
- Gesundheit, Hunger, Sättigung, Fallschaden, Ertrinken, Tod & Respawn
- Mobs: Schweine und Schafe (Tag), Zombies und Creeper (Nacht) — Creeper explodieren!
- TNT mit Zündung und Kettenreaktion
- Item-Drops als aufsammelbare Entities mit Magnet-Effekt
- Mehrere Welten, gespeichert im Browser (localStorage, RLE-komprimierte Chunks)

## Steuerung

| Taste | Aktion |
| --- | --- |
| WASD | Bewegen |
| Maus | Umsehen |
| Leertaste | Springen (2× im Kreativ: Fliegen) |
| Shift | Schleichen / Sinken beim Fliegen |
| Strg oder 2× W | Sprinten |
| Linksklick | Abbauen / Angreifen |
| Rechtsklick | Platzieren / Benutzen / Essen |
| Mittelklick | Block auswählen |
| E | Inventar |
| Q | Item wegwerfen |
| 1–9 / Mausrad | Hotbar |
| F3 | Debug-Overlay |
| Esc | Pause-Menü |

## Entwicklung

```bash
pnpm install
pnpm dev
```

Dann [http://localhost:3000](http://localhost:3000) öffnen.

```bash
pnpm build && pnpm start   # Produktions-Build
```

## Projektstruktur

```
lib/minecraft/       Engine (kein React):
  engine.ts          Haupt-Loop, Input, Interaktion, Rendering-Orchestrierung
  world.ts           Chunk-Verwaltung + Lichtsystem (Flutfüllung)
  worldgen.ts        Biome, Terrain, Höhlen, Erze, Vegetation
  mesher.ts          Chunk-Geometrie mit AO + Smooth Lighting
  textures.ts        prozeduraler Textur-Atlas (16×16-Tiles)
  physics.ts         AABB-Kollision gegen die Voxel-Welt
  mobs.ts            Mob-Modelle, KI und Physik
  crafting.ts        Rezepte (geformt/formlos) + Schmelzen
  ...
components/minecraft/  React-UI: HUD, Inventar, Menüs, Debug-Overlay
app/page.tsx           Einstiegspunkt (Client-only)
```

---

Dieses Repository ist mit einem [v0](https://v0.app)-Projekt verknüpft:
[Weiter bei v0 →](https://v0.app/chat/projects/prj_9iVx7eoWeO11NlEZRPL3Qq7O50EN)
