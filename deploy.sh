#!/bin/bash

# Asset Library Deployment Script
# This script helps you deploy to GitHub Pages

echo "🚀 Asset Library Deployment Helper"
echo ""

# Check if git remote exists
if git remote | grep -q 'origin'; then
    echo "✓ Git remote 'origin' already exists"
    git remote -v
else
    echo "❌ No git remote found"
    echo ""
    echo "Please create a GitHub repository first:"
    echo "1. Go to https://github.com/new"
    echo "2. Create a repository named 'asset-library'"
    echo "3. Then run this command:"
    echo ""
    read -p "Enter your GitHub username: " username
    echo ""
    echo "Run this command:"
    echo "git remote add origin https://github.com/$username/asset-library.git"
    echo ""
    exit 1
fi

echo ""
echo "📦 Pushing to GitHub..."
git branch -M main
git push -u origin main

echo ""
echo "✓ Code pushed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Go to your repository on GitHub"
echo "2. Click 'Settings' → 'Pages'"
echo "3. Under 'Source', select 'main' branch"
echo "4. Click 'Save'"
echo "5. Wait 1-2 minutes for deployment"
echo "6. Your site will be live at: https://YOUR_USERNAME.github.io/asset-library"
echo ""
