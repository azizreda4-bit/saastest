#!/bin/bash

# Fix Netlify Build - Ensure all components have proper exports
# This script fixes the export issues and pushes to GitHub

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}"
echo "🔧 Fixing Netlify Build Issues"
echo "==============================="
echo -e "${NC}"

echo -e "${BLUE}[1/4]${NC} Checking component exports..."

# Check if DashboardPage has default export
if grep -q "export default DashboardPage" frontend/src/pages/dashboard/DashboardPage.jsx; then
    echo -e "${GREEN}✅ DashboardPage has default export${NC}"
else
    echo -e "${YELLOW}⚠️ Adding default export to DashboardPage${NC}"
    echo "" >> frontend/src/pages/dashboard/DashboardPage.jsx
    echo "export default DashboardPage;" >> frontend/src/pages/dashboard/DashboardPage.jsx
fi

# Check other components
components=(
    "frontend/src/pages/auth/LoginPage.jsx"
    "frontend/src/layouts/DashboardLayout.jsx"
    "frontend/src/layouts/AuthLayout.jsx"
    "frontend/src/components/dashboard/StatsCard.jsx"
    "frontend/src/components/dashboard/OrdersChart.jsx"
    "frontend/src/components/dashboard/RevenueChart.jsx"
    "frontend/src/components/dashboard/RecentOrders.jsx"
    "frontend/src/components/dashboard/QuickActions.jsx"
)

for component in "${components[@]}"; do
    if [ -f "$component" ]; then
        component_name=$(basename "$component" .jsx)
        if grep -q "export default" "$component"; then
            echo -e "${GREEN}✅ $component_name has default export${NC}"
        else
            echo -e "${YELLOW}⚠️ Adding default export to $component_name${NC}"
            echo "" >> "$component"
            echo "export default $component_name;" >> "$component"
        fi
    fi
done

echo -e "${BLUE}[2/4]${NC} Testing build locally..."

# Test build locally
cd frontend
if npm run build; then
    echo -e "${GREEN}✅ Local build successful${NC}"
else
    echo -e "${RED}❌ Local build failed${NC}"
    exit 1
fi
cd ..

echo -e "${BLUE}[3/4]${NC} Committing changes..."

# Add all changes
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo -e "${YELLOW}⚠️ No changes to commit${NC}"
else
    # Commit changes
    git commit -m "Fix: Ensure all components have proper default exports for Netlify build

- Add default exports to all React components
- Fix import/export consistency
- Ensure build compatibility with Netlify/Vercel
- Test build passes locally"
    
    echo -e "${GREEN}✅ Changes committed${NC}"
fi

echo -e "${BLUE}[4/4]${NC} Pushing to GitHub..."

# Push to GitHub
git push origin main

echo -e "${GREEN}🎉 Fix complete!${NC}"
echo
echo -e "${BLUE}📋 What was fixed:${NC}"
echo "• Ensured all components have default exports"
echo "• Fixed import/export consistency"
echo "• Tested build locally"
echo "• Pushed changes to GitHub"
echo
echo -e "${BLUE}🚀 Next steps:${NC}"
echo "• Netlify will automatically rebuild"
echo "• Check deployment status in Netlify dashboard"
echo "• Test your live app once deployed"
echo
echo -e "${GREEN}Your Netlify build should now work! 🎊${NC}"