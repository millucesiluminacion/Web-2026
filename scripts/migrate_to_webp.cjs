/**
 * WebP Image Migration Script — 3 Phases, Fully Reversible
 * ==========================================================
 * 
 * PHASE 1 (safe): Convert PNGs to WebP and upload alongside originals.
 *   → No changes to DB, no deletions. 100% rollback: just delete the new WebP files.
 *   Run: node scripts/migrate_to_webp.cjs phase1
 *
 * PHASE 2 (verification): Test that all new WebP URLs are accessible.
 *   → Read-only. Generates a report.
 *   Run: node scripts/migrate_to_webp.cjs phase2
 *  
 * PHASE 3 (commit): Update product image_url in DB to point to WebP.
 *   → ONLY run after verifying Phase 2 report looks good.
 *   → Original PNGs remain in Storage (not deleted).
 *   Run: node scripts/migrate_to_webp.cjs phase3
 *
 * ROLLBACK (undo phase 3): Restore DB URLs back to original PNGs.
 *   Run: node scripts/migrate_to_webp.cjs rollback
 */

const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ─── Configuration ──────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://fvfnpztjsqdiljudjmdl.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2Zm5wenRqc3FkaWxqdWRqbWRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDg5OTAxMSwiZXhwIjoyMDg2NDc1MDExfQ.4KUglXL4TkXAuo0WQXXpBJL9SpgBLX-yZ1HxaMojRp4';
const BUCKET = 'images';
const WEBP_QUALITY = 82;

// Mapping file: stores original→webp URL pairs for rollback
const MAPPING_FILE = path.join(__dirname, 'webp_migration_map.json');
const TMP_DIR = path.join(__dirname, '.webp_tmp');

// ─── Supabase client (service role for uploads) ─────────────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ─── Helpers ────────────────────────────────────────────────────────────────

function downloadBuffer(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, (res) => {
            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            }
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        }).on('error', reject);
    });
}

