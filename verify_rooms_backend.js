import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMultiRoom() {
    console.log('--- STARTING BACKEND VERIFICATION ---');

    // 0. Create a temporary user to bypass RLS for inserts
    const randomEmail = `testuser${Date.now()}@milluces-test.com`;
    const password = 'testpassword123';

    console.log(`Creating temporary user: ${randomEmail}`);
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: randomEmail,
        password: password
    });

    if (authError) {
        console.error('FAILED: Could not create temp user.', authError);
        return;
    }
    console.log('Temporary user created and logged in.');

    // 1. Fetch existing rooms to use
    const { data: rooms, error: roomError } = await supabase.from('rooms').select('id, name').limit(2);
    if (roomError || rooms.length < 2) {
        console.error('FAILED: Not enough rooms to test.', roomError);
        return;
    }
    const roomIds = rooms.map(r => r.id);
    console.log(`Using Rooms: ${rooms.map(r => r.name).join(', ')}`);

    // 2. Create a Test Product
    const productPayload = {
        name: 'Backend Test Multi-Room Product',
        price: 99.99,
        stock: 10,
        description: 'Created by automated verification script'
    };

    const { data: product, error: prodError } = await supabase
        .from('products')
        .insert([productPayload])
        .select()
        .single();

    if (prodError) {
        console.error('FAILED: Could not create product.', prodError);
        return;
    }
    console.log(`Product Created: ${product.name} (ID: ${product.id})`);

    // 3. Create Relationships (Simulating what the UI does)
    const roomInserts = roomIds.map(roomId => ({
        product_id: product.id,
        room_id: roomId
    }));

    const { error: relError } = await supabase.from('product_rooms').insert(roomInserts);
    if (relError) {
        console.error('FAILED: Could not create relationships.', relError);
        return;
    }
    console.log('Relationships Created in product_rooms table.');

    // 4. Verify Fetching (Simulating Storefront Logic)
    // Query: Get product by ID and see if it has rooms
    const { data: verifyData, error: verifyError } = await supabase
        .from('products')
        .select('*, product_rooms(room_id)')
        .eq('id', product.id)
        .single();

    if (verifyError) {
        console.error('FAILED: Could not verify product data.', verifyError);
        return;
    }

    const linkedRooms = verifyData.product_rooms.length;
    console.log(`Verification: Product is linked to ${linkedRooms} rooms.`);

    if (linkedRooms === 2) {
        console.log('SUCCESS: Multi-room assignment works as expected!');
    } else {
        console.error('FAILED: Incorrect number of linked rooms.');
    }

    // 5. Cleanup
    await supabase.from('products').delete().eq('id', product.id);
    // Also delete the temp user? Ideally yes, but Supabase Admin API is needed for that. 
    // We can't delete the user with the user itself usually completely.
    // But we can leave the user, it is harmless in dev.

    console.log('Cleanup: Test product deleted.');
    console.log('--- VERIFICATION COMPLETE ---');
}

verifyMultiRoom();
