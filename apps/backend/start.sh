#!/usr/bin/env bash
# Start the BrightBee FastAPI dev server
set -e
cd "$(dirname "$0")"

if [[ ! -d ".venv" ]]; then
  echo "Creating virtual environment with Python 3.12..."
  python3.12 -m venv .venv
  .venv/bin/pip install -q -r requirements.txt
fi

echo "Starting BrightBee API on http://localhost:8000"
echo "  Swagger UI : http://localhost:8000/docs"
echo ""

.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
