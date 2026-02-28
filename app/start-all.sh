#!/bin/bash

echo "🚀 Iniciando YouTube MP3 Converter..."
echo ""

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Iniciar backend em background
echo -e "${BLUE}📡 Iniciando Backend...${NC}"
cd backend
node server.js &
BACKEND_PID=$!
cd ..

sleep 2

echo -e "${GREEN}✅ Backend rodando em http://localhost:3001${NC}"
echo ""

# Iniciar frontend
echo -e "${BLUE}🎨 Iniciando Frontend...${NC}"
npm run dev

# Ao encerrar, matar backend também
trap "kill $BACKEND_PID 2>/dev/null; exit" INT TERM EXIT
