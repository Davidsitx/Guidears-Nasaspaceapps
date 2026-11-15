@echo off
REM Configura rclone para Cloudflare R2 (remoto "r2"). Las claves quedan solo en esta PC,
REM en el archivo de configuracion de rclone. No las pegues en ningun chat ni en el repo.
cd /d "%~dp0"
if not exist rclone.exe (echo Falta rclone.exe en esta carpeta. & pause & exit /b 1)
echo.
echo Pega los datos que te mostro Cloudflare al crear el token de R2.
echo (Clic derecho pega en esta ventana.)
echo.
set /p "CUENTA=Account ID (o la URL del endpoint S3 completa): "
set /p "CLAVE=Access Key ID: "
for /f "usebackq delims=" %%s in (`powershell -NoProfile -Command "$s=Read-Host 'Secret Access Key (no se ve al pegar)' -AsSecureString; [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))"`) do set "SECRETO=%%s"
set "EP=%CUENTA%"
echo %CUENTA% | find "https://" >nul || set "EP=https://%CUENTA%.r2.cloudflarestorage.com"
rclone.exe config create r2 s3 provider=Cloudflare access_key_id=%CLAVE% secret_access_key=%SECRETO% endpoint=%EP% acl=private no_check_bucket=true >nul || (echo No se pudo crear la configuracion. & pause & exit /b 1)
set "CLAVE=" & set "SECRETO="
echo.
echo Probando la conexion con el bucket...
rclone.exe lsf r2:gale-earth-teselas --max-depth 1 && echo. && echo Listo: rclone ve tu R2. Ahora doble clic en subir_nube.bat. || echo No se pudo conectar: revisa las claves y volve a correr este archivo.
pause
