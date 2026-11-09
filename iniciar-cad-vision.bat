@echo off
setlocal
cd /d "%~dp0"
title Civix CAD Vision
set "VENV=%LOCALAPPDATA%\GeoMetrics\cad-vision-venv"

where python >nul 2>nul
if errorlevel 1 (
  echo.
  echo No se encontro Python. Instalalo desde https://www.python.org/downloads/
  echo y marca la casilla "Add python.exe to PATH" durante la instalacion.
  pause
  exit /b 1
)

if not exist "%VENV%\Scripts\python.exe" (
  echo Primera ejecucion: creando el entorno. Puede tardar varios minutos...
  python -m venv "%VENV%"
  if errorlevel 1 goto error
)

"%VENV%\Scripts\python.exe" -c "import fastapi,uvicorn,cv2,ezdxf,pymupdf,rapidocr" >nul 2>nul
if errorlevel 1 (
  echo Instalando componentes necesarios...
  "%VENV%\Scripts\python.exe" -m pip install --disable-pip-version-check -r backend\cad_vision\requirements.txt
  if errorlevel 1 goto error
)

echo.
echo ========================================================
echo   Civix CAD Vision encendido. NO cierres esta ventana.
echo   Abre GeoMetrics: Civix ^> Planos y CAD ^> CAD Vision
echo ========================================================
echo.
"%VENV%\Scripts\python.exe" -m uvicorn cad_vision.main:app --app-dir backend --host 127.0.0.1 --port 8765
pause
exit /b 0

:error
echo.
echo Hubo un problema durante la instalacion. Revisa tu conexion a internet.
pause
exit /b 1
