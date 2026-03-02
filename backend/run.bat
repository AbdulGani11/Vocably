@echo off
echo ============================================================
echo   Vocably TTS Server Startup
echo ============================================================
echo.

cd /d "%~dp0"

set PYTHON=%~dp0venv\Scripts\python.exe

echo [Step 1/3] Checking Python...
if not exist "%PYTHON%" (
    echo ERROR: Python not found at %PYTHON%
    pause
    exit /b 1
)
echo Done.

echo [Step 2/3] Verifying environment...
%PYTHON% -c "import kokoro; print('kokoro:', kokoro.__file__)"
if errorlevel 1 (
    echo ERROR: kokoro not installed. Run:
    echo   %PYTHON% -m pip install "kokoro>=0.9.4" soundfile
    pause
    exit /b 1
)
echo Done.

echo.
echo [Step 3/3] Starting server...
echo ============================================================
echo   Server starting on http://localhost:8000
echo   Press Ctrl+C to stop
echo ============================================================
echo.

%PYTHON% main.py

echo.
echo Server stopped.
pause
