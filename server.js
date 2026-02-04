#!/usr/bin/env node

/**
 * Asset Library Server for Railway
 * Serves static files, provides PostgreSQL API, and OpenAI Vision integration
 */

require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Optional OpenAI for image analysis
let OpenAI;
try {
    OpenAI = require('openai').OpenAI;
} catch (e) {
    console.log('OpenAI package not installed, AI features disabled');
}

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

// PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize OpenAI (optional)
const openai = process.env.OPENAI_API_KEY && OpenAI ? new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
}) : null;

// MIME types for static files
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

// Helper to parse JSON body
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                reject(new Error('Invalid JSON'));
            }
        });
        req.on('error', reject);
    });
}

// Helper to send JSON response
function sendJson(res, data, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

// Helper to send error response
function sendError(res, message, status = 500) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: message }));
}

// API Routes
const apiRoutes = {
    // Health check
    'GET /api/health': async (req, res) => {
        try {
            await pool.query('SELECT 1');
            sendJson(res, { status: 'ok', database: 'connected' });
        } catch (error) {
            sendJson(res, { status: 'error', database: 'disconnected' }, 503);
        }
    },

    // === PROJECTS ===
    'GET /api/projects': async (req, res) => {
        try {
            const { rows } = await pool.query(
                'SELECT * FROM projects ORDER BY created_at DESC'
            );
            sendJson(res, rows);
        } catch (error) {
            console.error('Error fetching projects:', error);
            sendError(res, 'Failed to fetch projects');
        }
    },

    'POST /api/projects': async (req, res) => {
        try {
            const { name, description, color } = await parseBody(req);
            if (!name) return sendError(res, 'Name is required', 400);

            const { rows } = await pool.query(
                'INSERT INTO projects (name, description, color) VALUES ($1, $2, $3) RETURNING *',
                [name, description || null, color || '#667eea']
            );
            sendJson(res, rows[0], 201);
        } catch (error) {
            console.error('Error creating project:', error);
            sendError(res, 'Failed to create project');
        }
    },

    'DELETE /api/projects/:id': async (req, res, params) => {
        try {
            const { rowCount } = await pool.query(
                'DELETE FROM projects WHERE id = $1',
                [params.id]
            );
            if (rowCount === 0) return sendError(res, 'Project not found', 404);
            sendJson(res, { success: true });
        } catch (error) {
            console.error('Error deleting project:', error);
            sendError(res, 'Failed to delete project');
        }
    },

    // === FOLDERS ===
    'GET /api/folders': async (req, res) => {
        try {
            const { rows } = await pool.query(
                'SELECT * FROM folders ORDER BY created_at ASC'
            );
            sendJson(res, rows);
        } catch (error) {
            console.error('Error fetching folders:', error);
            sendError(res, 'Failed to fetch folders');
        }
    },

    'POST /api/folders': async (req, res) => {
        try {
            const { name, project_id, parent_id } = await parseBody(req);
            if (!name || !project_id) return sendError(res, 'Name and project_id are required', 400);

            const { rows } = await pool.query(
                'INSERT INTO folders (name, project_id, parent_id) VALUES ($1, $2, $3) RETURNING *',
                [name, project_id, parent_id || null]
            );
            sendJson(res, rows[0], 201);
        } catch (error) {
            console.error('Error creating folder:', error);
            sendError(res, 'Failed to create folder');
        }
    },

    'DELETE /api/folders/:id': async (req, res, params) => {
        try {
            const { rowCount } = await pool.query(
                'DELETE FROM folders WHERE id = $1',
                [params.id]
            );
            if (rowCount === 0) return sendError(res, 'Folder not found', 404);
            sendJson(res, { success: true });
        } catch (error) {
            console.error('Error deleting folder:', error);
            sendError(res, 'Failed to delete folder');
        }
    },

    // === ASSETS ===
    'GET /api/assets': async (req, res, params, query) => {
        try {
            let sql = 'SELECT * FROM assets';
            const values = [];
            const conditions = [];

            if (query.project_id) {
                conditions.push(`project_id = $${values.length + 1}`);
                values.push(query.project_id);
            }

            if (conditions.length > 0) {
                sql += ' WHERE ' + conditions.join(' AND ');
            }

            sql += ' ORDER BY upload_date DESC LIMIT 200';

            const { rows } = await pool.query(sql, values);
            sendJson(res, rows);
        } catch (error) {
            console.error('Error fetching assets:', error);
            sendError(res, 'Failed to fetch assets');
        }
    },

    'GET /api/assets/counts': async (req, res) => {
        try {
            const { rows } = await pool.query(
                'SELECT project_id, COUNT(*) as count FROM assets GROUP BY project_id'
            );
            const counts = {};
            rows.forEach(row => counts[row.project_id] = parseInt(row.count));
            sendJson(res, counts);
        } catch (error) {
            console.error('Error fetching asset counts:', error);
            sendError(res, 'Failed to fetch asset counts');
        }
    },

    'GET /api/assets/storage': async (req, res) => {
        try {
            const { rows } = await pool.query(
                'SELECT COALESCE(SUM(size), 0) as total_size FROM assets'
            );
            sendJson(res, { total_size: parseInt(rows[0].total_size) });
        } catch (error) {
            console.error('Error fetching storage info:', error);
            sendError(res, 'Failed to fetch storage info');
        }
    },

    'POST /api/assets': async (req, res) => {
        try {
            const { name, type, size, data, project_id, folder_id } = await parseBody(req);
            if (!name || !type || !data || !project_id) {
                return sendError(res, 'name, type, data, and project_id are required', 400);
            }

            const { rows } = await pool.query(
                `INSERT INTO assets (name, type, size, data, project_id, folder_id, upload_date)
                 VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
                [name, type, size || 0, data, project_id, folder_id || null]
            );
            sendJson(res, rows[0], 201);
        } catch (error) {
            console.error('Error creating asset:', error);
            sendError(res, 'Failed to create asset');
        }
    },

    'DELETE /api/assets/:id': async (req, res, params) => {
        try {
            const { rowCount } = await pool.query(
                'DELETE FROM assets WHERE id = $1',
                [params.id]
            );
            if (rowCount === 0) return sendError(res, 'Asset not found', 404);
            sendJson(res, { success: true });
        } catch (error) {
            console.error('Error deleting asset:', error);
            sendError(res, 'Failed to delete asset');
        }
    },

    'POST /api/assets/bulk-delete': async (req, res) => {
        try {
            const { ids } = await parseBody(req);
            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return sendError(res, 'ids array is required', 400);
            }

            const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
            const { rowCount } = await pool.query(
                `DELETE FROM assets WHERE id IN (${placeholders})`,
                ids
            );
            sendJson(res, { deleted: rowCount });
        } catch (error) {
            console.error('Error bulk deleting assets:', error);
            sendError(res, 'Failed to bulk delete assets');
        }
    },

    // === AI IMAGE ANALYSIS ===
    'POST /api/analyze-image': async (req, res) => {
        if (!openai) {
            return sendError(res, 'OpenAI API key not configured', 503);
        }

        try {
            const { imageData } = await parseBody(req);
            if (!imageData) return sendError(res, 'No image data provided', 400);

            console.log('Analyzing image with OpenAI Vision...');

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
                                image_url: { url: imageData }
                            }
                        ]
                    }
                ],
                max_tokens: 500,
                temperature: 0.3
            });

            const content = response.choices[0].message.content;
            let analysis;
            try {
                const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
                                 content.match(/```\n?([\s\S]*?)\n?```/) ||
                                 [null, content];
                analysis = JSON.parse(jsonMatch[1]);
            } catch (e) {
                analysis = JSON.parse(content);
            }

            console.log('Analysis complete:', analysis.category);
            sendJson(res, analysis);
        } catch (error) {
            console.error('Error analyzing image:', error.message);
            sendError(res, 'Failed to analyze image');
        }
    }
};

// Route matcher with parameter support
function matchRoute(method, url) {
    const [path, queryString] = url.split('?');
    const query = {};
    if (queryString) {
        queryString.split('&').forEach(pair => {
            const [key, value] = pair.split('=');
            query[decodeURIComponent(key)] = decodeURIComponent(value || '');
        });
    }

    for (const [routeKey, handler] of Object.entries(apiRoutes)) {
        const [routeMethod, routePath] = routeKey.split(' ');
        if (routeMethod !== method) continue;

        const routeParts = routePath.split('/');
        const pathParts = path.split('/');

        if (routeParts.length !== pathParts.length) continue;

        const params = {};
        let match = true;

        for (let i = 0; i < routeParts.length; i++) {
            if (routeParts[i].startsWith(':')) {
                params[routeParts[i].slice(1)] = pathParts[i];
            } else if (routeParts[i] !== pathParts[i]) {
                match = false;
                break;
            }
        }

        if (match) {
            return { handler, params, query };
        }
    }

    return null;
}

// Main server
const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // API routes
    if (req.url.startsWith('/api/')) {
        const route = matchRoute(req.method, req.url);
        if (route) {
            try {
                await route.handler(req, res, route.params, route.query);
            } catch (error) {
                console.error('API Error:', error);
                sendError(res, 'Internal server error');
            }
            return;
        } else {
            sendError(res, 'Not found', 404);
            return;
        }
    }

    // Serve static files from dist/ in production, root in development
    const staticDir = process.env.NODE_ENV === 'production'
        ? path.join(__dirname, 'dist')
        : __dirname;

    let filePath = req.url === '/' ? '/index.html' : req.url;

    // Remove query strings
    filePath = filePath.split('?')[0];

    // Security: prevent directory traversal
    filePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
    filePath = path.join(staticDir, filePath);

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // SPA fallback - serve index.html for client-side routing
                const indexPath = path.join(staticDir, 'index.html');
                fs.readFile(indexPath, (indexErr, indexContent) => {
                    if (indexErr) {
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end('<h1>404 - Not Found</h1>');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(indexContent);
                    }
                });
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': ext === '.html' ? 'no-cache' : 'max-age=31536000'
            });
            res.end(content);
        }
    });
});

// Start server
server.listen(PORT, HOST, async () => {
    console.log('\n🚀 Asset Library Server Running!\n');
    console.log(`   URL:              http://localhost:${PORT}`);
    console.log(`   Environment:      ${process.env.NODE_ENV || 'development'}`);

    // Test database connection
    try {
        await pool.query('SELECT 1');
        console.log(`   Database:         ✓ Connected`);
    } catch (error) {
        console.log(`   Database:         ✗ Not connected (${error.message})`);
    }

    console.log(`   OpenAI Vision:    ${openai ? '✓ Enabled' : '✗ Disabled'}`);
    console.log('\n');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\nPort ${PORT} is already in use!`);
        console.error(`Try: PORT=3000 node server.js\n`);
    } else {
        console.error(`\nServer error: ${err.message}\n`);
    }
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down...');
    server.close(() => {
        pool.end();
        process.exit(0);
    });
});
