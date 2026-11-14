# Fuentes

El registro completo (con "para qué nos sirve" y "cómo lo aplicamos") está en el documento compartido del equipo: "Space Apps 2026 · Registro de fuentes y referencias" (https://claude.ai/artifact/7MNM1VZHLvCrNUuGUpNyxj).

Regla: cada fuente nueva se agrega acá con una línea y en el registro completo.

| Dato | Fuente |
| --- | --- |
| Recorrido de Curiosity (PLACES, hasta sol 4868) | PDS Geosciences Node, MSL PLACES, localized_interp.csv |
| Modelo de elevación orbital (hasta sol 3958) | PDS Geosciences Node, MSL PLACES, msl_orbital_dem.img |
| Modelo de elevación de Gale de 1 m | USGS Astrogeology, MSL Gale Merged DEM 1 m v3 (Calef y Parker, 2016). Recorte de la zona del sol 5070 en `data/terreno/sol5070/` (herramientas/recortar_terreno.py) |
| Ortoimagen de Gale de 25 cm (HiRISE, escala de grises) | USGS Astrogeology, MSL_Gale_Orthophoto_Mosaic_25cm_v3 (Calef y Parker, 2016), planetarymaps.usgs.gov/mosaic/Mars/MSL/. Usada como `orto.jpg` (0,5 m) del terreno del sol 5070 |
| Posición del sol 5070 | NASA, "Where is Curiosity?" |
| Blog de la misión (2025–2026) | science.nasa.gov/blog (ver docs/ciencia.md) |
| Dosis de radiación en superficie (0,64 ± 0,12 mSv/día; antes usamos 0,67 por error) | Hassler et al., 2014, Science (RAD), doi:10.1126/science.1244797 |
| Blindaje por relieve | DLR, JGR Planets 2026 (elib.dlr.de/224554) |
| Energía y ruedas del rover | ver docs/rover-salud.md |
| MMGIS | NASA-AMMOS/MMGIS (Apache 2.0) |
| Motor 3D de la escena | three.js r170 (MIT), copia en escena3d/vendor/ con su licencia |
| Velocidad de caminata según pendiente (escena 3D) | Función de Tobler (Tobler, 1993), normalizada a la velocidad en llano de data/parametros.json. Es terrestre: provisoria |
| Límite de pendiente del astronauta (20°) y alcance de caminata (1,38 km) | NASA NTRS 20210026296 (EVA lunar, Artemis) |
| Radiación junto a relieve | Ehresmann et al. 2021 (doi:10.1029/2021JE006851); Guo et al. 2021 (doi:10.1029/2021GL093912) |
| Rover presurizado (10 km/h, 125 km) | NASA Space Exploration Vehicle, ficha FS-2011-08-045-JSC |
| Agua en el subsuelo (DAN, 0 a 6,1%) | Mitrofanov et al. 2022 (PMC9788246) |
| Capa de yardangs (panorámica del sol 4982, teoría de ceniza volcánica) | NASA/JPL-Caltech/MSSS, imagen del día (enlace pendiente) |
| Polvo fino y ultrafino en materiales de trajes | Perseverance PIXL/SHERLOC, PNAS, 27 de octubre de 2026 (VanBommel et al.; DOI pendiente) |
| Contexto regional THEMIS (falso color, 100 m/píxel) | NASA/JPL/ASU, PIA06814 (2004) |
| Mineralogía orbital del Monte Sharp (CRISM) | Sheppard et al. 2021, JGR Planets, doi:10.1029/2020JE006372; Rice et al. 2015, AGU P43D-2144 |
| Mosaicos CRISM de Gale para el aterrizaje (VNA, TRU, FM2, MAF, IRA, FAL, HYD, ALT; 19,3 m/píxel, equirectangular R=3396190) | Seelos, Seelos, Viviano y Murchie (JHU/APL), CRISM GMWG, 24/7/2012: crism.jhuapl.edu/msl_landing_sites/2012July_Mosaics/CRISM_GMWG_7-24-12_v2.pdf. Cubre la zona sol 5070 (verificado). Recortes y valores por parada en data/mineralogia/crism_sol5070/ |
| Hematita de Vera Rubin: CRISM frente a mediciones de Curiosity | Fraeman et al. 2020, JGR Planets, doi:10.1029/2019JE006294 |
| Límite de dosis de carrera (600 mSv) y por tormenta solar (250 mSv) | NASA-STD-3001 Vol. 1 [V1 4030] y [V1 4031]; resumen OCHMO-TB-020 (nasa.gov) |
| Dosis en el viaje (1,84 mSv/día; misión de referencia ~1,01 Sv) | RAD en crucero (Zeitlin et al. 2013), citado con Hassler et al. 2014 |
| Duración de una salida con traje (hasta 8 h, 6 ± 2 h) | NASA EVA-EXP-0075 (NTRS 20200001071); NTRS 20210000827 |
| Aviso ante tormentas solares (10 a 30 min; mínimo 30 min) | Parker et al., NASA Helio2050 (NTRS 20210014156). Base de nuestra regla "a no más de 30 min de un refugio" (supuesto) |
