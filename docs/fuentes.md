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
| Terreno y color de toda la travesía (4 m y 3 m) | Archivos del equipo del 14/11 (`travesia_sur_*.tif`). La elevación coincide con el DEM USGS de Gale (Calef y Parker 2016). **Origen exacto del mosaico de color: a confirmar** |
| Recorrido completo y 49 perforaciones (posición, sol, altura) | GeoPackage del equipo del 14/11 (`curiosity_recorrido_y_pozos.gpkg`). **Origen exacto: a confirmar** |
| Qué es una perforación y qué se analiza (pozo de 16 mm; CheMin y SAM); pozo 42, Kings Canyon | NASA/JPL-Caltech/MSSS, PIA26403, "Curiosity's 42 Drill Holes" (27/8/2024) |
| Lutita de lago en Yellowknife Bay (pozos 1 y 2) | Vaniman et al. 2014, Science |
| Siderita en la unidad de sulfatos (pozos 36 a 39) | Tutolo et al. 2025, Science, doi:10.1126/science.ado9966 |
| Campaña del boxwork y pozos 43 a 48 | Blog de Curiosity: sols 4695-4701, 4709-4715, 4716-4722, 4798-4803, 4804-4811, 4879-4885, 4893-4899, 4900-4907, 5016-5021 |
| Hallazgos de los otros 37 pozos | Citas de memoria en `data/curiosity/perforaciones_hallazgos.json`, marcadas "a verificar" |
| Límites de inclinación del rover: aguanta 45° sin volcar, la protección de fallas lo frena antes de 30° | JPL, MSL "Planetary mobility" (copia de archivo): webarchive.library.unt.edu/eot2008/20090512223236/http://mars.jpl.nasa.gov/msl/mission/technology/planetarymobility |
| Récord de pendiente de Curiosity: 31° (Greenheugh, marzo de 2020) | Space.com, space.com/mars-rover-curiosity-steepest-hill-selfie-photo.html |
| Inclinación máxima de 25,3° en los primeros 7 años | JPL Robotics 2020, www-robotics.jpl.nasa.gov/media/documents/2020-mobility-trending.pdf |
| Rocker-bogie limitado a menos de 15° en suelo suelto (regla de la arena) | JPL 2023, póster R22016 (scienceandtechnology.jpl.nasa.gov) |
| Traje: pendientes de hasta 20°; Apolo 15 sobre ~17° | NASA EVA-EXP-0075, NTRS 20200001071 |
| Límite de carrera de 600 mSv | NASA OCHMO, radiation-protection-technical-brief (NASA-STD-3001) |
| Aviso de tormenta solar del orden de 30 min | Parker et al., NTRS 20210014156 |
| Clima de Gale por estación (REMS): de +15,9 °C a −100 °C; invierno limpio, polvo en primavera y verano, viento en otoño | NASA/Astronomy (astronomy.com/?p=37721); ciclos estacionales: science.nasa.gov/photojournal/seasonal-cycles-in-curiositys-first-two-martian-years |
| Temporada de polvo desde Ls 180; mes 11 del año marciano 33 (Ls 300–330): media −42 °C, máx. ≈ −9 °C, mín. ≈ −69 °C; año marciano 1 = 11/4/1955 | Centro de Astrobiología, informes REMS (cab.inta-csic.es/rems/weather-report-mars-year-33-month-11) |
| Presión al aterrizar (Ls 151): ~685 a ~780 Pa en el día | Live Science 2012, citando a J. Gómez-Elvira (REMS) |
| Temporadas de baja (Ls 60–140) y alta opacidad (Ls 180–360) | Vicente-Retortillo et al. 2017, GRL, doi:10.1002/2017GL072589 |
| Hielo de agua ~25% de la opacidad en Ls 90–135 | Lemmon et al., registro de opacidad de MSL (arXiv:2309.07378) |
| Tormenta global de 2018 en Gale: opacidad 8,5, ~97% del UV bloqueado | Guzewich et al. 2019, NTRS 20190001691 |
| Remolinos de polvo con máximo cerca de Ls 300 | Dust lifting over six Mars years at Gale (Deep Blue, U. Michigan) |
| Ls a partir de la fecha | Algoritmo de Allison y McEwen 2000 (el de Mars24 de NASA GISS); control: Ls 150,7 el día del aterrizaje (publicado: 151) |
| Aeolus, orbitador del clima marciano (2028): viento, temperatura, polvo y nubes, al menos un año marciano | NASA, comunicado del 17/6/2026 (nasa.gov/news-release/nasa-announces-public-private-partnership-to-advance-mars-science); Space.com |
| Humanos a Marte "ya en la década de 2030"; arquitectura Luna a Marte | nasa.gov/humans-in-space/humans-to-mars; nasa.gov/moontomarsarchitecture-components |
| Dónde bajar datos de Curiosity | PDS Atmospheres Node (REMS); PDS Analyst's Notebook (an.rsl.wustl.edu); PDS Geosciences Node (pds-geosciences.wustl.edu/missions/msl) |
| Mineralogía de Gale con CRISM (enlace del "?") | Seelos et al. 2014, GRL, doi:10.1002/2014GL060310 |
| Gale Earth: órbitas de MRO, Odyssey, Mars Express, TGO y Hope; Fobos y Deimos | JPL Horizons (ssd.jpl.nasa.gov), elementos osculadores respecto de Marte (500@499), plano IAU_MARS, época 2026-11-14 TDB. Propagados como órbita de Kepler (cálculo propio) |
| Gale Earth: tamaño de Fobos y Deimos, fechas de descubrimiento | NASA NSSDCA, Mars Fact Sheet; NASA Science, Mars Moons |
| Gale Earth: línea de tiempo de misiones a Marte | NASA NSSDCA, Chronology of Mars Exploration (nssdc.gsfc.nasa.gov/planetary/chronology_mars.html) y comunicados de cada misión (fuente por evento en `gale-earth/datos/linea_tiempo.json`) |
| Gale Earth: edad y evolución del cráter Gale (estimado) | Thomson et al. 2011, Icarus 214; Le Deit et al. 2013, JGR Planets; Grotzinger et al. 2014 y 2015, Science; Kite et al. 2013, Geology |
| Gale Earth: fin de MAVEN, ESCAPADE y MMX (2025–2026) | NASA (03-06-2026, fin de MAVEN); NASA Science, misión ESCAPADE; ESA y DLR (lanzamiento de MMX, 19/20-10-2026) |
| Gale Earth: mineralogía, química y gases de las 49 perforaciones (Biblioteca) | NASA PDS (CheMin, APXS, SAM nivel 2); Gale Crater Mineralogy and Geochemistry Database (galecrater.samples.odr.io); fotos crudas NASA/JPL-Caltech/MSSS |
| Gale Earth: globo, mapa en color y pantalla de carga | CesiumJS (Apache 2.0); Cesium Mars (NASA, ESA, Cesium); Viking MDIM 2.1 color (NASA/USGS); CTX global (NASA/JPL/MSSS/Murray Lab); HRSC/MOLA Blend (USGS) |
| Gale Earth: cielo (Vía Láctea y estrellas) | Catálogo Hipparcos (ESA) y contorno de la Vía Láctea de J. R. Vieira, vía d3-celestial (BSD) |

En la escena, cada una tiene su círculo "?" que abre la fuente (registro `FUENTES_URL` en `escena3d/plantilla.html`).
