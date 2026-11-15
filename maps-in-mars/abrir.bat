@echo off
REM Abre Maps in Mars con su servidor local (hace falta Python 3 instalado).
cd /d "%~dp0"
python servir.py
if errorlevel 1 py servir.py
pause
