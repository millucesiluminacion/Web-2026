import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function diagnose() {
  const { data: cats } = await supabase.from('categories').select('*').order('name');
  const { data: rooms } = await supabase.from('rooms').select('*').order('name');
  const { data: rels } = await supabase.from('category_relationships').select('*');
  const { data: prods } = await supabase.from('products').select('id, name, category_id, room_id, is_active, parent_id');
  const { data: prodRooms } = await supabase.from('product_rooms').select('*');

  console.log('=== ESTANCIAS ===');
  for (const r of (rooms || [])) {
    const directCount = (prods || []).filter(p => p.room_id === r.id && p.is_active !== false && p.parent_id === null).length;
    const junctionCount = (prodRooms || []).filter(pr => pr.room_id === r.id).length;
    console.log(`Estancia: "${r.name}" | slug: "${r.slug}" | direct: ${directCount} | junction: ${junctionCount}`);
  }

  console.log('\n=== CATEGORÍAS ===');
  function gatherCatIds(id) {
    const ids = [id];
    const children = (rels || []).filter(r => r.parent_id === id).map(r => r.child_id);
    children.forEach(cid => ids.push(...gatherCatIds(cid)));
    return [...new Set(ids)];
  }

  let withProducts = 0;
  let withoutProducts = 0;
  for (const c of (cats || [])) {
    const scopedIds = gatherCatIds(c.id);
    const directCount = (prods || []).filter(p => p.category_id === c.id && p.is_active !== false && p.parent_id === null).length;
    const totalCount = (prods || []).filter(p => scopedIds.includes(p.category_id) && p.is_active !== false && p.parent_id === null).length;
    if (totalCount === 0) {
      withoutProducts++;
      console.log(`[0 PRODS] "${c.name}" | slug: "${c.slug}" | parent_id: "${c.parent_id}"`);
    } else {
      withProducts++;
      console.log(`[OK] "${c.name}" | slug: "${c.slug}" | direct: ${directCount} | total(hierarchy): ${totalCount}`);
    }
  }
  console.log(`\nResumen categorias: ${withProducts} con productos, ${withoutProducts} sin productos.`);
}

diagnose().catch(console.error);
