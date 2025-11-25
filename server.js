#!/usr/bin/env node

/**
 * AI-Powered Asset Library Server
 * Serves static files and provides OpenAI Vision API integration
 */

require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

// Initialize OpenAI
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
}) : null;

// MIME types
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // API endpoint for AI tagging
    if (req.url === '/api/analyze-image' && req.method === 'POST') {
        await handleImageAnalysis(req, res);
        return;
    }

    // Serve static files
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`, 'utf-8');
            }
        } else {
            res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': 'no-cache'
            });
            res.end(content, 'utf-8');
        }
    });
});

// Handle image analysis with OpenAI Vision API
async function handleImageAnalysis(req, res) {
    if (!openai) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to .env file'
        }));
        return;
    }

    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', async () => {
        try {
            const { imageData } = JSON.parse(body);

            if (!imageData) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'No image data provided' }));
                return;
            }

            console.log('🤖 Analyzing image with OpenAI Vision...');

            // Call OpenAI Vision API
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: `Analyze this image and provide:
1. Category (choose ONE): logo, icon, photo, illustration, screenshot, diagram, other
2. Tags (3-8 relevant keywords)
3. Colors (3-5 dominant colors)
4. Description (brief, 1 sentence)

Respond ONLY with valid JSON in this exact format:
{
  "category": "logo",
  "tags": ["tag1", "tag2", "tag3"],
  "colors": ["#hexcode1", "#hexcode2"],
  "description": "Brief description"
}`
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: imageData
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 500,
                temperature: 0.3
            });

            const content = response.choices[0].message.content;

            // Parse JSON response
            let analysis;
            try {
                // Try to extract JSON from markdown code blocks if present
                const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
                                 content.match(/```\n?([\s\S]*?)\n?```/) ||
                                 [null, content];
                analysis = JSON.parse(jsonMatch[1]);
            } catch (e) {
                // Fallback parsing
                analysis = JSON.parse(content);
            }

            console.log('✅ Analysis complete:', analysis.category);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(analysis));

        } catch (error) {
            console.error('❌ Error analyzing image:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: 'Failed to analyze image',
                details: error.message
            }));
        }
    });
}

server.listen(PORT, HOST, () => {
    console.log('\n🚀 AI-Powered Asset Library Server Running!\n');
    console.log(`   Local:            http://localhost:${PORT}`);
    console.log(`   Network:          http://${getLocalIP()}:${PORT}`);
    console.log(`\n📁 Serving files from: ${__dirname}`);
    console.log(`🤖 OpenAI Vision:     ${openai ? '✓ Enabled' : '✗ Disabled (Add API key to .env)'}`);
    console.log('\n✨ Press Ctrl+C to stop the server\n');
});

function getLocalIP() {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return '0.0.0.0';
}

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use!`);
        console.error(`   Try a different port: PORT=3000 node server.js\n`);
    } else {
        console.error(`\n❌ Server error: ${err.message}\n`);
    }
    process.exit(1);
});
