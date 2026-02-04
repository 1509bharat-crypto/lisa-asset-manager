#!/usr/bin/env node

/**
 * Import data from Supabase export to Railway PostgreSQL
 *
 * Usage:
 *   1. Set DATABASE_URL environment variable
 *   2. Run: node scripts/import-to-railway.js <export-file.json>
 */

require('dotenv').config();
const fs = require('fs');
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    console.error('   Set it in .env or export it:');
    console.error('   export DATABASE_URL="postgresql://user:pass@host:port/db"');
    process.exit(1);
}

const exportFile = process.argv[2];
if (!exportFile) {
    console.error('❌ Usage: node scripts/import-to-railway.js <export-file.json>');
    process.exit(1);
}

if (!fs.existsSync(exportFile)) {
    console.error(`❌ File not found: ${exportFile}`);
    process.exit(1);
}

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function importData() {
    console.log('\n📦 Asset Library Data Import\n');
    console.log('Reading export file...');

    const data = JSON.parse(fs.readFileSync(exportFile, 'utf8'));

    console.log(`Found:`);
    console.log(`  • ${data.projects?.length || 0} projects`);
    console.log(`  • ${data.folders?.length || 0} folders`);
    console.log(`  • ${data.assets?.length || 0} assets`);
    console.log(`  • Exported: ${data.exportedAt}`);
    console.log('');

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Import projects
        console.log('Importing projects...');
        for (const project of data.projects || []) {
            await client.query(
                `INSERT INTO projects (id, name, description, color, created_at)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    color = EXCLUDED.color`,
                [project.id, project.name, project.description, project.color, project.created_at]
            );
            process.stdout.write('.');
        }
        console.log(` ✓ ${data.projects?.length || 0} projects`);

        // Import folders
        console.log('Importing folders...');
        for (const folder of data.folders || []) {
            await client.query(
                `INSERT INTO folders (id, name, project_id, parent_id, created_at)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    project_id = EXCLUDED.project_id,
                    parent_id = EXCLUDED.parent_id`,
                [folder.id, folder.name, folder.project_id, folder.parent_id, folder.created_at]
            );
            process.stdout.write('.');
        }
        console.log(` ✓ ${data.folders?.length || 0} folders`);

        // Import assets (this may take a while)
        console.log('Importing assets (this may take a while)...');
        let assetCount = 0;
        for (const asset of data.assets || []) {
            await client.query(
                `INSERT INTO assets (id, name, type, size, data, project_id, folder_id, upload_date, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    type = EXCLUDED.type,
                    size = EXCLUDED.size,
                    data = EXCLUDED.data,
                    project_id = EXCLUDED.project_id,
                    folder_id = EXCLUDED.folder_id`,
                [
                    asset.id,
                    asset.name,
                    asset.type,
                    asset.size,
                    asset.data,
                    asset.project_id,
                    asset.folder_id,
                    asset.upload_date,
                    asset.created_at
                ]
            );
            assetCount++;
            if (assetCount % 10 === 0) {
                process.stdout.write(`\r  ${assetCount}/${data.assets.length} assets...`);
            }
        }
        console.log(`\n ✓ ${data.assets?.length || 0} assets`);

        await client.query('COMMIT');

        console.log('\n✅ Import completed successfully!\n');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Import failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

importData().catch(err => {
    console.error(err);
    process.exit(1);
});
