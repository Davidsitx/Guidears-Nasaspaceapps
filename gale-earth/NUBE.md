# Teselas de Gale Earth en la nube (Cloudflare R2)

Objetivo: que la página publicada (GitHub Pages) muestre nuestro terreno y las fotos HiRISE sin depender de la PC.

## Cómo funciona

| Pieza | Qué hace |
| --- | --- |
| `teselas/*.zip` (23 archivos, ~6 GB) | Se suben tal cual a un bucket de R2. |
| `teselas/nube/*.idx` + `manifest.json` | Índices chicos (~15 MB en total) que dicen dónde está cada tesela adentro de cada .zip. Los arma `herramientas/indices_nube.py`. |
| `sw.js` (service worker) | Cuando la página pide `teselas/...`, busca la tesela en el índice y pide a R2 solo esos bytes (HTTP Range). Si viene comprimida, la descomprime. La guarda en la caché del navegador. |
| `nube.json` | Dirección pública del bucket. Vacío = no se usa la nube. |
| `abrir.bat` / `servir.py` | Siguen funcionando igual: si la PC tiene las teselas, se usan esas y el service worker no hace nada. |

Si una tesela no llega, el service worker la reintenta (hasta 4 veces) y el terreno la vuelve a pedir. Si la nube no responde, la app pasa a Cesium Mars.

## Pasos (una sola vez)

1. **Cuenta y R2.** Entrar a <https://dash.cloudflare.com>, crear la cuenta y abrir **R2 Object Storage**. Cloudflare pide una tarjeta para activar R2. El plan gratis incluye 10 GB de almacenamiento, 1 millón de escrituras y 10 millones de lecturas por mes; no se cobra la descarga.
2. **Bucket.** Crear un bucket llamado `gale-earth-teselas`.
3. **Acceso público.** En el bucket: **Settings → Public access → R2.dev subdomain → Allow**. Copiar la dirección `https://pub-….r2.dev`. Cloudflare aclara que el subdominio r2.dev es para pruebas y no tiene caché de CDN. Para la demo alcanza; si después hay un dominio propio, se conecta en el mismo lugar.
4. **CORS.** En el bucket: **Settings → CORS policy → Add** y pegar el contenido de `cors_r2.json`. Esto deja que la página publicada lea los archivos y pida rangos de bytes.
5. **Clave para subir.** En R2: **Manage R2 API Tokens → Create API token** con permiso *Object Read & Write* solo sobre ese bucket. Guardar el *Access Key ID*, el *Secret Access Key* y el *endpoint* (`https://<id-de-cuenta>.r2.cloudflarestorage.com`). **No compartir estas claves con nadie, tampoco en el chat.**
6. **rclone.** Bajar `rclone.exe` de <https://rclone.org/downloads/> y ponerlo en la carpeta `gale-earth`. En una consola, correr `rclone config` → `n` (nuevo) → nombre `r2` → tipo `s3` → proveedor `Cloudflare` → pegar Access Key, Secret y endpoint. Las claves quedan solo en tu PC.
7. **Subir.** Doble clic en `subir_nube.bat`. Arma los índices, sube los 23 .zip y después los índices. Con buena conexión tarda menos de una hora.
8. **Conectar la página.** Poner la dirección del paso 3 en `nube.json` (`"teselas": "https://pub-….r2.dev/"`), y subir ese cambio al repo.

## Comprobar

- Abrir `https://pub-….r2.dev/nube/manifest.json` en el navegador: tiene que mostrar la lista de .zip.
- Abrir la página publicada, ir a Gale y acercarse: en **Capas → Motor 3D** el selector tiene que mostrar "Marte completo (CTX 5 m + HiRISE 25 cm)" y debe verse la foto HiRISE.

## Si se cambian las teselas

Volver a correr `subir_nube.bat`: rclone sube solo los archivos que cambiaron. Los índices se rehacen siempre, porque dependen de cada .zip.
