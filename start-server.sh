#!/bin/bash

# Asset Library - Local Server Launcher
# Automatically detects available tools and starts a server

PORT=${1:-8080}

echo "🚀 Starting Asset Library Server on port $PORT..."
echo ""

# Option 1: Node.js server (if Node is installed)
if command -v node &> /dev/null; then
    echo "✓ Using Node.js server"
    node server.js
    exit 0
fi

# Option 2: Python 3 (most common)
if command -v python3 &> /dev/null; then
    echo "✓ Using Python 3 HTTP server"
    echo ""
    echo "   🌐 Server running at: http://localhost:$PORT"
    echo "   📁 Serving: $(pwd)"
    echo "   ✨ Press Ctrl+C to stop"
    echo ""
    python3 -m http.server $PORT
    exit 0
fi

# Option 3: Python 2 (legacy)
if command -v python &> /dev/null; then
    echo "✓ Using Python 2 HTTP server"
    echo ""
    echo "   🌐 Server running at: http://localhost:$PORT"
    echo "   📁 Serving: $(pwd)"
    echo "   ✨ Press Ctrl+C to stop"
    echo ""
    python -m SimpleHTTPServer $PORT
    exit 0
fi

# Option 4: PHP (if available)
if command -v php &> /dev/null; then
    echo "✓ Using PHP built-in server"
    echo ""
    echo "   🌐 Server running at: http://localhost:$PORT"
    echo "   📁 Serving: $(pwd)"
    echo "   ✨ Press Ctrl+C to stop"
    echo ""
    php -S localhost:$PORT
    exit 0
fi

# No server available
echo "❌ No HTTP server found!"
echo ""
echo "Please install one of the following:"
echo "  • Node.js: https://nodejs.org"
echo "  • Python 3: https://www.python.org"
echo ""
echo "Or just open index.html directly in your browser!"
exit 1
