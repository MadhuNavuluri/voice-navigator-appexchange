#!/bin/bash
# ============================================================
# Voice Navigator - Unlocked Package Creation Script
# Creates and versions an unlocked package for distribution
#
# PREREQUISITE: Dev Hub must be enabled in your org
# Setup > Dev Hub > Enable
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}   Voice Navigator - Package Creation Script          ${NC}"
echo -e "${BLUE}=====================================================${NC}"
echo ""

# Check if sf CLI is installed
if ! command -v sf &> /dev/null; then
    echo -e "${RED}Error: Salesforce CLI (sf) is not installed.${NC}"
    echo "Install it from: https://developer.salesforce.com/tools/salesforcecli"
    exit 1
fi

DEVHUB_ORG=${1:-""}
if [ -z "$DEVHUB_ORG" ]; then
    echo -e "${YELLOW}Usage: ./scripts/create-package.sh <devhub-org-alias>${NC}"
    echo ""
    echo "Prerequisites:"
    echo "  1. Enable Dev Hub: Setup > Dev Hub > Enable"
    echo "  2. Authorize the Dev Hub org: sf org login web --alias devhub"
    echo ""
    echo "Available orgs:"
    sf org list 2>/dev/null || echo "  No orgs authorized."
    exit 1
fi

# Set Dev Hub
echo -e "${BLUE}[1/4] Setting Dev Hub org: ${DEVHUB_ORG}${NC}"
sf config set target-dev-hub="$DEVHUB_ORG" 2>/dev/null

# Check if package already exists in sfdx-project.json
if grep -q '"0Ho' sfdx-project.json 2>/dev/null; then
    echo -e "${YELLOW}  Package already exists. Skipping creation, proceeding to version...${NC}"
else
    echo ""
    echo -e "${BLUE}[2/4] Creating unlocked package...${NC}"
    sf package create \
        --name "Voice Navigator" \
        --package-type Unlocked \
        --path force-app \
        --no-namespace \
        --description "Voice-controlled navigation for Salesforce Lightning. Navigate setup pages, objects, and records using voice commands." \
        --target-dev-hub "$DEVHUB_ORG"
    echo -e "${GREEN}  Package created successfully.${NC}"
fi

# Create package version
echo ""
echo -e "${BLUE}[3/4] Creating package version (this may take a few minutes)...${NC}"
sf package version create \
    --package "Voice Navigator" \
    --installation-key-bypass \
    --wait 15 \
    --target-dev-hub "$DEVHUB_ORG" \
    --code-coverage

echo -e "${GREEN}  Package version created successfully.${NC}"

# List package versions
echo ""
echo -e "${BLUE}[4/4] Package versions:${NC}"
sf package version list \
    --packages "Voice Navigator" \
    --target-dev-hub "$DEVHUB_ORG"

echo ""
echo -e "${GREEN}=====================================================${NC}"
echo -e "${GREEN}   Package created successfully!                      ${NC}"
echo -e "${GREEN}=====================================================${NC}"
echo ""
echo "To install in any org, run:"
echo -e "  ${BLUE}sf package install --package <04t_VERSION_ID> --target-org <org-alias> --wait 10${NC}"
echo ""
echo "Or share the install URL:"
echo -e "  ${BLUE}https://<org-domain>/packaging/installPackage.apexp?p0=<04t_VERSION_ID>${NC}"
echo ""
