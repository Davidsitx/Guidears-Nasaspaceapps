# Las cuatro capas del mapa (propuesta revisada)

Partimos de una propuesta de NotebookLM y la corregimos con fuentes.

## 1. Navegación y seguridad (elevación + HiRISE)
- Pendiente: el límite de 5° NO es de caminata. Viene de los criterios de aterrizaje de MSL (pendientes dentro de la elipse). Usamos:
  - astronauta: 20° (requisito lunar Artemis; a validar para Marte, NTRS 20210026296);
  - vehículo: 20° provisorio (Curiosity llegó a 24° en agosto de 2026).
- Peligro mecánico: arena y dunas (patinaje del rover; hundimiento del traje), terreno rocoso anguloso (desgaste de ruedas).

## 2. Sombra de radiación (RAD)
- Murray Buttes, 19% del cielo bloqueado: la dosis bajó 4–5% y las partículas neutras 7,5% (Ehresmann et al. 2021; Guo et al. 2021). En otros terrenos, hasta 19% (DLR 2026).
- Matiz: junto a un acantilado sube la radiación reflejada por la roca (albedo). La reducción neta es moderada.
- Implementado en el planificador como "cielo bloqueado" con factor 0,25.

## 3. Recursos in situ (agua)
- DAN mide hidrógeno equivalente a agua en los primeros 50–60 cm del suelo. Catálogo publicado del sol 3 al 3333 (27 km): de casi 0 a 6,1% en peso (Mitrofanov et al. 2022, PMC9788246).
- Limitación: el catálogo publicado no llega a la zona actual. Uso posible: mostrar el perfil de agua a lo largo del recorrido histórico y marcar las venas de sulfato de calcio y los pozos como puntos de interés de recursos.

## 4. Exploración científica y regreso
- Cada parada con motivo científico (docs/ciencia.md).
- Regla de regreso: el astronauta no se aleja más de un radio máximo del refugio o del rover presurizado. Referencia lunar: 1,38 km caminando (NTRS 20210026296). Nuestra ruta del sol 5070 mide 1,50 km de ida: hay que acortarla o usar el rover como refugio móvil.
