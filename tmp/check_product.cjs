
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fvfnpztjsqdiljudjmdl.supabase.co';
const supabaseKey = 'sb_publishable_r_KDpYwaFTzaISDu-9FdAw_XxUlufmo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProduct() {
    console.log('--- FETCHING PRODUCT ---');
    const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('slug', 'tira-led-220v-ip54-120-chips-m-10w-m')
        .single();

    if (error) {
        console.error('Error fetching product:', error.message);
        return;
    }

    console.log('Main Product ID:', product.id);
    console.log('Main Product Attributes:', JSON.stringify(product.attributes, null, 2));

    console.log('\n--- FETCHING VARIANTS ---');
    const { data: variants, error: vError } = await supabase
        .from('products')
        .select('*')
        .eq('parent_id', product.id);

    if (vError) {
        console.error('Error fetching variants:', vError.message);
        return;
    }

    console.log('Variants found:', variants.length);
    variants.forEach(v => {
        console.log(`Variant ID: ${v.id}, Ref: ${v.reference}, Stock: ${v.stock}, Attributes: ${JSON.stringify(v.attributes)}`);
    });
}

checkProduct();
