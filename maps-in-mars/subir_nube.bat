@echo off
REM Sube las teselas de Gale Earth a Cloudflare R2. Antes: instalar rclone y configurar el remoto "r2" (ver NUBE.md).
cd /d "%~dp0"
where rclone >nul 2>nul || (echo Falta rclone: descargalo de https://rclone.org/downloads/ y pone rclone.exe en esta carpeta. & pause & exit /b 1)
echo 1/3 Armando los indices de las teselas...
python herramientas\indices_nube.py teselas || (pause & exit /b 1)
echo 2/3 Subiendo los .zip (unos 6 GB, puede tardar)...
rclone copy teselas r2:gale-earth-teselas --include "*.zip" --s3-upload-cutoff=100M --s3-chunk-size=100M --transfers=4 -P || (pause & exit /b 1)
echo 3/3 Subiendo los indices...
rclone copy teselas\nube r2:gale-earth-teselas/nube -P || (pause & exit /b 1)
echo Listo. Copia la direccion publica del bucket en nube.json.
pause
