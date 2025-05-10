#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Building Electron app...${NC}"
npm run build:electron

echo -e "${GREEN}Starting development server...${NC}"
npm run electron:dev 