import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import 'dotenv/config';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testTables() {
    console.log('=== AUDIT: Testing table existence ===\n');

    // Test 1: badges table
    const { data: badgesData, error: badgesErr } = await supabase.from('badges').select('*').limit(1);
    if (badgesErr) {
        console.log('❌ Table "badges" does NOT exist:', badgesErr.message);
    } else {
        console.log('✅ Table "badges" exists. Rows:', badgesData.length);
    }

    // Test 2: product_badges table
    const { data: pbData, error: pbErr } = await supabase.from('product_badges').select('*').limit(1);
    if (pbErr) {
        console.log('❌ Table "product_badges" does NOT exist:', pbErr.message);
    } else {
        console.log('✅ Table "product_badges" exists. Rows:', pbData.length);
    }

    // Test 3: product_reviews table
    const { data: prData, error: prErr } = await supabase.from('product_reviews').select('*').limit(1);
    if (prErr) {
        console.log('❌ Table "product_reviews" does NOT exist:', prErr.message);
    } else {
        console.log('✅ Table "product_reviews" exists. Rows:', prData.length);
    }

    // Test 4: products columns rating_avg, reviews_count
    const { data: prodData, error: prodErr } = await supabase.from('products').select('id, rating_avg, reviews_count').limit(1);
    if (prodErr) {
        console.log('❌ Products table missing rating columns:', prodErr.message);
    } else {
        const sample = prodData[0];
        if (sample) {
            console.log('✅ Products table rating columns exist. Sample:', JSON.stringify({ rating_avg: sample.rating_avg, reviews_count: sample.reviews_count }));
        } else {
            console.log('⚠️ Products table exists but has no rows. Cannot verify rating columns.');
        }
    }

    // Test 5: trust_badges table
    const { data: tbData, error: tbErr } = await supabase.from('trust_badges').select('*').limit(1);
    if (tbErr) {
        console.log('❌ Table "trust_badges" does NOT exist:', tbErr.message);
    } else {
        console.log('✅ Table "trust_badges" exists. Rows:', tbData.length);
    }

    console.log('\n=== AUDIT COMPLETE ===');
}

testTables();
