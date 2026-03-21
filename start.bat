@echo off
echo ============================================================
echo   Vocably - Starting All Services
echo ============================================================
echo.

REM Start Ollama (skip if already running on port 11434)
netstat -ano | findstr ":11434" >nul 2>&1
if errorlevel 1 (
    echo Starting Ollama...
    start "Vocably Ollama" cmd /k "ollama serve"
) else (
    echo Ollama already running.
)

REM Start the backend in a new window
echo Starting TTS Backend...
start "Vocably Backend" cmd /k "cd /d %~dp0backend && run.bat"

REM Wait a moment for backend to begin initializing
timeout /t 3 /nobreak >nul

REM Start the frontend in a new window
echo Starting React Frontend...
start "Vocably Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ============================================================
echo   Both services are starting in separate windows.
echo
echo   Backend: http://localhost:8000
echo   Frontend: http://localhost:5173
echo
echo   Close this window when done, or press any key to exit.
echo ============================================================
pause >nul
