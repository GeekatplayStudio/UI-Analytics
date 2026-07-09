#!/bin/bash
# Color codes
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}        EventFlow Setup & Build Script          ${NC}"
echo -e "${CYAN}================================================${NC}"

# Configure npm SSL settings
echo -e "${YELLOW}Configuring NPM strict-ssl settings...${NC}"
npm config set strict-ssl false

# Install root dependencies
echo -e "${YELLOW}Installing root dependency packages...${NC}"
if npm install; then
  echo -e "${GREEN}✔ Root dependencies installed.${NC}"
else
  echo -e "${RED}✘ Failed to install root dependencies.${NC}"
  exit 1
fi

# Install dashboard dependencies
echo -e "${YELLOW}Installing dashboard UI packages...${NC}"
if npm --prefix dashboard install; then
  echo -e "${GREEN}✔ Dashboard dependencies installed.${NC}"
else
  echo -e "${RED}✘ Failed to install dashboard dependencies.${NC}"
  exit 1
fi

# Build dashboard for production
echo -e "${YELLOW}Building dashboard static assets for production...${NC}"
if npm run dashboard:build; then
  echo -e "${GREEN}✔ Production build compiled.${NC}"
else
  echo -e "${RED}✘ Production build compilation failed.${NC}"
  exit 1
fi

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}     Setup & Production Build Completed!       ${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "To start the production server, execute:"
echo -e "  ${CYAN}npm start${NC}"
echo -e "The dashboard, ingestion API, and tracker will be live on:"
echo -e "  👉 ${GREEN}http://localhost:3001${NC}"
echo -e ""
echo -e "To run in concurrent developer mode (live reloading), execute:"
echo -e "  ${CYAN}npm run dev${NC}"
echo -e "  (Vite dev server: ${GREEN}http://localhost:5173${NC} | API: ${GREEN}http://localhost:3001${NC})"
