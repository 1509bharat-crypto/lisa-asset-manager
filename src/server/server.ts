#!/usr/bin/env node

/**
 * Asset Library Server for Railway
 * TypeScript version with proper types and validation
 */

import 'dotenv/config';
import http, { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import type { RouteHandler, RouteMatch, RouteParams, QueryParams } from './types';
import {
    isValidUUID,
    isValidColor,
    validateProjectInput,
    validateFolderInput,
    validateAssetInput,
    validateBulkDeleteInput
} from './validation';

// Optional OpenAI for image analysis
let OpenAI: typeof import('openai').default | undefined;
try {
    OpenAI = require('openai').default;
} catch {
    console.log('OpenAI package not installed, AI features disabled');
}

// Optional Sharp for image processing
let sharp: typeof import('sharp') | undefined;
try {
    sharp = require('sharp');
} catch {
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
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// === OpenAI Client ===
const openai = process.env.OPENAI_API_KEY && OpenAI
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

// === MIME Types ===
const MIME_TYPES: Record<string, string> = {
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
function parseBody(req: IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
        let body = '';
        let size = 0;

        req.on('data', (chunk: Buffer) => {
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
            } catch {
                reject(new Error('Invalid JSON'));
            }
        });

        req.on('error', reject);
    });
}

function sendJson(res: ServerResponse, data: unknown, status = 200): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

function sendError(res: ServerResponse, message: string, status = 500): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: message }));
}

