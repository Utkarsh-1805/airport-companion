#!/bin/bash
# AeroAssist - Quick Start Script

echo "🛫 AeroAssist Setup"
echo "=================="

# Check Python version
python_version=$(python --version 2>&1 | awk '{print $2}')
echo "✓ Python version: $python_version"

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
source venv/bin/activate
echo "✓ Virtual environment activated"

# Install dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Verify Ollama
echo ""
echo "🔍 Verifying Ollama connection..."
python -c "
try:
    from src.generation import OllamaGenerator
    print('✓ Ollama connected successfully')
except Exception as e:
    print(f'✗ Ollama connection failed: {e}')
    print('Make sure Ollama is running: ollama serve')
"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Run example: python main.py"
echo "2. Start server: python -m uvicorn src.app:app --reload"
echo "3. View API docs: http://localhost:8000/docs"
