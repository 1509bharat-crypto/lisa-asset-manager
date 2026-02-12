#!/usr/bin/env node
"use strict";
/**
 * Asset Library Server for Railway
 * TypeScript version with proper types and validation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const http_1 = __importDefault(require("http"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pg_1 = require("pg");
const validation_1 = require("./validation");
// Optional OpenAI for image analysis
let OpenAI;
try {
    OpenAI = require('openai').default;
}
catch {
    console.log('OpenAI package not installed, AI features disabled');
}
// Optional Sharp for image processing
let sharp;
try {
    sharp = require('sharp');
}
catch {
    console.log('Sharp package not installed, image processing disabled');
}
// === Configuration ===
const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = '0.0.0.0';
const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['*'];
// === Database Connection ===
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
// === OpenAI Client ===
const openai = process.env.OPENAI_API_KEY && OpenAI
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;
// === MIME Types ===
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
// === Helper Functions ===
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        let size = 0;
        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > MAX_BODY_SIZE) {
                req.destroy();
                reject(new Error('Request body too large'));
                return;
            }
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            }
            catch {
                reject(new Error('Invalid JSON'));
            }
        });
        req.on('error', reject);
    });
}
function sendJson(res, data, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}
function sendError(res, message, status = 500) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: message }));
}
function getAllowedOrigin(requestOrigin) {
    if (ALLOWED_ORIGINS.includes('*')) {
        return '*';
    }
    if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
        return requestOrigin;
    }
    for (const allowed of ALLOWED_ORIGINS) {
        if (allowed.startsWith('*.')) {
            const domain = allowed.slice(2);
            if (requestOrigin?.endsWith(domain)) {
                return requestOrigin;
            }
        }
    }
    return ALLOWED_ORIGINS[0] || '';
}
// === Server-Sent Events (SSE) ===
const sseClients = new Set();
function broadcast(event, data) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data || {})}\n\n`;
    for (const client of sseClients) {
        try {
            client.write(message);
        }
        catch {
            sseClients.delete(client);
        }
    }
}
// === API Routes ===
const apiRoutes = {
    // SSE endpoint - clients subscribe to real-time updates
    'GET /api/events': async (_req, res) => {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });
        res.write('event: connected\ndata: {}\n\n');
        sseClients.add(res);
        res.on('close', () => {
            sseClients.delete(res);
        });
        // Keep connection alive - don't end response
    },
    // Health check
    'GET /api/health': async (_req, res) => {
        try {
            await pool.query('SELECT 1');
            sendJson(res, { status: 'ok', database: 'connected' });
        }
        catch {
            sendJson(res, { status: 'error', database: 'disconnected' }, 503);
        }
    },
    // === PROJECTS ===
    'GET /api/projects': async (_req, res) => {
        try {
            const { rows } = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
            sendJson(res, rows);
        }
        catch (error) {
            console.error('Error fetching projects:', error);
            sendError(res, 'Failed to fetch projects');
        }
    },
    'POST /api/projects': async (req, res) => {
        try {
            const body = await parseBody(req);
            const validation = (0, validation_1.validateProjectInput)(body);
            if (!validation.valid || !validation.data) {
                return sendError(res, validation.errors.join(', '), 400);
            }
            const { name, description, color } = validation.data;
            const { rows } = await pool.query('INSERT INTO projects (name, description, color) VALUES ($1, $2, $3) RETURNING *', [name, description ?? null, color ?? '#667eea']);
            broadcast('projects_changed');
            sendJson(res, rows[0], 201);
        }
        catch (error) {
            console.error('Error creating project:', error);
            sendError(res, 'Failed to create project');
        }
    },
    'PATCH /api/projects/:id': async (req, res, params) => {
        try {
            if (!(0, validation_1.isValidUUID)(params.id)) {
                return sendError(res, 'Invalid project ID format', 400);
            }
            const body = await parseBody(req);
            const updates = [];
            const values = [];
            let paramIndex = 1;
            if (body.name !== undefined) {
                updates.push(`name = $${paramIndex++}`);
                values.push(body.name);
            }
            if (body.description !== undefined) {
                updates.push(`description = $${paramIndex++}`);
                values.push(body.description);
            }
            if (body.color !== undefined) {
                if (!(0, validation_1.isValidColor)(body.color)) {
                    return sendError(res, 'Invalid color format', 400);
                }
                updates.push(`color = $${paramIndex++}`);
                values.push(body.color);
            }
            if (body.cover_asset_id !== undefined) {
                updates.push(`cover_asset_id = $${paramIndex++}`);
                values.push(body.cover_asset_id);
            }
            if (body.cover_image !== undefined) {
                updates.push(`cover_image = $${paramIndex++}`);
                values.push(body.cover_image);
            }
            if (updates.length === 0) {
                return sendError(res, 'No fields to update', 400);
            }
            updates.push(`updated_at = NOW()`);
            values.push(params.id);
            const { rows, rowCount } = await pool.query(`UPDATE projects SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`, values);
            if (rowCount === 0)
                return sendError(res, 'Project not found', 404);
            broadcast('projects_changed');
            sendJson(res, rows[0]);
        }
        catch (error) {
            console.error('Error updating project:', error);
            sendError(res, 'Failed to update project');
        }
    },
    'DELETE /api/projects/:id': async (_req, res, params) => {
        try {
            if (!(0, validation_1.isValidUUID)(params.id)) {
                return sendError(res, 'Invalid project ID format', 400);
            }
            const { rowCount } = await pool.query('DELETE FROM projects WHERE id = $1', [params.id]);
            if (rowCount === 0)
                return sendError(res, 'Project not found', 404);
            broadcast('projects_changed');
            sendJson(res, { success: true });
        }
        catch (error) {
            console.error('Error deleting project:', error);
            sendError(res, 'Failed to delete project');
        }
    },
    // === FOLDERS ===
    'GET /api/folders': async (_req, res) => {
        try {
            const { rows } = await pool.query('SELECT * FROM folders ORDER BY created_at ASC');
            sendJson(res, rows);
        }
        catch (error) {
            console.error('Error fetching folders:', error);
            sendError(res, 'Failed to fetch folders');
        }
    },
    'POST /api/folders': async (req, res) => {
        try {
            const body = await parseBody(req);
            const validation = (0, validation_1.validateFolderInput)(body);
            if (!validation.valid || !validation.data) {
                return sendError(res, validation.errors.join(', '), 400);
            }
            const { name, project_id, parent_id } = validation.data;
            const { rows } = await pool.query('INSERT INTO folders (name, project_id, parent_id) VALUES ($1, $2, $3) RETURNING *', [name, project_id, parent_id ?? null]);
            broadcast('folders_changed', { project_id });
            sendJson(res, rows[0], 201);
        }
        catch (error) {
            console.error('Error creating folder:', error);
            sendError(res, 'Failed to create folder');
        }
    },
    'PATCH /api/folders/:id': async (req, res, params) => {
        try {
            if (!(0, validation_1.isValidUUID)(params.id)) {
                return sendError(res, 'Invalid folder ID format', 400);
            }
            const body = await parseBody(req);
            const updates = [];
            const values = [];
            let paramIndex = 1;
            if (body.name !== undefined) {
                if (typeof body.name !== 'string' || body.name.trim().length === 0) {
                    return sendError(res, 'Invalid folder name', 400);
                }
                updates.push(`name = $${paramIndex++}`);
                values.push(body.name.trim());
            }
            if (updates.length === 0) {
                return sendError(res, 'No fields to update', 400);
            }
            updates.push(`updated_at = NOW()`);
            values.push(params.id);
            const { rows, rowCount } = await pool.query(`UPDATE folders SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`, values);
            if (rowCount === 0)
                return sendError(res, 'Folder not found', 404);
            broadcast('folders_changed');
            sendJson(res, rows[0]);
        }
        catch (error) {
            console.error('Error updating folder:', error);
            sendError(res, 'Failed to update folder');
        }
    },
    'DELETE /api/folders/:id': async (_req, res, params) => {
        try {
            if (!(0, validation_1.isValidUUID)(params.id)) {
                return sendError(res, 'Invalid folder ID format', 400);
            }
            const { rowCount } = await pool.query('DELETE FROM folders WHERE id = $1', [params.id]);
            if (rowCount === 0)
                return sendError(res, 'Folder not found', 404);
            broadcast('folders_changed');
            sendJson(res, { success: true });
        }
        catch (error) {
            console.error('Error deleting folder:', error);
            sendError(res, 'Failed to delete folder');
        }
    },
    // === ASSETS ===
    'GET /api/assets': async (_req, res, _params, query) => {
        try {
            // Exclude 'data' column from list query - it's huge and only needed for preview/download
            let sql = 'SELECT id, name, type, size, project_id, folder_id, upload_date FROM assets';
            const values = [];
            const conditions = [];
            if (query.project_id) {
                if (!(0, validation_1.isValidUUID)(query.project_id)) {
                    return sendError(res, 'Invalid project_id format', 400);
                }
                conditions.push(`project_id = $${values.length + 1}`);
                values.push(query.project_id);
            }
            if (conditions.length > 0) {
                sql += ' WHERE ' + conditions.join(' AND ');
            }
            sql += ' ORDER BY upload_date DESC';
            const { rows } = await pool.query(sql, values);
            sendJson(res, rows);
        }
        catch (error) {
            console.error('Error fetching assets:', error);
            sendError(res, 'Failed to fetch assets');
        }
    },
    'GET /api/assets/counts': async (_req, res) => {
        try {
            const { rows } = await pool.query('SELECT project_id, COUNT(*) as count FROM assets GROUP BY project_id');
            const counts = {};
            rows.forEach((row) => {
                counts[row.project_id] = parseInt(row.count);
            });
            sendJson(res, counts);
        }
        catch (error) {
            console.error('Error fetching asset counts:', error);
            sendError(res, 'Failed to fetch asset counts');
        }
    },
    'GET /api/assets/storage': async (_req, res) => {
        try {
            const { rows } = await pool.query('SELECT COALESCE(SUM(size), 0) as total_size FROM assets');
            sendJson(res, { total_size: parseInt(rows[0].total_size) });
        }
        catch (error) {
            console.error('Error fetching storage info:', error);
            sendError(res, 'Failed to fetch storage info');
        }
    },
    'POST /api/assets': async (req, res) => {
        try {
            const body = await parseBody(req);
            const validation = (0, validation_1.validateAssetInput)(body);
            if (!validation.valid || !validation.data) {
                return sendError(res, validation.errors.join(', '), 400);
            }
            const { name, type, size, data, project_id, folder_id } = validation.data;
            const { rows } = await pool.query(`INSERT INTO assets (name, type, size, data, project_id, folder_id, upload_date)
                 VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`, [name, type, size, data, project_id, folder_id ?? null]);
            broadcast('assets_changed', { project_id });
            sendJson(res, rows[0], 201);
        }
        catch (error) {
            console.error('Error creating asset:', error);
            sendError(res, 'Failed to create asset');
        }
    },
    'GET /api/assets/:id': async (_req, res, params) => {
        try {
            if (!(0, validation_1.isValidUUID)(params.id)) {
                return sendError(res, 'Invalid asset ID format', 400);
            }
            const { rows, rowCount } = await pool.query('SELECT * FROM assets WHERE id = $1', [params.id]);
            if (rowCount === 0)
                return sendError(res, 'Asset not found', 404);
            sendJson(res, rows[0]);
        }
        catch (error) {
            console.error('Error fetching asset:', error);
            sendError(res, 'Failed to fetch asset');
        }
    },
    // Serve asset image directly (for <img src="">)
    'GET /api/assets/:id/image': async (_req, res, params, query) => {
        try {
            if (!(0, validation_1.isValidUUID)(params.id)) {
                res.writeHead(400);
                res.end('Invalid ID');
                return;
            }
            const { rows, rowCount } = await pool.query('SELECT data, type FROM assets WHERE id = $1', [params.id]);
            if (rowCount === 0) {
                res.writeHead(404);
                res.end('Not found');
                return;
            }
            const asset = rows[0];
            // data is stored as data:image/png;base64,... format
            const matches = asset.data.match(/^data:([^;]+);base64,(.+)$/);
            if (!matches) {
                res.writeHead(500);
                res.end('Invalid data format');
                return;
            }
            const mimeType = matches[1];
            const base64Data = matches[2];
            const buffer = Buffer.from(base64Data, 'base64');
            // Format conversion
            const requestedFormat = query.format;
            const RASTER_FORMATS = ['png', 'jpg', 'webp'];
            const formatMap = { jpg: 'jpeg', png: 'png', webp: 'webp' };
            const mimeMap = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
            if (requestedFormat && RASTER_FORMATS.includes(requestedFormat) && sharp) {
                try {
                    const qualityOpts = {
                        png: { compressionLevel: 0 },
                        jpeg: { quality: 100, chromaSubsampling: '4:4:4' },
                        webp: { quality: 100, lossless: true }
                    };
                    const fmt = formatMap[requestedFormat];
                    // SVG→raster: render at high density then resize to 512x512
                    const isSvg = mimeType === 'image/svg+xml';
                    let pipeline = isSvg
                        ? sharp(buffer, { density: 300 }).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                        : sharp(buffer);
                    const converted = await pipeline.toFormat(fmt, qualityOpts[fmt] || {}).toBuffer();
                    res.writeHead(200, {
                        'Content-Type': mimeMap[requestedFormat],
                        'Content-Length': converted.length,
                        'Cache-Control': 'public, max-age=31536000'
                    });
                    res.end(converted);
                    return;
                }
                catch (conversionError) {
                    console.error('Format conversion failed, serving original:', conversionError);
                    // Fall through to serve original
                }
            }
            // Serve original format
            res.writeHead(200, {
                'Content-Type': mimeType,
                'Content-Length': buffer.length,
                'Cache-Control': 'public, max-age=31536000'
            });
            res.end(buffer);
        }
        catch (error) {
            console.error('Error serving asset image:', error);
            res.writeHead(500);
            res.end('Server error');
        }
    },
    'PATCH /api/assets/:id': async (req, res, params) => {
        try {
            if (!(0, validation_1.isValidUUID)(params.id)) {
                return sendError(res, 'Invalid asset ID format', 400);
            }
            const body = await parseBody(req);
            const updates = [];
            const values = [];
            let paramIndex = 1;
            if (body.name !== undefined) {
                if (typeof body.name !== 'string' || body.name.trim().length === 0) {
                    return sendError(res, 'Invalid asset name', 400);
                }
                updates.push(`name = $${paramIndex++}`);
                values.push(body.name.trim());
            }
            if (body.folder_id !== undefined) {
                if (body.folder_id !== null && !(0, validation_1.isValidUUID)(body.folder_id)) {
                    return sendError(res, 'Invalid folder_id format', 400);
                }
                updates.push(`folder_id = $${paramIndex++}`);
                values.push(body.folder_id);
            }
            if (body.project_id !== undefined) {
                if (!(0, validation_1.isValidUUID)(body.project_id)) {
                    return sendError(res, 'Invalid project_id format', 400);
                }
                updates.push(`project_id = $${paramIndex++}`);
                values.push(body.project_id);
            }
            if (updates.length === 0) {
                return sendError(res, 'No fields to update', 400);
            }
            values.push(params.id);
            const { rows, rowCount } = await pool.query(`UPDATE assets SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`, values);
            if (rowCount === 0)
                return sendError(res, 'Asset not found', 404);
            broadcast('assets_changed');
            sendJson(res, rows[0]);
        }
        catch (error) {
            console.error('Error updating asset:', error);
            sendError(res, 'Failed to update asset');
        }
    },
    'DELETE /api/assets/:id': async (_req, res, params) => {
        try {
            if (!(0, validation_1.isValidUUID)(params.id)) {
                return sendError(res, 'Invalid asset ID format', 400);
            }
            const { rowCount } = await pool.query('DELETE FROM assets WHERE id = $1', [params.id]);
            if (rowCount === 0)
                return sendError(res, 'Asset not found', 404);
            broadcast('assets_changed');
            sendJson(res, { success: true });
        }
        catch (error) {
            console.error('Error deleting asset:', error);
            sendError(res, 'Failed to delete asset');
        }
    },
    'GET /api/projects/:projectId/assets/search': async (_req, res, params, query) => {
        try {
            if (!(0, validation_1.isValidUUID)(params.projectId)) {
                return sendError(res, 'Invalid project ID format', 400);
            }
            const searchQuery = query.q?.trim() || '';
            if (!searchQuery) {
                return sendJson(res, []);
            }
            // Search by name (case-insensitive)
            const { rows } = await pool.query(`SELECT * FROM assets
                 WHERE project_id = $1 AND LOWER(name) LIKE LOWER($2)
                 ORDER BY upload_date DESC
                 LIMIT 100`, [params.projectId, `%${searchQuery}%`]);
            sendJson(res, rows);
        }
        catch (error) {
            console.error('Error searching assets:', error);
            sendError(res, 'Failed to search assets');
        }
    },
    'POST /api/assets/bulk-delete': async (req, res) => {
        try {
            const body = await parseBody(req);
            const validation = (0, validation_1.validateBulkDeleteInput)(body);
            if (!validation.valid || !validation.ids) {
                return sendError(res, validation.errors.join(', '), 400);
            }
            const { ids } = validation;
            const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
            const { rowCount } = await pool.query(`DELETE FROM assets WHERE id IN (${placeholders})`, ids);
            broadcast('assets_changed');
            sendJson(res, { deleted: rowCount });
        }
        catch (error) {
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
            const body = await parseBody(req);
            if (!body.imageData) {
                return sendError(res, 'No image data provided', 400);
            }
            console.log('Analyzing image with OpenAI Vision...');
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
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
                                type: 'image_url',
                                image_url: { url: body.imageData }
                            }
                        ]
                    }
                ],
                max_tokens: 500,
                temperature: 0.3
            });
            const content = response.choices[0].message.content || '';
            let analysis;
            try {
                const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
                    content.match(/```\n?([\s\S]*?)\n?```/) ||
                    [null, content];
                analysis = JSON.parse(jsonMatch[1] || content);
            }
            catch {
                analysis = JSON.parse(content);
            }
            console.log('Analysis complete:', analysis.category);
            sendJson(res, analysis);
        }
        catch (error) {
            console.error('Error analyzing image:', error);
            sendError(res, 'Failed to analyze image');
        }
    },
    // === ANALYTICS ===
    'POST /api/analytics/track': async (req, res) => {
        try {
            const body = await parseBody(req);
            if (!body.event) {
                return sendError(res, 'Event name required', 400);
            }
            await pool.query(`INSERT INTO analytics (event, properties, session_id, url, created_at)
                 VALUES ($1, $2, $3, $4, NOW())`, [
                body.event,
                JSON.stringify(body.properties || {}),
                body.session_id || null,
                body.url || null
            ]);
            sendJson(res, { success: true });
        }
        catch (error) {
            console.error('Error tracking analytics:', error);
            // Don't fail the request - analytics shouldn't break the app
            sendJson(res, { success: false });
        }
    },
    'GET /api/analytics/stats': async (_req, res) => {
        try {
            // Get actual database counts
            const projectCount = await pool.query('SELECT COUNT(*) as count FROM projects');
            const folderCount = await pool.query('SELECT COUNT(*) as count FROM folders');
            const assetCount = await pool.query('SELECT COUNT(*) as count FROM assets');
            const totalStorage = await pool.query('SELECT COALESCE(SUM(size), 0) as total FROM assets');
            // Get event counts for the last 30 days
            const eventCounts = await pool.query(`
                SELECT event, COUNT(*) as count
                FROM analytics
                WHERE created_at > NOW() - INTERVAL '30 days'
                GROUP BY event
                ORDER BY count DESC
            `);
            // Get unique sessions (visitors) for the last 30 days
            const uniqueSessions = await pool.query(`
                SELECT COUNT(DISTINCT session_id) as count
                FROM analytics
                WHERE created_at > NOW() - INTERVAL '30 days'
                  AND session_id IS NOT NULL
            `);
            // Get daily event counts for the last 14 days
            const dailyEvents = await pool.query(`
                SELECT DATE(created_at) as date, COUNT(*) as count
                FROM analytics
                WHERE created_at > NOW() - INTERVAL '14 days'
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            `);
            // Get daily event counts broken down by event type (for stacked chart)
            const dailyBreakdown = await pool.query(`
                SELECT DATE(created_at) as date, event, COUNT(*) as count
                FROM analytics
                WHERE created_at > NOW() - INTERVAL '14 days'
                GROUP BY DATE(created_at), event
                ORDER BY date ASC, event ASC
            `);
            // Get recent events (last 50)
            const recentEvents = await pool.query(`
                SELECT event, properties, session_id, url, created_at
                FROM analytics
                ORDER BY created_at DESC
                LIMIT 50
            `);
            sendJson(res, {
                // Database metrics
                total_projects: parseInt(projectCount.rows[0]?.count || '0'),
                total_folders: parseInt(folderCount.rows[0]?.count || '0'),
                total_assets: parseInt(assetCount.rows[0]?.count || '0'),
                total_storage: parseInt(totalStorage.rows[0]?.total || '0'),
                // Event tracking
                event_counts: eventCounts.rows,
                unique_visitors: parseInt(uniqueSessions.rows[0]?.count || '0'),
                daily_events: dailyEvents.rows,
                daily_breakdown: dailyBreakdown.rows,
                recent_events: recentEvents.rows
            });
        }
        catch (error) {
            console.error('Error fetching analytics stats:', error);
            sendError(res, 'Failed to fetch analytics stats');
        }
    },
    // === AI ICON GENERATION ===
    'POST /api/generate-icon': async (req, res) => {
        if (!openai) {
            return sendError(res, 'OpenAI API key not configured', 503);
        }
        try {
            const body = await parseBody(req);
            if (!body.subject?.trim()) {
                return sendError(res, 'No subject provided', 400);
            }
            const subject = body.subject.trim();
            console.log('Generating icon for:', subject);
            // Build the prompt with the specific style - optimized for gpt-image-1
            const prompt = `A flat vector icon of ${subject}. Style: soft rounded shapes, solid flat fills only, 4 distinct shades of grey, transparent background, no outlines, no strokes, no gradients, no shadows, no lighting effects, depth only from overlapping shapes, matte, minimal, centered composition.`;
            const response = await openai.images.generate({
                model: 'gpt-image-1',
                prompt: prompt,
                n: 1,
                size: '1024x1024',
                quality: 'low',
                background: 'transparent',
                output_format: 'png'
            });
            const imageData = response.data?.[0]?.b64_json;
            if (!imageData) {
                throw new Error('No image data returned');
            }
            let finalBase64 = imageData;
            // Resize to 512x512 and desaturate the image
            if (sharp) {
                const inputBuffer = Buffer.from(imageData, 'base64');
                const processedBuffer = await sharp(inputBuffer)
                    .resize(512, 512)
                    .grayscale()
                    .png({ compressionLevel: 9 })
                    .toBuffer();
                finalBase64 = processedBuffer.toString('base64');
                console.log('Icon resized and desaturated successfully');
            }
            const dataUrl = `data:image/png;base64,${finalBase64}`;
            console.log('Icon generated successfully for:', subject);
            sendJson(res, {
                data: dataUrl,
                subject: subject,
                prompt: prompt
            });
        }
        catch (error) {
            console.error('Error generating icon:', error);
            const message = error instanceof Error ? error.message : 'Failed to generate icon';
            sendError(res, message);
        }
    }
};
// === Route Matcher ===
function matchRoute(method, url) {
    const [pathPart, queryString] = url.split('?');
    const query = {};
    if (queryString) {
        queryString.split('&').forEach(pair => {
            const [key, value] = pair.split('=');
            query[decodeURIComponent(key)] = decodeURIComponent(value || '');
        });
    }
    for (const [routeKey, handler] of Object.entries(apiRoutes)) {
        const [routeMethod, routePath] = routeKey.split(' ');
        if (routeMethod !== method)
            continue;
        const routeParts = routePath.split('/');
        const pathParts = pathPart.split('/');
        if (routeParts.length !== pathParts.length)
            continue;
        const params = {};
        let match = true;
        for (let i = 0; i < routeParts.length; i++) {
            if (routeParts[i].startsWith(':')) {
                params[routeParts[i].slice(1)] = pathParts[i];
            }
            else if (routeParts[i] !== pathParts[i]) {
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
// === Static File Server ===
function serveStaticFile(req, res) {
    // In production: dist-server/server.js serves from ../dist/client
    // In development: src/server.ts serves from project root
    const staticDir = process.env.NODE_ENV === 'production'
        ? path_1.default.join(__dirname, '..', 'dist', 'client')
        : path_1.default.join(__dirname, '..', '..');
    let filePath = req.url === '/' ? '/index.html' : (req.url || '/');
    filePath = filePath.split('?')[0];
    filePath = path_1.default.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
    filePath = path_1.default.join(staticDir, filePath);
    const ext = path_1.default.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    fs_1.default.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                const indexPath = path_1.default.join(staticDir, 'index.html');
                fs_1.default.readFile(indexPath, (indexErr, indexContent) => {
                    if (indexErr) {
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end('<h1>404 - Not Found</h1>');
                    }
                    else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(indexContent);
                    }
                });
            }
            else {
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
            }
        }
        else {
            res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': ext === '.html' ? 'no-cache' : 'max-age=31536000'
            });
            res.end(content);
        }
    });
}
// === Main Server ===
const server = http_1.default.createServer(async (req, res) => {
    const origin = req.headers.origin;
    const allowedOrigin = getAllowedOrigin(origin);
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (allowedOrigin !== '*') {
        res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    if (req.url?.startsWith('/api/')) {
        const route = matchRoute(req.method || 'GET', req.url);
        if (route) {
            try {
                await route.handler(req, res, route.params, route.query);
            }
            catch (error) {
                console.error('API Error:', error);
                sendError(res, 'Internal server error');
            }
            return;
        }
        else {
            sendError(res, 'Not found', 404);
            return;
        }
    }
    serveStaticFile(req, res);
});
// === Start Server ===
server.listen(PORT, HOST, async () => {
    console.log('\n🚀 Asset Library Server Running!\n');
    console.log(`   URL:              http://localhost:${PORT}`);
    console.log(`   Environment:      ${process.env.NODE_ENV || 'development'}`);
    try {
        await pool.query('SELECT 1');
        console.log(`   Database:         ✓ Connected`);
    }
    catch (error) {
        const err = error;
        console.log(`   Database:         ✗ Not connected (${err.message})`);
    }
    console.log(`   OpenAI Vision:    ${openai ? '✓ Enabled' : '✗ Disabled'}`);
    console.log('\n');
});
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\nPort ${PORT} is already in use!`);
        console.error(`Try: PORT=3000 node dist/server.js\n`);
    }
    else {
        console.error(`\nServer error: ${err.message}\n`);
    }
    process.exit(1);
});
// === Graceful Shutdown ===
process.on('SIGTERM', () => {
    console.log('Shutting down...');
    server.close(() => {
        pool.end();
        process.exit(0);
    });
});
//# sourceMappingURL=server.js.map