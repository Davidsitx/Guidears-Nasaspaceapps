# Teselas de Gale Earth en la nube (Hugging Face)

Objetivo: que la página publicada (GitHub Pages) muestre nuestro terreno y las fotos HiRISE sin depender de la PC.

**Dónde están:** dataset público <https://huggingface.co/datasets/ChuchuTEA/gale-earth-teselas> (subido el 14/11/2026, 46 archivos, 6,5 GB). Gratis, sin tarjeta. Hugging Face responde pedidos por rangos de bytes (HTTP 206) y permite pedidos desde otros sitios (CORS), que es lo que necesita `sw.js`. Verificado desde el navegador: una tesela HiRISE (WebP) y una de relieve (8.458 bytes) en menos de 1 s cada una.

## Cómo funciona

| Pieza | Qué hace |
| --- | --- |
| `teselas/*.zip` (23 archivos, ~6 GB) | Están tal cual en el dataset. |
| `teselas/nube/*.idx` + `manifest.json` | Índices chicos (~15 MB) que dicen dónde está cada tesela adentro de cada .zip. Los arma `herramientas/indices_nube.py`. |
| `sw.js` (service worker) | Cuando la página pide `teselas/...`, busca la tesela en el índice y pide solo esos bytes. Si viene comprimida, la descomprime. La guarda en la caché del navegador. Reintenta hasta 4 veces. |
| `nube.json` | Dirección base del dataset (`.../resolve/main/`). Vacío = no se usa la nube. |
| `abrir.bat` / `servir.py` | Siguen igual: si la PC tiene las teselas, se usan esas y el service worker no hace nada. |

Si la nube no responde, la app pasa a Cesium Mars.

## Volver a subir (si cambian las teselas)

1. Tener las teselas en `teselas/` y Python instalado.
2. Doble clic en `subir_hf.bat`. La primera vez instala `huggingface_hub` y pide iniciar sesión (código en el navegador). El inicio de sesión queda solo en esa PC: no se pega en ningún chat ni en el repo.
3. Si se corta, se vuelve a correr y retoma.

La subida usa `HfApi.upload_folder` (huggingface_hub 2.x; `upload_large_folder` ya no existe).

## Alternativa: Cloudflare R2

`cors_r2.json`, `configurar_r2.bat` y `subir_nube.bat` sirven para subir lo mismo a un bucket de R2 (necesita tarjeta para activar R2 aunque no cobre). Solo hay que cambiar la dirección en `nube.json`. No la usamos porque no aceptó la tarjeta.
