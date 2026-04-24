#!/bin/bash
BASE="$(cd "$(dirname "$0")" && pwd)"

echo "SmellController başlatılıyor..."

# Backend
cd "$BASE/backend"
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID (http://localhost:8000)"

sleep 2

# Frontend
cd "$BASE/frontend"
npm run dev -- --port 5173 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID (http://localhost:5173)"

echo ""
echo "Uygulama çalışıyor:"
echo "  Web Arayüzü : http://localhost:5173"
echo "  API Docs    : http://localhost:8000/docs"
echo ""
echo "Durdurmak için Ctrl+C"

wait $BACKEND_PID $FRONTEND_PID
