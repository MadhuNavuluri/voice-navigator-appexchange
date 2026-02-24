#!/bin/bash
# ============================================================
# Voice Navigator - Deployment Script
# Deploys all components to a target Salesforce org
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}   Voice Navigator - Salesforce Deployment Script     ${NC}"
echo -e "${BLUE}=====================================================${NC}"
echo ""

# Check if sf CLI is installed
if ! command -v sf &> /dev/null; then
    echo -e "${RED}Error: Salesforce CLI (sf) is not installed.${NC}"
    echo "Install it from: https://developer.salesforce.com/tools/salesforcecli"
    exit 1
fi

# Get target org alias
TARGET_ORG=${1:-""}
if [ -z "$TARGET_ORG" ]; then
    echo -e "${YELLOW}Usage: ./scripts/deploy.sh <org-alias>${NC}"
    echo ""
    echo "Available orgs:"
    sf org list 2>/dev/null || echo "  No orgs authorized. Run: sf org login web --alias myorg"
    echo ""
    echo "To authorize a new org:"
    echo "  Production/Dev:  sf org login web --alias myorg"
    echo "  Sandbox:         sf org login web --alias myorg --instance-url https://test.salesforce.com"
    exit 1
fi

# Verify org connection
echo -e "${BLUE}[1/4] Verifying connection to org: ${TARGET_ORG}${NC}"
if ! sf org display --target-org "$TARGET_ORG" > /dev/null 2>&1; then
    echo -e "${RED}Error: Cannot connect to org '${TARGET_ORG}'.${NC}"
    echo "Re-authorize with: sf org login web --alias ${TARGET_ORG}"
    exit 1
fi
echo -e "${GREEN}  Connected successfully.${NC}"

# Deploy source
echo ""
echo -e "${BLUE}[2/4] Deploying Voice Navigator components...${NC}"
sf project deploy start \
    --target-org "$TARGET_ORG" \
    --source-dir force-app \
    --wait 10

echo -e "${GREEN}  Deployment successful.${NC}"

# Run tests
echo ""
echo -e "${BLUE}[3/4] Running Apex tests...${NC}"
sf apex run test \
    --target-org "$TARGET_ORG" \
    --class-names VoiceNavigatorControllerTest \
    --result-format human \
    --wait 5 \
    --code-coverage

echo ""
echo -e "${BLUE}[4/4] Deployment complete!${NC}"
echo ""
echo -e "${GREEN}=====================================================${NC}"
echo -e "${GREEN}   Voice Navigator deployed successfully!             ${NC}"
echo -e "${GREEN}=====================================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Go to Setup > App Manager"
echo "  2. Edit your Lightning App (e.g., Sales)"
echo "  3. Add 'voiceNavigator' to Utility Items"
echo "  4. Set Label: Voice Navigator, Width: 400, Height: 500"
echo "  5. Save and refresh your browser"
echo ""
