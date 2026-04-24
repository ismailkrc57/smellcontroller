#!/bin/bash
set -e
BASE="$(cd "$(dirname "$0")" && pwd)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

find_free_port() {
  local port=$1
  while lsof -iTCP:$port -sTCP:LISTEN &>/dev/null 2>&1; do
    port=$((port + 1))
  done
  echo $port
}

echo -e "${GREEN}SmellController başlatılıyor...${NC}"
echo ""

# ── Backend bağımlılıkları ──────────────────────────────────────────
echo -e "${YELLOW}[1/4] Backend bağımlılıkları kontrol ediliyor...${NC}"

if ! command -v python3 &>/dev/null; then
  echo "HATA: python3 bulunamadı. Lütfen Python 3.10+ yükleyin."
  exit 1
fi

if [ ! -d "$BASE/backend/.venv" ]; then
  echo "  → Sanal ortam oluşturuluyor (.venv)..."
  python3 -m venv "$BASE/backend/.venv"
fi

source "$BASE/backend/.venv/bin/activate"
echo "  → pip bağımlılıkları yükleniyor..."
pip install -q -r "$BASE/backend/requirements.txt"
echo "  ✓ Backend bağımlılıkları hazır"
echo ""

# ── Frontend bağımlılıkları ─────────────────────────────────────────
echo -e "${YELLOW}[2/4] Frontend bağımlılıkları kontrol ediliyor...${NC}"

if ! command -v node &>/dev/null; then
  echo "HATA: node bulunamadı. Lütfen Node.js 18+ yükleyin."
  exit 1
fi

if [ ! -d "$BASE/frontend/node_modules" ]; then
  echo "  → node_modules yükleniyor (npm install)..."
  npm --prefix "$BASE/frontend" install
else
  echo "  → node_modules mevcut, atlanıyor"
fi
echo "  ✓ Frontend bağımlılıkları hazır"
echo ""

# ── Port seç ────────────────────────────────────────────────────────
BACKEND_PORT=$(find_free_port 8000)
FRONTEND_PORT=$(find_free_port 5173)

[ "$BACKEND_PORT" != "8000" ] && echo -e "${CYAN}  ℹ 8000 portu meşgul → Backend $BACKEND_PORT kullanıyor${NC}"
[ "$FRONTEND_PORT" != "5173" ] && echo -e "${CYAN}  ℹ 5173 portu meşgul → Frontend $FRONTEND_PORT kullanıyor${NC}"

# Vite'e backend URL'ini .env.local ile bildir
cat > "$BASE/frontend/.env.local" << EOF
VITE_API_URL=http://localhost:$BACKEND_PORT
VITE_WS_URL=ws://localhost:$BACKEND_PORT
EOF

# ── Backend başlat ──────────────────────────────────────────────────
echo -e "${YELLOW}[3/4] Backend başlatılıyor (port $BACKEND_PORT)...${NC}"
source "$BASE/backend/.venv/bin/activate"
python3 -m uvicorn main:app \
  --app-dir "$BASE/backend" \
  --host 0.0.0.0 \
  --port $BACKEND_PORT \
  --reload \
  --reload-dir "$BASE/backend" &
BACKEND_PID=$!
echo "  ✓ Backend PID: $BACKEND_PID"
echo ""

sleep 2

# ── Frontend başlat ─────────────────────────────────────────────────
echo -e "${YELLOW}[4/4] Frontend başlatılıyor (port $FRONTEND_PORT)...${NC}"
npm --prefix "$BASE/frontend" run dev -- --port $FRONTEND_PORT &
FRONTEND_PID=$!
echo "  ✓ Frontend PID: $FRONTEND_PID"
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Web Arayüzü : http://localhost:$FRONTEND_PORT  ${NC}"
echo -e "${GREEN}  API Docs    : http://localhost:$BACKEND_PORT/docs${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Durdurmak için Ctrl+C"

trap "echo ''; echo 'Durduruluyor...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

wait $BACKEND_PID $FRONTEND_PID
