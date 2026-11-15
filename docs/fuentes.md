# Fuentes

El registro completo (con "para qué nos sirve" y "cómo lo aplicamos") está en el documento compartido del equipo: "Space Apps 2026 · Registro de fuentes y referencias" (https://claude.ai/artifact/7MNM1VZHLvCrNUuGUpNyxj).

Regla: cada fuente nueva se agrega acá con una línea y en el registro completo.

| Dato | Fuente |
| --- | --- |
| Íconos de la barra del planificador (Maps in Mars) | Google, Material Icons (licencia Apache 2.0), github.com/google/material-design-icons: mismos trazos que el riel izquierdo |
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
| Rover presurizado (10 km/h; con dos o más vehículos, más de 125 millas ≈ 200 km en cualquier dirección; antes figuraba 125 km por error de unidades) | NASA Space Exploration Vehicle, ficha FS-2011-08-045-JSC |
| Agua en el subsuelo (DAN, 0 a 6,1%) | Mitrofanov et al. 2022 (PMC9788246) |
| Capa de yardangs (panorámica del sol 4982, teoría de ceniza volcánica) | NASA/JPL-Caltech/MSSS, PIA25629 (sol 4982, 11/8/2026): https://science.nasa.gov/photojournal/nasas-curiosity-captures-dawn-breaking-on-wind-carved-cliffs/ ; NASA, "Curiosity Rover Catches Stunning Martian Dawn" (ceniza volcánica como hipótesis) |
| Polvo fino y ultrafino en materiales de trajes | Perseverance PIXL/SHERLOC, PNAS, 27 de octubre de 2026 (VanBommel et al., PNAS, doi:10.1073/pnas.2620747123; NASA, "NASA's Perseverance Offers Clues to Protect Crews From Mars Dust") |
| Contexto regional THEMIS (falso color, 100 m/píxel) | NASA/JPL/ASU, PIA06814 (2004) |
| Mineralogía orbital del Monte Sharp (CRISM) | Sheppard et al. 2021, JGR Planets, doi:10.1029/2020JE006372; Rice et al. 2015, AGU P43D-2144 |
| Mosaicos CRISM de Gale para el aterrizaje (VNA, TRU, FM2, MAF, IRA, FAL, HYD, ALT; 19,3 m/píxel, equirectangular R=3396190) | Seelos, Seelos, Viviano y Murchie (JHU/APL), CRISM GMWG, 24/7/2012: crism.jhuapl.edu/msl_landing_sites/2012July_Mosaics/CRISM_GMWG_7-24-12_v2.pdf. Cubre la zona sol 5070 (verificado). Recortes y valores por parada en data/mineralogia/crism_sol5070/ |
| Hematita de Vera Rubin: CRISM frente a mediciones de Curiosity | Fraeman et al. 2020, JGR Planets, doi:10.1029/2019JE006294 |
| Límite de dosis de carrera (600 mSv) y por tormenta solar (250 mSv) | NASA-STD-3001 Vol. 1 [V1 4030] y [V1 4031]; resumen OCHMO-TB-020 (nasa.gov) |
| Dosis en el viaje (1,84 mSv/día; misión de referencia ~1,01 Sv) | RAD en crucero (Zeitlin et al. 2013), citado con Hassler et al. 2014 |
| Duración de una salida con traje (hasta 8 h, 6 ± 2 h) | NASA EVA-EXP-0075 (NTRS 20200001071); NTRS 20210000827 |
| Aviso ante tormentas solares (10 a 30 min; mínimo 30 min) | Parker et al., NASA Helio2050 (NTRS 20210014156). Base de nuestra regla "a no más de 30 min de un refugio" (supuesto) |
| Terreno y color de toda la travesía (4 m y 3 m) | Archivos del compañero del 14/11 (`travesia_sur_*.tif`), recortados con GDAL (`gdal_translate -projwin` sobre `/vsicurl/`). **Elevación:** USGS MSL_Gale_DEM_Mosaic_1m_v3 (Calef y Parker 2016), remuestreado a 4 m. **Color:** mosaico HiRISE a color de Gale de USGS/ASC, `https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_HiRISE-LRGB_78quads_sharp_cog.tif`, remuestreado a 3 m. Se recortó a la franja con color real (norte −270000 a −289000 m); fuera de ella no hay color. Dunas muy oscuras guardadas como 0 en el mosaico |
| Recorrido completo y 49 perforaciones (posición, sol, altura) | GeoPackage del compañero del 14/11 (`curiosity_recorrido_y_pozos.gpkg`). **Recorrido:** NASA, mapa en vivo de Curiosity, `https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json` (hasta sol 5073). **Posición de cada pozo:** último punto de `MSL_waypoints.json` en el sol de la perforación o antes; es donde estaba estacionado el rover, no el pozo exacto (error de pocos metros). **Nombres y soles de los pozos:** lista del equipo; 1 a 42 según PIA26403 (NASA/JPL-Caltech/MSSS, 2024), 43 a 49 según el blog de Curiosity |
| Qué es una perforación y qué se analiza (pozo de 16 mm; CheMin y SAM); pozo 42, Kings Canyon | NASA/JPL-Caltech/MSSS, PIA26403, "Curiosity's 42 Drill Holes" (27/8/2024) |
| Lutita de lago en Yellowknife Bay (pozos 1 y 2) | Vaniman et al. 2014, Science |
| Siderita en la unidad de sulfatos (pozos 36 a 39) | Tutolo et al. 2025, Science, doi:10.1126/science.ado9966 |
| Campaña del boxwork y pozos 43 a 48 | Blog de Curiosity: sols 4695-4701, 4709-4715, 4716-4722, 4798-4803, 4804-4811, 4879-4885, 4893-4899, 4900-4907, 5016-5021 |
| Hallazgos de los otros 37 pozos | Citas de memoria en `data/curiosity/perforaciones_hallazgos.json`, marcadas "a verificar" |
| Límites de inclinación del rover: aguanta 45° sin volcar, la protección de fallas lo frena antes de 30° | JPL, MSL "Planetary mobility" (copia de archivo): webarchive.library.unt.edu/eot2008/20090512223236/http://mars.jpl.nasa.gov/msl/mission/technology/planetarymobility |
| Récord de pendiente de Curiosity: 31° (Greenheugh, marzo de 2020) | NASA/JPL, 20/3/2020, "NASA's Curiosity Mars Rover Takes a New Selfie Before Record Climb": https://www.jpl.nasa.gov/news/nasas-curiosity-mars-rover-takes-a-new-selfie-before-record-climb/ |
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
| Gale Earth: línea de tiempo de misiones a Marte | NASA NSSDCA, Chronology of Mars Exploration (nssdc.gsfc.nasa.gov/planetary/chronology_mars.html) y comunicados de cada misión (fuente por evento en `maps-in-mars/datos/linea_tiempo.json`) |
| Gale Earth: edad y evolución del cráter Gale (estimado) | Thomson et al. 2011, Icarus 214; Le Deit et al. 2013, JGR Planets; Grotzinger et al. 2014 y 2015, Science; Kite et al. 2013, Geology |
| Gale Earth: fin de MAVEN, ESCAPADE y MMX (2025–2026) | NASA (03-06-2026, fin de MAVEN); NASA Science, misión ESCAPADE; ESA y DLR (lanzamiento de MMX, 19/20-10-2026) |
| Gale Earth: mineralogía, química y gases de las 49 perforaciones (Biblioteca) | NASA PDS (CheMin, APXS, SAM nivel 2); Gale Crater Mineralogy and Geochemistry Database (galecrater.samples.odr.io); fotos crudas NASA/JPL-Caltech/MSSS |
| Gale Earth: globo, mapa en color y pantalla de carga | CesiumJS (Apache 2.0); Cesium Mars (NASA, ESA, Cesium); Viking MDIM 2.1 color (NASA/USGS); CTX global (NASA/JPL/MSSS/Murray Lab); HRSC/MOLA Blend (USGS) |
| Gale Earth: cielo (Vía Láctea y estrellas) | Catálogo Hipparcos (ESA) y contorno de la Vía Láctea de J. R. Vieira, vía d3-celestial (BSD) |
| Gale Earth: clima diario de Gale (REMS, soles 10–4995, hasta 25-08-2026) | REMS (Centro de Astrobiología CSIC-INTA / NASA), resumen diario en mars.nasa.gov/rss/api/?feed=weather&category=msl. Es de divulgación: verificado contra los datos calibrados del PDS (PDS Atmospheres, `msl_rems_bundle`, calibrados hasta el sol 4843). `maps-in-mars/datos/clima_rems.json` |
| Gale Earth: radiación en superficie (valores publicados de RAD) | Hassler et al. 2014 (Science 343); Guo et al. 2015 (ApJ 810); Guo et al. 2021 (Astron. Astrophys. Rev. 29:8); NASA 10-06-2024 (tormenta solar del 20-05-2024). Los datos de RAD en PDS PPI (MSL-M-RAD-3-RDR-V1.0, hasta el sol 4843) son cuentas sin calibrar a dosis. `maps-in-mars/datos/radiacion.json` |
| Gale Earth: a qué muestra pertenece cada experimento SAM | Notas de nivel 2 de SAM ("designated CB6", etc.) y nombre de cada corrida en el registro de mensajes de nivel 0, NASA PDS Geosciences (msl-m-sam-2-rdr-l0-v1). Abreviaturas según Sutter et al. 2017 (JGR Planets 122). `maps-in-mars/datos/sam_revision.json` |
| Gale Earth: viento y humedad de Gale (lectura propia de los datos calibrados) | REMS, archivo oficial de NASA: PDS Atmospheres `msl_rems_bundle` (productos RMD) y su registro de eventos `document/DATA_EVENTS.TXT` (sensor de viento apagado desde el sol 2558). Daño del sensor al aterrizar: Viúdez-Moreiras et al. 2019, Icarus 319 (equipo de REMS, CAB). `maps-in-mars/datos/viento_humedad.json` |
| Gale Earth: química APXS de pozos nuevos (Mineral King a Nevado Sajama 2) | NASA PDS Geosciences, msl-m-apxs-4_5-rdr-v1 (óxidos, hasta el sol 4842). Asignación al pozo por el blog de Curiosity o primera medición después de perforar (probable). `maps-in-mars/datos/apxs_pds.json` |
| Gale Earth: experimento TMAH de Nevado Sajama 2 y estado de Campo Marte, Basque Lakes y Nazca | SAM nivel 2 (EID 25828-25830, PDS Geosciences); blog de Curiosity en science.nasa.gov (soles 4798-4803, 4900-4912, 5022-5035, 5043-5055), resumido con palabras propias |
| Gale Earth: alojamiento de las teselas (copia de nuestros datos derivados del USGS, sin datos nuevos) | Hugging Face, dataset público ChuchuTEA/gale-earth-teselas. Las fuentes de cada capa siguen en `terreno/meta.json` y en las filas USGS de arriba. |
| Expedición (paquete para-companero, hoy no visible en Gale Earth): relieve de la zona de 20 km | USGS Astrogeology, MSL_Gale_DEM_Mosaic_1m_v3 (Calef y Parker 2016), llevado a 5 m y resumido a 20 m (`maps-in-mars/herramientas/zona_expedicion.py`). Pendiente y cielo tapado: cálculo propio. |
| Expedición (paquete para-companero, hoy no visible en Gale Earth): pendiente de referencia de un rover tripulado | NASA NTRS 20250011301 (Apollo LRV as-traversed performance): el LRV fue diseñado para 20–23° en condiciones favorables, 25° máx., 9–13 km/h. Lunar y sin presurizar: solo referencia. https://ntrs.nasa.gov/citations/20250011301 |
| Expedición (paquete para-companero, hoy no visible en Gale Earth): tiempo de suitport | NASA, ficha Space Exploration Vehicle FS-2011-08-045-JSC: los suitports permiten ponerse el traje y salir en menos de 10 min. https://www.nasa.gov/wp-content/uploads/2015/08/464826main_sev_factsheet_508.pdf |
| Expedición (paquete para-companero, hoy no visible en Gale Earth): por qué falta la capa de arena | Arvidson et al. 2017 (cruces de megaripples hasta el sol 710) y Bryk et al. 2021, JGR Planets (Hidden Valley, 2014: Curiosity abandonó el cruce por el patinaje de las ruedas). La arena es un peligro real que no tenemos mapeado para toda la zona. |
| Expedición (paquete para-companero, hoy no visible en Gale Earth): indicio de arena (frío de noche) | USGS Astrogeology, THEMIS Night IR Controlled Mosaic Aeolis 30S135E 100 m/px v2 (2014), Mars Odyssey; producto cualitativo (Edwards et al. 2011, JGR 116 E10009). https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/THEMIS_controlled_mosaics/Aeolis_NightIR_31Jan2014/ . Qué significa lo frío de noche: Fergason (USGS) y Fergason et al. 2006, JGR 111 E12004. |
| Expedición (paquete para-companero, hoy no visible en Gale Earth): velocidad y autonomía del rover presurizado en Marte | NASA SP-2009-566, Human Exploration of Mars, Design Reference Architecture 5.0 (Drake, ed.), p. 41 y 43: 2 tripulantes, ~100 km, ~2 semanas, 3 km/h de diseño. https://www.nasa.gov/pdf/373665main_NASA-SP-2009-566.pdf |
| Expedición (paquete para-companero, hoy no visible en Gale Earth): gasto del traje y caminata en gravedad de Marte | Ogilvie et al., Mars Spacesuit Mass Requirements, ICES-2026 (NASA JSC), NTRS 20260003038: 1200 BTU/h para dimensionar, ≈1700 BTU/h caminando a 3,6 km/h (datos de Norcross et al. 2009, NASA/TP-2009-214796), salida a pie máxima recomendada de 1 h o 3,5 km. |
| Expedición (paquete para-companero, hoy no visible en Gale Earth): tormenta solar | NASA, 10/6/2024, "NASA Watches Mars Light Up During Epic Solar Storm": 8.100 µGy junto a Curiosity (RAD) el 20/5/2024; no es mortal; los acantilados dan protección extra. |
| Expedición (paquete para-companero, hoy no visible en Gale Earth): blindaje de un rover y de un refugio | Kim et al. (NASA Langley), WRMISS 2012: cabina de rover con paredes de 1 g/cm². Clowdsley (NASA), Lunar Radiation, NTRS 20210009760: apuntar a 20 g/cm² de blindaje en un refugio. |
| Gale Earth: variación día/noche de la radiación | Rafkin et al. 2014, JGR Planets 119:1345, https://doi.org/10.1002/2013JE004525 (~5 % de pico a pico, más dosis de día); Guo et al. 2015, ApJ 810:24. |
| Gale Earth: fecha marciana (Ls y año marciano) | Allison y McEwen 2000, Planet. Space Sci. 48:215 (algoritmo Mars24 de NASA GISS); Clancy et al. 2000, JGR 105:9553 (año marciano 1 = 11/4/1955). |
| Gale Earth: minerales desde órbita | CRISM (MRO, NASA/JHU-APL), mosaicos GMWG de Gale 2012 (Seelos et al.), https://crism.jhuapl.edu/msl_landing_sites/ ; recorte y percentiles en data/mineralogia/crism_contexto (David). |
| Gale Earth: fuentes oficiales de cada pozo | Base de mineralogía y geoquímica del cráter Gale (equipo CheMin), https://doi.org/10.48484/JN48-YW52 ; NASA PDS Geosciences, https://pds-geosciences.wustl.edu/missions/msl/index.htm ; NASA, "Curiosity's 42 Drill Holes" (PIA26403), https://science.nasa.gov/photojournal/curiositys-42-drill-holes/ |
| Gale Earth: colores de altitud de todo Marte | USGS Astrogeology, Mars MGS MOLA - MEX HRSC Blended DEM Global 200 m, https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blended_dem_global_200m (desde nuestras teselas, datum de esfera 3396,19 km). |
| Gale Earth: infrarrojo nocturno de todo Marte | USGS Astrogeology, THEMIS Night IR Controlled Mosaics 100 m v2 (2018), vista previa a 2 km: https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/THEMIS_controlled_mosaics/AA_mosaics/ |
| Gale Earth: topónimos | IAU/USGS, Gazetteer of Planetary Nomenclature, https://planetarynames.wr.usgs.gov/ (exportación MARS_nomenclature.csv, copia en github.com/planetserver/ps2-www-client). |
| Gale Earth: día y noche en Marte | Allison y McEwen 2000 (Mars24, NASA GISS), https://www.giss.nasa.gov/tools/mars24/ |
| Por qué se eligió Gale (diversidad de capas con minerales vistos desde órbita al pie del Monte Sharp) | Golombek et al. 2012, Space Science Reviews 170:641-737, doi:10.1007/s11214-012-9916-y; NASA, 12/4/2012, "Gale Crater: Exploring the Mars Science Laboratory Landing Site" |
| Primer pozo: Gale tuvo un lago de agua dulce habitable | NASA/JPL 2013, "Curiosity Rover Hits Paydirt" (science.nasa.gov/resource/curiosity-rover-hits-paydirt); Vaniman et al. 2014, doi:10.1126/science.1243480 |
| Moléculas orgánicas más grandes de Marte (Cumberland, 2025) | NASA/JPL, 24/3/2025 |
| Pozos 43 a 47 y entrada a la unidad de sulfatos | Blog de Curiosity, sols 4709-4715, 4804-4811, 4893-4899 y 4845-4851 (science.nasa.gov/blog) |

| Texturas globales de Fobos y Deimos (lunas del globo) | NASA 3D Resources, "Images and Textures/Mars - Phobos" y "Mars - Deimos" (github.com/nasa/NASA-3D-Resources, sin copyright); reescaladas a 2048×1024 |
| Zonas prohibidas por pendiente en todo Marte (cálculo propio) | HRSC-MOLA Blended DEM 200 m (USGS Astrogeology), teselas del globo nivel 7; límites de pendiente de data/parametros.json |
| Manchas de minerales (CRISM) y su justificación | Mosaicos CRISM del cráter Gale (Seelos et al. 2012, NASA/JHU-APL, crism.jhuapl.edu/msl_landing_sites); Milliken et al. 2010, GRL 37 L04201 (doi:10.1029/2009GL041870); Fraeman et al. 2013, Geology 41(10) (authors.library.caltech.edu/records/05bm4-2ke51); Fraeman et al. 2016, JGR Planets 121 (doi:10.1002/2016JE005095); CheMin, NASA PDS Geosciences |
| Lugares clave (Olympus Mons, Hellas, Jezero, Gusev, Endeavour) | Nombres, centros y diámetros: IAU / USGS Gazetteer of Planetary Nomenclature; textos: NASA Science (PIA00300, PIA21570, páginas de las misiones Perseverance, Spirit y Opportunity); contornos: cálculo propio sobre HRSC-MOLA Blend 200 m (USGS) |
| SR-1 Freedom (línea de tiempo) | NASA, nasa.gov/mission/space-reactor-1-freedom; hoja "America Underway in Space on Nuclear Power" (NASA, 24/3/2026) |
| odr_gale_56_fichas.json (escritorio de la PC, no versionado) | Copia de las 56 fichas CheMin de la base del cráter Gale (galecrater.samples.odr.io, doi:10.48484/JN48-YW52): de ahí salen los enlaces "ODR" de la Biblioteca |
| Modelos 3D de MRO y Mars Odyssey | NASA 3D Resources (github.com/nasa/NASA-3D-Resources): "Mars Reconnaissance Orbiter (MRO) (C)" y "Mars Odyssey", .glb, sin copyright |
| Relieve fino de Jezero (20 m) | NASA/JPL Mars 2020, M20_JezeroCrater_CTXDEM_20m.tif (Science Investigation Maps), servidor USGS Astrogeology: asc-pds-services, mosaic/mars2020_trn/CTX/ScienceInvestigationMaps_JPL/ |
| Agua en el primer metro del suelo (todo Marte, medido) | NASA PDS Geosciences, Mars Odyssey GRS, ODY-M-GRS-5-ELEMENTS-V1.0, H2O_SR_5X5.TAB (2002-2005); Boynton et al. 2007, JGR 112, E12S99 |
| Verificación de los hallazgos de los 49 pozos (15/11/2026) | Treiman 2016 (doi:10.1002/2015JE004932); Rampe 2017 (doi:10.1016/j.epsl.2017.04.021); Morris 2016 (doi:10.1073/pnas.1607098113); Yen 2017 (doi:10.1016/j.epsl.2017.04.033); Bristow 2018 (doi:10.1126/sciadv.aar3330); Ehresmann 2021 (doi:10.1029/2021JE006851); Rampe 2020 (doi:10.1029/2019JE006306); Thorpe 2022 (doi:10.1029/2021JE007099); Rudolph 2022 (doi:10.1029/2021JE007098); Bennett 2023 (doi:10.1029/2022JE007185); Chipera 2023 (doi:10.1029/2023JE008041); Treiman 2023 (doi:10.3390/min13091122); Tutolo 2025 (doi:10.1126/science.ado9966); Freissinet 2015 (doi:10.1002/2014JE004737) y 2025 (doi:10.1073/pnas.2420580122); Williams 2026, Nature Communications 17:2748 (doi:10.1038/s41467-026-70656-0); Abbey 2020, Icarus 350:113885; blog de Curiosity y páginas de NASA/JPL de cada pozo |
| Química APXS de cada pozo (corregida) | NASA PDS Geosciences, APXS RDR msl-m-apxs-4_5-rdr-v1 (data/solNNNNN/apb_*rwp*_p1.csv) y registro de actividades extras/msl_apxs_activities_*.csv: https://pds-geosciences.wustl.edu/msl/msl-m-apxs-4_5-rdr-v1/mslapx_1xxx/ |

En la escena, cada una tiene su círculo "?" que abre la fuente (registro `FUENTES_URL` en `escena3d/plantilla.html`).

| Distancia total de Curiosity: más de 38,07 km (23,65 millas) al 12/10/2026 | NASA Science, blog de Perseverance, 12/10/2026, "NASA's Perseverance Sets Off-World Record for Total Distance Driven" (science.nasa.gov) |
| Fichas de las 49 perforaciones en la escena (hallazgo, CheMin, APXS, SAM, fotos, agua en minerales) | Biblioteca de Gale Earth (`maps-in-mars/datos/biblioteca.json`, del compañero), que sale del PDS (CheMin, APXS, SAM), la base ODR (Bristow y Lafuente, doi:10.48484/JN48-YW52), artículos y el blog de Curiosity; fotos crudas NASA/JPL-Caltech/MSSS |

| Demora de la luz Tierra–Marte (misión en pareja y wiki) | NASA JPL Solar System Dynamics, "Approximate Positions of the Planets" (elementos de Standish, 1800–2050); cálculo propio de la distancia y del tiempo de la luz |

| Base Gale: lugar (Zona 2 de tres centros con círculo libre de 250 m en la llanura del aterrizaje) | Análisis de sitios del equipo, 15/11 (`data/base/sitios_base.geojson`): DEM USGS de Gale 1 m (Calef y Parker 2016) a 4 m, HiRISE color a 3 m, pendiente < 10° en 20 m (Calef 2015), 1 km del recorrido y 2 km de los hitos (supuesto, analogía NASA 2011, sitios Apollo). Cálculo propio, umbrales provisorios |
| Modelos 3D de la misión en Gale Earth (Curiosity, GX-2, PMR, astronauta, Base Gale) | Diseño propio del equipo, exportado de la escena con el GLTFExporter de three.js r170 (MIT, `escena3d/vendor/GLTFExporter.js`); `herramientas/exportar_mision.py` |
| Base Gale: hábitat con blindaje de hielo (idea) | NASA Langley 2016, Mars Ice Home (phys.org/news/2016-12-nasa-ice-house-mars.html) |
| Base Gale: reactor de fisión de al menos 40 kW | NASA Glenn, Fission Surface Power (nasa.gov/centers-and-facilities/glenn/nasas-fission-surface-power-project-energizes-lunar-exploration) |
| Base Gale: oxígeno del CO₂ (122 g en 16 corridas, hasta 12 g/h) | NASA 2023, MOXIE (phys.org/news/2023-09-nasa-oxygen-generating-moxie-mars-mission.html) |
| Base Gale: suitports (salida en menos de 30 min, sin polvo adentro) | NASA JSC 2012, NTRS 20120018014 |
| Rover GX-2: taladro de 2 m, tres barras de ~50 cm, muestras cada 50 cm | ESA Exploration Science, ExoMars Rosalind Franklin (explorationscience.esa.int/?p=2323) |
| Rover GX-2: avance de 0,3 a 30 mm/min, menos de 100 W, prueba a 1,7 m | ESA 2021, "First deep drilling success for ExoMars" (esa.int) |
| Curiosity perfora 6,4 cm | NASA, "Curiosity's First Sample Drilling" (science.nasa.gov/resource/curiositys-first-sample-drilling) |
| Rover GX-2: dron (72 vuelos, ~128,8 min, 17 km) | NASA, Ingenuity Mars Helicopter (science.nasa.gov/mission/mars-2020-perseverance/ingenuity-mars-helicopter/) |
| Rover GX-2: MMRTG de ~110 W al empezar | NASA, hoja técnica del MMRTG (science.nasa.gov/wp-content/uploads/2024/02/mmrtg-factsheet-updated-5-18-20-1.pdf) |
| PMR (rover presurizado, antes GX-3): cabina para 2 (4 en emergencia), hasta 14 días, ~10 km/h, 12 ruedas que giran 360°, suitports (menos de 10 min), esclusa con 2,5 cm de agua congelada, protección hasta 72 h; SEV de 4,5 m × 3 m | NASA, hoja técnica del Space Exploration Vehicle (nasa.gov/wp-content/uploads/2015/08/464826main_sev_factsheet_508.pdf) |
| PMR (rover presurizado, antes GX-3): batería (60 a 200 kWh), 5.193 kg con 60 kWh (+933 kg por 140 kWh), 8 km/h, 1,85 kW de cabina, carga a 3 kW con el reactor, panel de 3,5 kW | NASA Mars Architecture Team, Chappell et al., "Human Mars Surface Mission Surface Power Impacts on Timeline and Traverse Capabilities", IEEE Aerospace 2022 (ntrs.nasa.gov/citations/20210022250) |
| PMR (rover presurizado, antes GX-3): manejar suma ~5 kW a los ~2 kW de la cabina | NASA, "Human Mars Surface Mission Nuclear Power Considerations", IEEE Aerospace 2018 (ntrs.nasa.gov/citations/20170006519) |
| Ruta T (Base Gale → zona de hoy), energía y tiempo del PMR | Cálculo propio: `herramientas/ruta_base.py` (A* sobre data/terreno/travesia_sur, parámetros en data/parametros.json → vehiculo_tripulado; eficiencia de motores 0,8 supuesta) → `data/rutas/ruta_base_gx3.geojson` |

**Todos los enlaces de los círculos "?" están en `docs/fuentes-enlaces.md`** (se regenera con `python herramientas/listar_fuentes.py`).
| Relieve de todo Marte (fondo de la escena: alrededores de Gale y el planeta) | MOLA MEGDR 16 píxeles/grado, megt90n000eb.img (MGS MOLA, Smith et al. 2003, NASA PDS Geosciences Node). Copia pública: github.com/benbrittain/Barsoom (data/MEGDR). Control: −4509 m en el sitio de aterrizaje (publicado −4501 m); contra el DEM de la travesía, +5 ± 41 m |
| Color de todo Marte (fondo de la escena) | Viking MDIM 2.1 en color (NASA/USGS, Mars Trek), `maps-in-mars/capas/viking_color_8k.jpg` (2,6 km/píxel), con realce de color propio |
| Imagen CTX alrededor de Gale (fondo de la escena, ~40 m cerca y ~330-650 m en la región) | Mosaico global CTX de 5 m (NASA/JPL/MSSS; Murray Lab, Caltech), servicio NASA–Esri astro.arcgis.com/arcgis/rest/services/OnMars/CTX (el mismo que usa Gale Earth). Se baja con `herramientas/bajar_ctx.py` o en vivo; el color sale del Viking |
| PMR: la cabina de un rover para salidas tiene paredes de ~1 g/cm² (por eso adentro contamos la misma dosis que afuera) | Kim et al. (NASA), WRMISS 2012 (emmrem.unh.edu/papers/general/WRMISS12_MK.pdf) |
| PMR: un refugio de tormenta solar necesita ~20 g/cm² de blindaje (ante una tormenta se vuelve a la Base Gale) | Clowdsley (NASA), radiación lunar (ntrs.nasa.gov/citations/20210009760) |
| Guía del PMR: sismómetro en las paradas (InSight detectó 1.319 sismos) | NASA JPL 2022, retiro de InSight (jpl.nasa.gov/news/nasa-retires-insight-mars-lander-mission-after-years-of-science) |
| Guía del PMR: magnetómetro en las paradas (InSight midió ~2.000 nT en superficie, diez veces lo previsto) | Eos 2022, con Johnson et al. 2020, Nature Geoscience (eos.org/articles/more-than-marsquakes-insight-yielded-magnetism-weather-discoveries) |
| Guía del PMR: a pie se perfora hasta 2 m con un taladro portátil (Apolo 15, 16 y 17: un astronauta hizo pozos de hasta 3 m y testigos de 2 a 3 m) | NASA ALSJ, Working on the Moon: Drilling (nasa.gov/history/alsj/WOTM/WOTM-Drilling.html) |
| Guía del PMR: rutas más seguras del vehículo y de la persona, tiempo, dosis, batería y tiempo al refugio | Cálculo propio en el navegador (`maps-in-mars/pmr.js`): A* sobre `maps-in-mars/datos/terreno_pmr.png` (celdas de 12 m, de `herramientas/terreno_pmr.py`: elevación del equipo, igual al DEM USGS de Gale, Calef y Parker 2016; arena probable por color, indicio propio). Límites y velocidades de data/parametros.json; trabajo de 45 min por parada y estacionamiento a 130 m: supuestos |
