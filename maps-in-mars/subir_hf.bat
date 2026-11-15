@echo off
REM Sube las teselas de Gale Earth al dataset publico de Hugging Face ChuchuTEA/gale-earth-teselas.
REM El token se pega solo en esta ventana y queda guardado en tu PC. No lo pegues en ningun chat.
cd /d "%~dp0"
set "REPO=ChuchuTEA/gale-earth-teselas"
where python >nul 2>nul || (echo Falta Python. & pause & exit /b 1)
echo 1/4 Revisando la herramienta de Hugging Face...
python -c "import huggingface_hub, hf_xet" 2>nul || python -m pip install -q -U --no-warn-script-location "huggingface_hub[hf_xet]" || (pause & exit /b 1)
echo.
echo 2/4 Inicio de sesion: pega el token Write (clic derecho; no se ve al pegar) y Enter.
echo     Si pregunta "Add token as git credential?" responde n.
python -c "from huggingface_hub import whoami; whoami()" >nul 2>nul || python -c "from huggingface_hub import login; login()" || (pause & exit /b 1)
echo.
echo 3/4 Armando los indices de las teselas...
if not exist teselas\nube\manifest.json python herramientas\indices_nube.py teselas || (pause & exit /b 1)
echo 4/4 Subiendo unos 6 GB a %REPO% (si se corta, volve a correrlo: retoma donde quedo)...
python -c "from huggingface_hub import HfApi; a=HfApi(); a.create_repo('%REPO%', repo_type='dataset', exist_ok=True); a.upload_folder(repo_id='%REPO%', folder_path='teselas', repo_type='dataset', commit_message='Teselas de Gale Earth')" || (pause & exit /b 1)
echo.
echo Listo. Avisale a Claude.
pause
