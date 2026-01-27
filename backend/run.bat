@echo off
echo ============================================================
echo   Vocably TTS Server Startup
echo ============================================================
echo.

cd /d "%~dp0"

echo [Step 1/4] Checking virtual environment...
if not exist "qwen_env\Scripts\python.exe" (
    echo Creating virtual environment...
    python -m venv qwen_env
)
echo Done.

echo [Step 2/4] Activating virtual environment...
call "qwen_env\Scripts\activate.bat"
echo Done.

echo [Step 3/4] Checking dependencies...
pip show qwen-tts >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing dependencies - please wait...
    pip install -r requirements.txt
)
echo Done.

echo.
echo [Step 4/4] Starting server...
echo ============================================================
echo   Server starting on http://localhost:8000
echo   Press Ctrl+C to stop
echo ============================================================
echo.

python main.py

echo.
echo Server stopped.
pause
