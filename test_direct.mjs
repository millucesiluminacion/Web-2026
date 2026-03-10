import 'dotenv/config';

// Direct REST API test to bypass JS client cache
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

async function testDirect() {
    console.log('=== DIRECT REST API TEST ===\n');
    console.log('URL:', SUPABASE_URL);

    // Test badges table directly via REST
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/badges?select=*&limit=1`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        const body = await res.text();
        console.log(`badges: Status ${res.status} - ${body.substring(0, 200)}`);
    } catch (e) {
        console.log('badges: Fetch error -', e.message);
    }

    // Test product_badges table
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/product_badges?select=*&limit=1`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        const body = await res.text();
        console.log(`product_badges: Status ${res.status} - ${body.substring(0, 200)}`);
    } catch (e) {
        console.log('product_badges: Fetch error -', e.message);
    }

    // Test rating_avg column
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id,rating_avg,reviews_count&limit=1`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        const body = await res.text();
        console.log(`products.rating_avg: Status ${res.status} - ${body.substring(0, 200)}`);
    } catch (e) {
        console.log('products rating columns: Fetch error -', e.message);
    }

    // Trigger PostgREST schema cache reload
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
            method: 'HEAD',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        console.log(`\nSchema cache reload attempt: Status ${res.status}`);
    } catch (e) {
        console.log('Schema cache reload error:', e.message);
    }
}

testDirect();