function getStoragePath(url) {
    // Extract path relative to bucket, e.g. "images/0.123.png" → "0.123.png"
    const marker = `/object/public/${BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.slice(idx + marker.length);
}

function toWebpPath(storagePath) {
    return storagePath.replace(/\.(png|jpg|jpeg|gif)$/i, '.webp');
}

function log(msg) { console.log(`  ${msg}`); }
function warn(msg) { console.warn(`  ⚠️  ${msg}`); }
function success(msg) { console.log(`  ✅ ${msg}`); }
function error(msg) { console.error(`  ❌ ${msg}`); }

// ─── PHASE 1: Convert & Upload ───────────────────────────────────────────────
async function phase1() {
    console.log('\n🔵 PHASE 1: Gathering all non-WebP images from products, extra_images, categories, and projects...\n');

    const allUrls = new Set();

    // 1. Products image_url & extra_images
    const { data: products, error: prodErr } = await supabase
        .from('products')
        .select('id, image_url, extra_images');

    if (prodErr) { error('Cannot fetch products: ' + prodErr.message); return; }

    for (const p of products || []) {
        if (p.image_url && p.image_url.includes('supabase.co/storage')) {
            allUrls.add(p.image_url);
        }
        if (Array.isArray(p.extra_images)) {
            for (const img of p.extra_images) {
                if (img && typeof img === 'string' && img.includes('supabase.co/storage')) {
                    allUrls.add(img);
                }
            }
        }
    }

    // 2. Categories image_url
    const { data: categories, error: catErr } = await supabase
        .from('categories')
        .select('id, image_url');
    if (!catErr && categories) {
        for (const c of categories) {
            if (c.image_url && c.image_url.includes('supabase.co/storage')) {
                allUrls.add(c.image_url);
            }
        }
    }

    // 3. Projects image_url
    const { data: projects, error: projErr } = await supabase
        .from('projects')
        .select('id, image_url');
    if (!projErr && projects) {
        for (const pr of projects) {
            if (pr.image_url && pr.image_url.includes('supabase.co/storage')) {
                allUrls.add(pr.image_url);
            }
        }
    }

    // Filter out URLs that are already .webp
    const nonWebpUrls = [...allUrls].filter(url => !/\.webp(\?.*)?$/i.test(url));
    log(`Found ${nonWebpUrls.length} unique non-WebP Supabase images to convert.\n`);

    if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

    const mapping = fs.existsSync(MAPPING_FILE) ? JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8')) : {};
    let converted = 0, skipped = 0, failed = 0;

    for (const url of nonWebpUrls) {
        const storagePath = getStoragePath(url);
        if (!storagePath) { warn(`Skipping (can't parse path): ${url}`); skipped++; continue; }

        if (mapping[url]) { log(`Already converted: ${storagePath}`); skipped++; continue; }

        try {
            log(`Converting: ${storagePath}`);
            const imgBuffer = await downloadBuffer(url);

            // Convert to WebP with sharp
            const webpBuffer = await sharp(imgBuffer)
                .webp({ quality: WEBP_QUALITY, effort: 4 })
                .toBuffer();

            const webpPath = toWebpPath(storagePath);
            const webpPublicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${webpPath}`;

            // Upload to Supabase Storage with 1 year cache header
            const { error: uploadErr } = await supabase.storage
                .from(BUCKET)
                .upload(webpPath, webpBuffer, {
                    contentType: 'image/webp',
                    cacheControl: '31536000',
                    upsert: true,
                });

            if (uploadErr) { error(`Upload failed for ${webpPath}: ${uploadErr.message}`); failed++; continue; }

            mapping[url] = webpPublicUrl;
            fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));

            const savings = (((imgBuffer.length - webpBuffer.length) / imgBuffer.length) * 100).toFixed(1);
            success(`${storagePath} → ${webpPath} (saved ${savings}%)`);
            converted++;

        } catch (e) {
            error(`Failed: ${storagePath} — ${e.message}`);
            failed++;
        }
    }

    console.log(`\n📊 Phase 1 complete: ${converted} converted, ${skipped} skipped, ${failed} failed.`);
    if (failed > 0) console.log('   Fix the errors above before proceeding to Phase 2.');
    else console.log('   Run Phase 2 to verify all new URLs are accessible.');
}

// ─── PHASE 2: Verify URLs ────────────────────────────────────────────────────
async function phase2() {
    console.log('\n🟡 PHASE 2: Verifying WebP URLs...\n');

    if (!fs.existsSync(MAPPING_FILE)) {
        error('No mapping file found. Run Phase 1 first.'); return;
    }

    const mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'));
    const entries = Object.entries(mapping);
    log(`Checking ${entries.length} WebP URLs in storage...\n`);

    let ok = 0, broken = 0;
    const brokenUrls = [];

    for (const [original, webpUrl] of entries) {
        try {
            await new Promise((resolve, reject) => {
                const client = webpUrl.startsWith('https') ? https : http;
                const req = client.request(webpUrl, { method: 'HEAD' }, (res) => {
                    if (res.statusCode === 200) resolve();
                    else reject(new Error(`HTTP ${res.statusCode}`));
                });
                req.on('error', reject);
                req.end();
            });
            ok++;
        } catch (e) {
            error(`BROKEN: ${webpUrl} — ${e.message}`);
            brokenUrls.push(webpUrl);
            broken++;
        }
    }

    console.log(`\n📊 Phase 2 complete: ${ok} accessible, ${broken} broken.`);
    if (broken > 0) {
        console.log('   ❌ Fix broken URLs before running Phase 3.');
    } else {
        console.log('   ✅ All WebP images verified! You can now run Phase 3 to safely update the database.');
    }
}

// ─── PHASE 3: Update Database ────────────────────────────────────────────────
async function phase3() {
    console.log('\n🟢 PHASE 3: Updating database URLs to WebP...\n');

    if (!fs.existsSync(MAPPING_FILE)) {
        error('No mapping file found. Run Phase 1 first.'); return;
    }

    const mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'));
    const entries = Object.entries(mapping);
    log(`Processing ${entries.length} URL mappings across products, extra_images, categories, and projects...\n`);

    let updatedProducts = 0;
    let updatedCategories = 0;
    let updatedProjects = 0;

    for (const [originalUrl, webpUrl] of entries) {
        // 1. Update products image_url
        const { data: pData } = await supabase
            .from('products')
            .update({ image_url: webpUrl })
            .eq('image_url', originalUrl)
            .select('id');
        if (pData?.length) updatedProducts += pData.length;

        // 2. Update categories image_url
        const { data: cData } = await supabase
            .from('categories')
            .update({ image_url: webpUrl })
            .eq('image_url', originalUrl)
            .select('id');
        if (cData?.length) updatedCategories += cData.length;

        // 3. Update projects image_url
        const { data: prData } = await supabase
            .from('projects')
            .update({ image_url: webpUrl })
            .eq('image_url', originalUrl)
            .select('id');
        if (prData?.length) updatedProjects += prData.length;
    }

    // 4. Update products extra_images arrays
    const { data: productsWithExtras } = await supabase
        .from('products')
        .select('id, extra_images')
        .not('extra_images', 'is', null);

    let updatedExtras = 0;
    for (const prod of productsWithExtras || []) {
        if (!Array.isArray(prod.extra_images)) continue;
        let changed = false;
        const newExtras = prod.extra_images.map(img => {
            if (mapping[img]) {
                changed = true;
                return mapping[img];
            }
            return img;
        });
        if (changed) {
            await supabase.from('products').update({ extra_images: newExtras }).eq('id', prod.id);
            updatedExtras++;
        }
    }

    console.log(`\n📊 Phase 3 complete:`);
    console.log(`   - Products main image updated: ${updatedProducts}`);
    console.log(`   - Products extra images updated: ${updatedExtras}`);
    console.log(`   - Categories image updated: ${updatedCategories}`);
    console.log(`   - Projects image updated: ${updatedProjects}`);
    console.log('   ✅ Migration successfully committed to database!');
    console.log('   ℹ️  Original PNG/JPG files remain in Supabase Storage as 100% safe backup.');
}

// ─── ROLLBACK: Restore original URLs ────────────────────────────────────────
async function rollback() {
    console.log('\n🔴 ROLLBACK: Restoring original PNG/JPG URLs in database...\n');

    if (!fs.existsSync(MAPPING_FILE)) {
        error('No mapping file found. Nothing to rollback.'); return;
    }

    const mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'));
    const entries = Object.entries(mapping);
    log(`Restoring ${entries.length} URL mappings across database...\n`);

    for (const [originalUrl, webpUrl] of entries) {
        await supabase.from('products').update({ image_url: originalUrl }).eq('image_url', webpUrl);
        await supabase.from('categories').update({ image_url: originalUrl }).eq('image_url', webpUrl);
        await supabase.from('projects').update({ image_url: originalUrl }).eq('image_url', webpUrl);
    }

    const { data: productsWithExtras } = await supabase
        .from('products')
        .select('id, extra_images')
        .not('extra_images', 'is', null);

    const reverseMapping = Object.fromEntries(entries.map(([orig, webp]) => [webp, orig]));

    for (const prod of productsWithExtras || []) {
        if (!Array.isArray(prod.extra_images)) continue;
        let changed = false;
        const restoredExtras = prod.extra_images.map(img => {
            if (reverseMapping[img]) {
                changed = true;
                return reverseMapping[img];
            }
            return img;
        });
        if (changed) {
            await supabase.from('products').update({ extra_images: restoredExtras }).eq('id', prod.id);
        }
    }

    console.log('\n📊 Rollback complete! All URLs restored to original.');
}

// ─── Entry Point ─────────────────────────────────────────────────────────────
const phase = process.argv[2];
const phaseMap = { phase1, phase2, phase3, rollback };

if (!phaseMap[phase]) {
    console.log(`
Usage:
  node scripts/migrate_to_webp.cjs phase1    # Convert & upload WebPs (safe, no DB changes)
  node scripts/migrate_to_webp.cjs phase2    # Verify all WebP URLs are accessible
  node scripts/migrate_to_webp.cjs phase3    # Update DB to point to WebP URLs
  node scripts/migrate_to_webp.cjs rollback  # Undo Phase 3 — restore original PNG URLs
    `);
    process.exit(0);
}

phaseMap[phase]().catch(e => { console.error('Fatal error:', e); process.exit(1); });
