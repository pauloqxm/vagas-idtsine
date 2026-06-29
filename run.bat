@echo off
setlocal
cd /d "%~dp0"

set PY=C:\Users\paulo\AppData\Local\Programs\Python\Python313\python.exe

if not defined PORT set PORT=8020

"%PY%" -m pip install -r "%~dp0requirements.txt" -q

echo.
echo Pagina publica de vagas: http://127.0.0.1:%PORT%/
echo Para trocar a porta, execute antes: set PORT=8030
echo.

"%PY%" -m uvicorn backend.main:app --host 127.0.0.1 --port %PORT%

pause
