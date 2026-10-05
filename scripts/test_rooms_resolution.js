import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function verify() {
  const { data: allRooms } = await supabase.from('rooms').select('id, name, slug');
  const testRoomIds = ['salon-comedor', 'salon', 'cocina', 'bano', 'exterior', 'dormitorio', 'pasillos', 'Garaje', 'garaje'];

  console.log('--- VERIFICANDO RESOLUCIÓN DE ESTANCIAS ---');
  for (const query of testRoomIds) {
    const resolved = (allRooms || []).find(r => 
      r.slug?.toLowerCase() === query?.toLowerCase() || 
      (query?.toLowerCase() === 'salon' && r.slug === 'salon-comedor') || 
      r.id === query
    );
    if (resolved) {
      const { count } = await supabase.from('product_rooms').select('*', { count: 'exact', head: true }).eq('room_id', resolved.id);
      console.log(`Query: ?room=${query.padEnd(14)} -> Resuelto: "${resolved.name}" (${resolved.slug}) -> Productos: ${count}`);
    } else {
      console.log(`Query: ?room=${query.padEnd(14)} -> NO RESUELTO`);
    }
  }
}
verify().catch(console.error);
