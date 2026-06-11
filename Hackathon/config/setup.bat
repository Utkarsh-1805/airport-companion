@echo off
REM AeroAssist - Quick Start Script for Windows

echo 🛫 AeroAssist Setup
echo ==================

REM Check Python version
python --version
echo ✓ Python installed

REM Create virtual environment
if not exist venv (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat
echo ✓ Virtual environment activated

REM Install dependencies
echo 📚 Installing dependencies...
pip install -r requirements.txt

REM Verify Ollama
echo.
echo 🔍 Verifying Ollama connection...
python -c ^
"try:                                                             \
    from src.generation import OllamaGenerator;                 \
    print('✓ Ollama connected successfully');                  \
except Exception as e:                                           \
    print(f'✗ Ollama connection failed: {e}');                 \
    print('Make sure Ollama is running: ollama serve')"

echo.
echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Run example: python main.py
echo 2. Start server: python -m uvicorn src.app:app --reload
echo 3. View API docs: http://localhost:8000/docs
pause
