#!/bin/bash
# ============================================================
# Voice Navigator - Package Install Script
# Installs a published Voice Navigator package into a target org
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}   Voice Navigator - Package Install Script           ${NC}"
echo -e "${BLUE}=====================================================${NC}"
echo ""

PACKAGE_VERSION_ID=${1:-""}
TARGET_ORG=${2:-""}

if [ -z "$PACKAGE_VERSION_ID" ] || [ -z "$TARGET_ORG" ]; then
    echo -e "${YELLOW}Usage: ./scripts/install-package.sh <04t_package_version_id> <target-org-alias>${NC}"
    echo ""
    echo "Example:"
    echo "  ./scripts/install-package.sh 04t1234567890ABC myorg"
    echo ""
    echo "To find your package version ID:"
    echo "  sf package version list --packages 'Voice Navigator' --target-dev-hub <devhub>"
    exit 1
fi

# Verify org connection
echo -e "${BLUE}[1/3] Verifying connection to org: ${TARGET_ORG}${NC}"
if ! sf org display --target-org "$TARGET_ORG" > /dev/null 2>&1; then
    echo -e "${RED}Error: Cannot connect to org '${TARGET_ORG}'.${NC}"
    echo "Re-authorize with: sf org login web --alias ${TARGET_ORG}"
    exit 1
fi
echo -e "${GREEN}  Connected.${NC}"

# Install package
echo ""
echo -e "${BLUE}[2/3] Installing Voice Navigator package...${NC}"
sf package install \
    --package "$PACKAGE_VERSION_ID" \
    --target-org "$TARGET_ORG" \
    --wait 10 \
    --no-prompt

echo -e "${GREEN}  Package installed successfully.${NC}"

# Verify
echo ""
echo -e "${BLUE}[3/3] Verifying installation...${NC}"
sf package installed list --target-org "$TARGET_ORG"

echo ""
echo -e "${GREEN}=====================================================${NC}"
echo -e "${GREEN}   Voice Navigator installed successfully!            ${NC}"
echo -e "${GREEN}=====================================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Go to Setup > App Manager"
echo "  2. Edit your Lightning App (e.g., Sales)"
echo "  3. Add 'voiceNavigator' to Utility Items"
echo "  4. Set Label: Voice Navigator, Width: 400, Height: 500"
echo "  5. Save and refresh your browser"
echo ""
