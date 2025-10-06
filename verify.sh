#!/bin/bash

echo "======================================"
echo "  EverAfter - Verification Script"
echo "======================================"
echo ""

# Check Node version
echo "✓ Checking Node.js version..."
node --version

# Check npm
echo "✓ Checking npm version..."
npm --version

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo "✓ Dependencies installed"
else
    echo "⚠ Dependencies not installed. Run: npm install"
fi

# Check if .env exists
if [ -f ".env" ]; then
    echo "✓ Environment file exists"
else
    echo "⚠ No .env file. Using demo mode or copy from .env.example"
fi

# Check TypeScript files
TS_FILES=$(find src -name "*.ts*" | wc -l)
echo "✓ TypeScript files: $TS_FILES"

# Check build
echo ""
echo "Building application..."
npm run build > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ BUILD SUCCESSFUL"
else
    echo "❌ Build failed. Check for errors."
    exit 1
fi

echo ""
echo "======================================"
echo "  Verification Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Add Supabase credentials to .env (or run in demo mode)"
echo "2. Run: npm run dev"
echo "3. Navigate to Settings tab to test functionality"
echo ""
echo "Documentation:"
echo "- README.md - Project overview"
echo "- SETUP.md - Setup instructions"
echo "- DEPLOYMENT_CHECKLIST.md - Deployment guide"
echo ""
