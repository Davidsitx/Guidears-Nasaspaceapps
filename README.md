# Maps in Mars — Martian Map: rover vs. astronaut routes from Curiosity's current position

NASA Space Apps Challenge 2026 · Challenge: *Interplanetary Survival Guide: Martian Map* · Local event: San Luis, Argentina.

We compare two ways of exploring the same real Martian terrain, starting where NASA's Curiosity rover is today (sol 5070, Gale crater):

- **Vehicle layer:** a rover route constrained by slope, sand, wheel wear and a daily energy budget.
- **Astronaut layer:** a walking route constrained by suit slope limits, walking time and radiation dose, using terrain shadow to reduce exposure.

Every stop is tied to a current science question of the Curiosity team.

## Contents
- `prototipo/planificador/` — 2D route planner (open `index.html` in a browser).
- `data/` — Curiosity traverse, stops, current position and draft routes (GeoJSON).
- `herramientas/` — scripts to build terrain grids and the MMGIS mission config.
- `docs/` — science rationale, rover health, sources and tasks (Spanish, internal).
- `CLAUDE.md` — shared context for the team's AI assistants.

## Data sources (main)
- Curiosity localization (PLACES), PDS Geosciences Node.
- Orbital DEM from MSL PLACES bundle; USGS Gale merged DEM (Calef & Parker, 2016).
- Curiosity mission blog, NASA (science.nasa.gov).
- RAD radiation measurements (Hassler et al., 2014); terrain shielding (DLR, JGR Planets 2026).
- NASA "Where is Curiosity?" map for the current position.
- Full traverse color: USGS/ASC HiRISE color mosaic of Gale (`MSL_Gale_HiRISE-LRGB_78quads_sharp_cog.tif`).
- Full traverse and drill-hole positions: NASA MSL live map feeds (`MSL_traverse.json`, `MSL_waypoints.json`).
- Topografía (relieve, altura, modelos de elevación) MOLA, HRSC, CTX, HiRISE
- Imagen (fotografía visible) HiRISE, CTX, HRSC, CaSSIS, MOC
- Composición/termal (minerales, temperatura, propiedades de la superficie) THEMIS, CRISM, OMEGA, TES
- Agua y hielo / subsuelo SHARAD, MARSIS, GRS, FREND
- Atmósfera y clima MCS, MAVEN, EMIRS/EXI
- Full source register: `docs/fuentes.md`.

## License

Our code and documents are released under the **Apache License 2.0** (see [`LICENSE`](LICENSE)).

Third-party components keep their own licenses:
- three.js r170 (MIT), bundled in `escena3d/vendor/` with `LICENSE-three-MIT.txt`.
- CesiumJS 1.147 (Apache 2.0), loaded from jsDelivr by `maps-in-mars/`.
- Star catalog and Milky Way outline via d3-celestial (BSD), see `maps-in-mars/README.md`.

NASA, USGS and ESA data are used under their public data policies and are credited in `docs/fuentes.md`. The "ER-6 Terrain Explorer" simulator was visual inspiration only; no code was copied.
