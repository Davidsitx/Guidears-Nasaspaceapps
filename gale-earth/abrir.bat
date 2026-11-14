@echo off
REM Abre Gale Earth con su servidor local (hace falta Python 3 instalado).
cd /d "%~dp0"
python servir.py
if errorlevel 1 py servir.py
pause
