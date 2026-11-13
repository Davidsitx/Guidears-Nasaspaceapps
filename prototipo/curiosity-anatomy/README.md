# Curiosity en la mesa de inclinación

Figura interactiva (`index.html`): Curiosity sobre una mesa de pruebas que se inclina de 0° a 28°. La lectura compara la pendiente con el límite provisorio de nuestra capa vehículo (20°) y con lo máximo que se inclinó Curiosity (24°, agosto de 2026).

- Hecha con **Anatomy** (https://github.com/wheresryan22/anatomy), licencia MIT; copia de la licencia en `LICENSE-anatomy-MIT.txt`. La página incluye código del kit.
- `build.mjs` es nuestro script; para regenerar, copiarlo a `examples/curiosity/` dentro de un clon de Anatomy y correr `node build.mjs`.
- Medidas del rover aproximadas (unos 3 m de largo, 2,8 m de ancho, 2,2 m de alto, ruedas de 50 cm). Fuentes de los límites: ver docs/rover-salud.md y docs/capas.md.
- Limitación conocida: el transportador queda en parte bajo la mesa; la lectura de la tarjeta es la referencia.