function getAllowedOrigin(requestOrigin: string | undefined): string {
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

// === API Routes ===
const apiRoutes: Record<string, RouteHandler> = {
    // Health check
    'GET /api/health': async (_req, res) => {
        try {
            await pool.query('SELECT 1');
            sendJson(res, { status: 'ok', database: 'connected' });
        } catch {
            sendJson(res, { status: 'error', database: 'disconnected' }, 503);
        }
    },

    // === PROJECTS ===
    'GET /api/projects': async (_req, res) => {
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
            const body = await parseBody(req);
            const validation = validateProjectInput(body);

            if (!validation.valid || !validation.data) {
                return sendError(res, validation.errors.join(', '), 400);
            }

            const { name, description, color } = validation.data;
            const { rows } = await pool.query(
                'INSERT INTO projects (name, description, color) VALUES ($1, $2, $3) RETURNING *',
                [name, description ?? null, color ?? '#667eea']
            );
            sendJson(res, rows[0], 201);
        } catch (error) {
            console.error('Error creating project:', error);
            sendError(res, 'Failed to create project');
        }
    },

    'PATCH /api/projects/:id': async (req, res, params) => {
        try {
            if (!isValidUUID(params.id)) {
                return sendError(res, 'Invalid project ID format', 400);
            }

            const body = await parseBody(req) as Record<string, unknown>;
            const updates: string[] = [];
            const values: unknown[] = [];
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
                if (!isValidColor(body.color as string)) {
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

            const { rows, rowCount } = await pool.query(
                `UPDATE projects SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
                values
            );
            if (rowCount === 0) return sendError(res, 'Project not found', 404);
            sendJson(res, rows[0]);
        } catch (error) {
            console.error('Error updating project:', error);
            sendError(res, 'Failed to update project');
        }
    },

    'DELETE /api/projects/:id': async (_req, res, params) => {
        try {
            if (!isValidUUID(params.id)) {
                return sendError(res, 'Invalid project ID format', 400);
            }

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
    'GET /api/folders': async (_req, res) => {
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
            const body = await parseBody(req);
            const validation = validateFolderInput(body);

            if (!validation.valid || !validation.data) {
                return sendError(res, validation.errors.join(', '), 400);
            }

            const { name, project_id, parent_id } = validation.data;
            const { rows } = await pool.query(
                'INSERT INTO folders (name, project_id, parent_id) VALUES ($1, $2, $3) RETURNING *',
                [name, project_id, parent_id ?? null]
            );
            sendJson(res, rows[0], 201);
        } catch (error) {
            console.error('Error creating folder:', error);
            sendError(res, 'Failed to create folder');
        }
    },

    'PATCH /api/folders/:id': async (req, res, params) => {
        try {
            if (!isValidUUID(params.id)) {
                return sendError(res, 'Invalid folder ID format', 400);
            }

            const body = await parseBody(req) as Record<string, unknown>;
            const updates: string[] = [];
            const values: unknown[] = [];
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

            const { rows, rowCount } = await pool.query(
                `UPDATE folders SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
                values
            );
            if (rowCount === 0) return sendError(res, 'Folder not found', 404);
            sendJson(res, rows[0]);
        } catch (error) {
            console.error('Error updating folder:', error);
            sendError(res, 'Failed to update folder');
        }
    },

    'DELETE /api/folders/:id': async (_req, res, params) => {
        try {
            if (!isValidUUID(params.id)) {
                return sendError(res, 'Invalid folder ID format', 400);
            }

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
    'GET /api/assets': async (_req, res, _params, query) => {
        try {
            // Exclude 'data' column from list query - it's huge and only needed for preview/download
            let sql = 'SELECT id, name, type, size, project_id, folder_id, upload_date FROM assets';
            const values: string[] = [];
            const conditions: string[] = [];

            if (query.project_id) {
                if (!isValidUUID(query.project_id)) {
                    return sendError(res, 'Invalid project_id format', 400);
                }
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

    'GET /api/assets/counts': async (_req, res) => {
        try {
            const { rows } = await pool.query(
                'SELECT project_id, COUNT(*) as count FROM assets GROUP BY project_id'
            );
            const counts: Record<string, number> = {};
            rows.forEach((row: { project_id: string; count: string }) => {
                counts[row.project_id] = parseInt(row.count);
            });
            sendJson(res, counts);
        } catch (error) {
            console.error('Error fetching asset counts:', error);
            sendError(res, 'Failed to fetch asset counts');
        }
    },

    'GET /api/assets/storage': async (_req, res) => {
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
            const body = await parseBody(req);
            const validation = validateAssetInput(body);

            if (!validation.valid || !validation.data) {
                return sendError(res, validation.errors.join(', '), 400);
            }

            const { name, type, size, data, project_id, folder_id } = validation.data;
            const { rows } = await pool.query(
                `INSERT INTO assets (name, type, size, data, project_id, folder_id, upload_date)
                 VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
                [name, type, size, data, project_id, folder_id ?? null]
            );
            sendJson(res, rows[0], 201);
        } catch (error) {
            console.error('Error creating asset:', error);
            sendError(res, 'Failed to create asset');
        }
    },

    'GET /api/assets/:id': async (_req, res, params) => {
        try {
            if (!isValidUUID(params.id)) {
                return sendError(res, 'Invalid asset ID format', 400);
            }

            const { rows, rowCount } = await pool.query(
                'SELECT * FROM assets WHERE id = $1',
                [params.id]
            );
            if (rowCount === 0) return sendError(res, 'Asset not found', 404);
            sendJson(res, rows[0]);
        } catch (error) {
            console.error('Error fetching asset:', error);
            sendError(res, 'Failed to fetch asset');
        }
    },

    // Serve asset image directly (for <img src="">)
    'GET /api/assets/:id/image': async (_req, res, params) => {
        try {
            if (!isValidUUID(params.id)) {
                res.writeHead(400);
                res.end('Invalid ID');
                return;
            }

            const { rows, rowCount } = await pool.query(
                'SELECT data, type FROM assets WHERE id = $1',
                [params.id]
            );
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

            res.writeHead(200, {
                'Content-Type': mimeType,
                'Content-Length': buffer.length,
                'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
            });
            res.end(buffer);
        } catch (error) {
            console.error('Error serving asset image:', error);
            res.writeHead(500);
            res.end('Server error');
        }
    },

    'PATCH /api/assets/:id': async (req, res, params) => {
        try {
            if (!isValidUUID(params.id)) {
                return sendError(res, 'Invalid asset ID format', 400);
            }

            const body = await parseBody(req) as Record<string, unknown>;
            const updates: string[] = [];
            const values: unknown[] = [];
            let paramIndex = 1;

            if (body.name !== undefined) {
                if (typeof body.name !== 'string' || body.name.trim().length === 0) {
                    return sendError(res, 'Invalid asset name', 400);
                }
                updates.push(`name = $${paramIndex++}`);
                values.push(body.name.trim());
            }
            if (body.folder_id !== undefined) {
                if (body.folder_id !== null && !isValidUUID(body.folder_id as string)) {
                    return sendError(res, 'Invalid folder_id format', 400);
                }
                updates.push(`folder_id = $${paramIndex++}`);
                values.push(body.folder_id);
            }
            if (body.project_id !== undefined) {
                if (!isValidUUID(body.project_id as string)) {
                    return sendError(res, 'Invalid project_id format', 400);
                }
                updates.push(`project_id = $${paramIndex++}`);
                values.push(body.project_id);
            }

            if (updates.length === 0) {
                return sendError(res, 'No fields to update', 400);
            }

            values.push(params.id);

            const { rows, rowCount } = await pool.query(
                `UPDATE assets SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
                values
            );
            if (rowCount === 0) return sendError(res, 'Asset not found', 404);
            sendJson(res, rows[0]);
        } catch (error) {
            console.error('Error updating asset:', error);
            sendError(res, 'Failed to update asset');
        }
    },

    'DELETE /api/assets/:id': async (_req, res, params) => {
        try {
            if (!isValidUUID(params.id)) {
                return sendError(res, 'Invalid asset ID format', 400);
            }

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

    'GET /api/projects/:projectId/assets/search': async (_req, res, params, query) => {
        try {
            if (!isValidUUID(params.projectId)) {
                return sendError(res, 'Invalid project ID format', 400);
            }

            const searchQuery = query.q?.trim() || '';
            if (!searchQuery) {
                return sendJson(res, []);
            }

            // Search by name (case-insensitive)
            const { rows } = await pool.query(
                `SELECT * FROM assets
                 WHERE project_id = $1 AND LOWER(name) LIKE LOWER($2)
                 ORDER BY upload_date DESC
                 LIMIT 100`,
                [params.projectId, `%${searchQuery}%`]
            );
            sendJson(res, rows);
        } catch (error) {
            console.error('Error searching assets:', error);
            sendError(res, 'Failed to search assets');
        }
    },

    'POST /api/assets/bulk-delete': async (req, res) => {
        try {
            const body = await parseBody(req);
            const validation = validateBulkDeleteInput(body);

            if (!validation.valid || !validation.ids) {
                return sendError(res, validation.errors.join(', '), 400);
            }

            const { ids } = validation;
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

    // === LOGO PROCESSING ===
    // Search for brand logos using Brandfetch API
    'GET /api/logo/search': async (req, res, _params, query) => {
        const BRANDFETCH_API_KEY = process.env.BRANDFETCH_API_KEY;
        if (!BRANDFETCH_API_KEY) {
            return sendError(res, 'Brandfetch API key not configured', 503);
        }

        const brandName = query.q;
        if (!brandName) {
            return sendError(res, 'No brand name provided', 400);
        }

        try {
            console.log('Searching Brandfetch for:', brandName);

            // Use Brandfetch Brand Search API
            const searchResponse = await fetch(
                `https://api.brandfetch.io/v2/search/${encodeURIComponent(brandName)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${BRANDFETCH_API_KEY}`
                    }
                }
            );

            if (!searchResponse.ok) {
                throw new Error(`Brandfetch search failed: ${searchResponse.status}`);
            }

            const results = await searchResponse.json();
            sendJson(res, results);
        } catch (error) {
            console.error('Error searching brands:', error);
            sendError(res, 'Failed to search brands');
        }
    },

    // Fetch brand details including logos from Brandfetch
    'GET /api/logo/brand/:domain': async (req, res, params) => {
        const BRANDFETCH_API_KEY = process.env.BRANDFETCH_API_KEY;
        if (!BRANDFETCH_API_KEY) {
            return sendError(res, 'Brandfetch API key not configured', 503);
        }

        const domain = params.domain;
        if (!domain) {
            return sendError(res, 'No domain provided', 400);
        }

        try {
            console.log('Fetching brand from Brandfetch:', domain);

            const brandResponse = await fetch(
                `https://api.brandfetch.io/v2/brands/${encodeURIComponent(domain)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${BRANDFETCH_API_KEY}`
                    }
                }
            );

            if (!brandResponse.ok) {
                throw new Error(`Brandfetch brand fetch failed: ${brandResponse.status}`);
            }

            const brandData = await brandResponse.json();
            sendJson(res, brandData);
        } catch (error) {
            console.error('Error fetching brand:', error);
            sendError(res, 'Failed to fetch brand');
        }
    },

    // Process logo: fetch, add white background, resize to 165x112
    'POST /api/logo/process': async (req, res) => {
        try {
            const body = await parseBody(req) as { url?: string; name?: string };
            if (!body.url) {
                return sendError(res, 'No URL provided', 400);
            }

            console.log('Fetching logo from:', body.url);

            // Fetch the logo image
            const response = await fetch(body.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; AssetLibrary/1.0)'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const inputBuffer = Buffer.from(arrayBuffer);
            let outputBuffer: Buffer = inputBuffer;

            // Process with Sharp if available
            if (sharp) {
                console.log('Processing logo with Sharp...');
                const TARGET_WIDTH = 165;
                const TARGET_HEIGHT = 112;
                const PADDING = 12; // Padding around logo

                // Calculate the area available for the logo (minus padding)
                const logoMaxWidth = TARGET_WIDTH - (PADDING * 2);
                const logoMaxHeight = TARGET_HEIGHT - (PADDING * 2);

                // Process the image:
                // 1. Flatten transparency to white background
                // 2. Resize to fit within the logo area (maintaining aspect ratio)
                // 3. Extend to exact dimensions with white background (adds padding)
                const resizedLogo = await sharp(inputBuffer)
                    .flatten({ background: { r: 255, g: 255, b: 255 } })
                    .resize(logoMaxWidth, logoMaxHeight, {
                        fit: 'inside',
                        withoutEnlargement: false
                    })
                    .toBuffer();

                // Get dimensions of resized logo
                const metadata = await sharp(resizedLogo).metadata();
                const logoWidth = metadata.width || logoMaxWidth;
                const logoHeight = metadata.height || logoMaxHeight;

                // Calculate padding to center the logo
                const leftPadding = Math.floor((TARGET_WIDTH - logoWidth) / 2);
                const rightPadding = TARGET_WIDTH - logoWidth - leftPadding;
                const topPadding = Math.floor((TARGET_HEIGHT - logoHeight) / 2);
                const bottomPadding = TARGET_HEIGHT - logoHeight - topPadding;

                // Extend to final dimensions with white background
                outputBuffer = await sharp(resizedLogo)
                    .extend({
                        top: topPadding,
                        bottom: bottomPadding,
                        left: leftPadding,
                        right: rightPadding,
                        background: { r: 255, g: 255, b: 255 }
                    })
                    .png()
                    .toBuffer();

                console.log('Logo processed: 165x112 with white background');
            }

            // Convert to base64 data URL
            const base64 = outputBuffer.toString('base64');
            const dataUrl = `data:image/png;base64,${base64}`;

            console.log('Logo ready, size:', outputBuffer.length, 'bytes');
            sendJson(res, { data: dataUrl });
        } catch (error) {
            console.error('Error processing logo:', error);
            sendError(res, 'Failed to fetch logo');
        }
    },

    // === AI IMAGE ANALYSIS ===
    'POST /api/analyze-image': async (req, res) => {
        if (!openai) {
            return sendError(res, 'OpenAI API key not configured', 503);
        }

        try {
            const body = await parseBody(req) as { imageData?: string };
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
            } catch {
                analysis = JSON.parse(content);
            }

            console.log('Analysis complete:', analysis.category);
            sendJson(res, analysis);
        } catch (error) {
            console.error('Error analyzing image:', error);
            sendError(res, 'Failed to analyze image');
        }
    },

    // === GOOGLE IMAGE SEARCH ===
    'GET /api/images/search': async (_req, res, _params, query) => {
        const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
        const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

        if (!GOOGLE_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
            return sendError(res, 'Google Search API not configured', 503);
        }

        const searchQuery = query.q?.trim();
        if (!searchQuery) {
            return sendError(res, 'No search query provided', 400);
        }

        try {
            console.log('Searching Google Images for:', searchQuery);

            const params = new URLSearchParams({
                key: GOOGLE_API_KEY,
                cx: GOOGLE_SEARCH_ENGINE_ID,
                q: searchQuery,
                searchType: 'image',
                num: '10',
                safe: 'active'
            });

            const response = await fetch(
                `https://www.googleapis.com/customsearch/v1?${params}`
            );

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Google Search API error:', errorData);
                throw new Error(`Google Search API error: ${response.status}`);
            }

            interface GoogleImageItem {
                title?: string;
                link?: string;
                image?: { thumbnailLink?: string; width?: number; height?: number };
                displayLink?: string;
            }
            const data = await response.json() as { items?: GoogleImageItem[] };

            // Transform results to a simpler format
            const images = (data.items || []).map((item) => ({
                title: item.title || '',
                url: item.link || '',
                thumbnail: item.image?.thumbnailLink || item.link || '',
                width: item.image?.width || 0,
                height: item.image?.height || 0,
                source: item.displayLink || ''
            }));

            console.log(`Found ${images.length} images for: ${searchQuery}`);
            sendJson(res, { images, query: searchQuery });
        } catch (error) {
            console.error('Error searching images:', error);
            sendError(res, 'Failed to search images');
        }
    },

    // Process image from URL (fetch and convert to data URL)
    'POST /api/images/process': async (req, res) => {
        try {
            const body = await parseBody(req) as { url?: string; title?: string };
            if (!body.url) {
                return sendError(res, 'No URL provided', 400);
            }

            console.log('Fetching image from:', body.url);

            const response = await fetch(body.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; AssetLibrary/1.0)'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const contentType = response.headers.get('content-type') || 'image/png';
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Convert to base64 data URL
            const base64 = buffer.toString('base64');
            const mimeType = contentType.split(';')[0].trim();
            const dataUrl = `data:${mimeType};base64,${base64}`;

            console.log('Image processed, size:', buffer.length, 'bytes');
            sendJson(res, { data: dataUrl, size: buffer.length });
        } catch (error) {
            console.error('Error processing image:', error);
            sendError(res, 'Failed to fetch image');
        }
    },

    // === AI ICON GENERATION ===
    'POST /api/generate-icon': async (req, res) => {
        if (!openai) {
            return sendError(res, 'OpenAI API key not configured', 503);
        }

        try {
            const body = await parseBody(req) as { subject?: string };
            if (!body.subject?.trim()) {
                return sendError(res, 'No subject provided', 400);
            }

            const subject = body.subject.trim();
            console.log('Generating icon for:', subject);

            // Build the prompt with the specific style
            const prompt = `flat vector icon, soft rounded shapes, solid flat fills only, 4 distinct shades of grey, transparent background, no outlines, no strokes, no gradients, no shadows, no lighting effects, ${subject}, depth only from overlapping shapes, matte, minimal`;

            const response = await openai.images.generate({
                model: 'dall-e-3',
                prompt: prompt,
                n: 1,
                size: '1024x1024',
                quality: 'standard',
                response_format: 'b64_json'
            });

            const imageData = response.data?.[0]?.b64_json;
            if (!imageData) {
                throw new Error('No image data returned');
            }

            const dataUrl = `data:image/png;base64,${imageData}`;

            console.log('Icon generated successfully for:', subject);
            sendJson(res, {
                data: dataUrl,
                subject: subject,
                prompt: prompt
            });
        } catch (error: unknown) {
            console.error('Error generating icon:', error);
            const message = error instanceof Error ? error.message : 'Failed to generate icon';
            sendError(res, message);
        }
    }
};

// === Route Matcher ===
function matchRoute(method: string, url: string): RouteMatch | null {
    const [pathPart, queryString] = url.split('?');
    const query: QueryParams = {};

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
        const pathParts = pathPart.split('/');

        if (routeParts.length !== pathParts.length) continue;

        const params: RouteParams = {};
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

// === Static File Server ===
function serveStaticFile(req: IncomingMessage, res: ServerResponse): void {
    // In production: dist-server/server.js serves from ../dist/client
    // In development: src/server.ts serves from project root
    const staticDir = process.env.NODE_ENV === 'production'
        ? path.join(__dirname, '..', 'dist', 'client')
        : path.join(__dirname, '..', '..');

    let filePath = req.url === '/' ? '/index.html' : (req.url || '/');
    filePath = filePath.split('?')[0];
    filePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
    filePath = path.join(staticDir, filePath);

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
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
}

// === Main Server ===
const server = http.createServer(async (req, res) => {
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
    } catch (error) {
        const err = error as Error;
        console.log(`   Database:         ✗ Not connected (${err.message})`);
    }

    console.log(`   OpenAI Vision:    ${openai ? '✓ Enabled' : '✗ Disabled'}`);
    console.log('\n');
});

server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\nPort ${PORT} is already in use!`);
        console.error(`Try: PORT=3000 node dist/server.js\n`);
    } else {
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
