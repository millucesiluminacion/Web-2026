import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Search, Loader2, X, Package, Tag, Layers, Sofa, Award, Upload, Download, Copy, Save, CheckSquare, Square, ChevronDown, ChevronUp, Percent, AlertTriangle, BadgePercent, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import ImageUpload from '../../components/admin/ImageUpload';
import Papa from 'papaparse';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function ProductList() {
    const PREDEFINED_ATTRIBUTES = {
        "Color": ["Blanco", "Negro", "Gris", "Dorado", "Plateado", "Cobre", "Rojo", "Azul", "Verde", "Madera", "RGB", "Blanco Cálido", "Blanco Frío", "Blanco Neutro"],
        "Voltaje": ["DC 12V", "DC 24V", "220V AC"],
        "Potencia": ["3W", "5W", "6W", "7W", "7,2W", "9W", "10W", "12W", "14,4W", "15W", "18W", "20W", "24W", "30W", "36W", "40W", "48W", "50W", "60W", "72W", "100W", "150W", "200W"],
        "W/M": ["4,8 W/M", "7,2 W/M", "9,6 W/M", "10 W/M", "12 W/M", "14,4 W/M", "16 W/M", "19,2 W/M", "24 W/M"],
        "Temperatura": ["2700K", "3000K", "4000K", "5000K", "6000K", "CCT (Tricolor)", "RGB", "RGBW"],
        "Protección IP": ["IP20", "IP44", "IP54", "IP65", "IP67", "IP68"],
        "Longitud": ["1m", "2m", "3m", "5m", "10m", "25m", "50m"],
        "Material": ["Aluminio", "Acero", "Madera", "Cristal", "Acrílico", "PVC", "Policarbonato"],
        "CRI": ["CRI >80", "CRI >90", "CRI >95"]
    };

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [professions, setProfessions] = useState([]);
    const [allBadges, setAllBadges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterBrand, setFilterBrand] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'low_stock', 'no_image', 'on_offer'
    const [sortBy, setSortBy] = useState('created_at_desc'); // 'name_asc', 'name_desc', 'price_asc', 'price_desc', 'stock_asc', 'stock_desc', 'created_at_desc', 'created_at_asc'
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [activeTab, setActiveTab] = useState('general'); // 'general' | 'variants'

    // Bulk selection state
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [bulkAction, setBulkAction] = useState('');
    const [bulkValue, setBulkValue] = useState('');
    const [isBulkSaving, setIsBulkSaving] = useState(false);
    const [bulkToast, setBulkToast] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        reference: '',
        price: '',
        stock: 0,
        category_id: '',
        brand_id: '',
        room_ids: [],
        profession_ids: [],
        image_url: '',
        description: '',
        discount_price: '',
        partner_price: '',
        parent_id: null,
        is_by_meter: false,
        min_meters: 1,
        max_meters: 100,
        meter_step: 1,
        mandatory_accessory_ids: [],
        attributes: {},
        extra_images: [], // gallery images
        related_product_ids: [], // IDs of related products
        long_description: '', // New rich text description
        original_price: '', // PVP for discount calculation
        badge_tags: [], // Manual badges
        badge_ids: [], // IDs of dynamic badges
        is_active: true // Product visibility
    });

    // Variants State (only for editing parent products)
    const [variants, setVariants] = useState([]);

    // Attribute Input State
    const [newAttrKey, setNewAttrKey] = useState('');
    const [newAttrValue, setNewAttrValue] = useState('');

    useEffect(() => {
        fetchAllData();
    }, []);

    async function fetchAllData() {
        try {
            setLoading(true);

            // Fetch metadata first
            const [catRes, brandRes, roomRes, profRes] = await Promise.all([
                supabase.from('categories').select('id, name, parent_id, slug').order('name'),
                supabase.from('brands').select('id, name').order('name'),
                supabase.from('rooms').select('id, name').order('name'),
                supabase.from('professions').select('id, name').order('name')
            ]);

            let prodRes = await supabase.from('products')
                .select('*, categories(name), brands(name), product_rooms(room_id), product_professions(profession_id), product_badges(badges(*))')
                .order('created_at', { ascending: false });

            // Resilience: If product_badges or badges doesn't exist, retry simple fetch
            if (prodRes.error && (prodRes.error.message.includes('product_badges') || prodRes.error.message.includes('badges'))) {
                console.warn('Badges tables missing, retrying simple product fetch...');
                prodRes = await supabase.from('products')
                    .select('*, categories(name), brands(name), product_rooms(room_id), product_professions(profession_id)')
                    .order('created_at', { ascending: false });
            }

            // Fetch badges separately (table may not exist yet)
            let badgesResult = [];
            const { data: badgesData, error: badgesErr } = await supabase.from('badges').select('*').order('name');
            if (!badgesErr) {
                badgesResult = badgesData || [];
            }

            const allData = prodRes.data || [];

            // Hierarchical Sorting: Parents first, then their variants
            const parents = allData.filter(p => !p.parent_id);
            const variants = allData.filter(p => p.parent_id);

            const hierarchicalProducts = [];
            parents.forEach(parent => {
                // Add parent
                hierarchicalProducts.push({
                    ...parent,
                    room_ids: parent.product_rooms?.map(pr => pr.room_id) || [],
                    profession_ids: parent.product_professions?.map(pp => pp.profession_id) || []
                });

                // Find and add its children immediately after
                const children = variants.filter(v => v.parent_id === parent.id);
                children.forEach(child => {
                    hierarchicalProducts.push({
                        ...child,
                        room_ids: child.product_rooms?.map(pr => pr.room_id) || [],
                        profession_ids: child.product_professions?.map(pp => pp.profession_id) || []
                    });
                });
            });

            // Handle orphans (variants whose parent was deleted or not found)
            const addedIds = new Set(hierarchicalProducts.map(p => p.id));
            const orphans = variants.filter(v => !addedIds.has(v.id));
            orphans.forEach(orphan => {
                hierarchicalProducts.push({
                    ...orphan,
                    room_ids: orphan.product_rooms?.map(pr => pr.room_id) || [],
                    profession_ids: orphan.product_professions?.map(pp => pp.profession_id) || []
                });
            });

            setProducts(hierarchicalProducts);
            setCategories(catRes.data || []);
            setBrands(brandRes.data || []);
            setRooms(roomRes.data || []);
            setProfessions(profRes.data || []);
            setAllBadges(badgesResult);
        } catch (error) {
            console.error('Error fetching data:', error.message);
        } finally {
            setLoading(false);
        }
    }


    // Helper to generate SEO-friendly slug
    function generateSlug(name, reference) {
        if (!name) return '';
        let slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        if (reference) {
            slug += '-' + reference.toLowerCase().replace(/[^a-z0-9]+/g, '');
        }
        return slug;
    }

    // --- CSV IMPORT LOGIC ---
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true, // Auto-convert numbers/booleans
            complete: async (results) => {
                if (results.data && results.data.length > 0) {
                    await processImport(results.data);
                } else {
                    alert('El archivo CSV parece estar vacío o no tiene el formato correcto.');
                }
                event.target.value = ''; // Reset to allow re-uploading same file
            },
            error: (error) => {
                alert('Error al leer CSV: ' + error.message);
                event.target.value = '';
            }
        });
    };


    async function processImport(rows) {
        setIsSaving(true);
        try {
            let processed = 0;
            let errors = 0;

            // 1. Separate Parents (Originals) and Variants (Children)
            const parents = [];
            const variants = [];

            rows.forEach(row => {
                // Assuming "SKU de productos originales" is empty for parents, or matches their own SKU
                const skuOriginal = row['SKU de productos originales']?.trim();
                const sku = row['SKU']?.trim();

                if (!skuOriginal || skuOriginal === sku) {
                    parents.push(row);
                } else {
                    variants.push(row);
                }
            });

            // Helper to find category ID by name
            const getCategoryId = (catName) => {
                if (!catName) return null;
                const cat = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
                return cat ? cat.id : null;
            };

            // 2. Insert Parents First
            const parentMap = new Map(); // SKU -> Database ID

            for (const row of parents) {
                try {
                    const price = parseFloat(row['Precio de venta']?.replace(',', '.') || row['Precio']?.replace('€', '').replace(',', '.').trim() || 0);
                    const partner_price = parseFloat(row['Precio Socio']?.replace(',', '.') || 0);
                    const payload = {
                        reference: row['SKU'],
                        name: row['Nombre'],
                        description: row['Descripción'],
                        price: isNaN(price) ? 0 : price,
                        partner_price: isNaN(partner_price) ? 0 : partner_price,
                        stock: parseInt(row['CANT.'] || 0),
                        image_url: row['URL de la imagen'],
                        category_id: getCategoryId(row['Categorías']),
                        attributes: parseAttributes(row['Opciones']),
                        parent_id: null,
                        slug: generateSlug(row['Nombre'], row['SKU'])
                    };

                    // Check if exists to update or insert
                    const { data: existing } = await supabase.from('products').select('id').eq('reference', payload.reference).maybeSingle();

                    let productId;
                    if (existing) {
                        // Update existing parent
                        let res = await supabase.from('products').update(payload).eq('id', existing.id);
                        if (res.error && res.error.message.includes('is_active')) {
                            const { is_active, ...resilientPayload } = payload;
                            res = await supabase.from('products').update(resilientPayload).eq('id', existing.id);
                        }
                        productId = existing.id;
                    } else {
                        let res = await supabase.from('products').insert([payload]).select().maybeSingle();
                        if (res.error && res.error.message.includes('is_active')) {
                            const { is_active, ...resilientPayload } = payload;
                            res = await supabase.from('products').insert([resilientPayload]).select().maybeSingle();
                        }
                        if (res.error) throw res.error;
                        productId = res.data.id;
                    }

                    parentMap.set(payload.reference, productId);
                    processed++;
                } catch (err) {
                    console.error('Error importing parent:', row['SKU'], err);
                    errors++;
                }
            }

            // 3. Insert Variants linked to Parents
            for (const row of variants) {
                try {
                    const parentSku = row['SKU de productos originales']?.trim();
                    let finalParentId = parentMap.get(parentSku);

                    // If not found in current batch map, try searching in DB
                    if (!finalParentId) {
                        const { data: dbParent } = await supabase.from('products').select('id').eq('reference', parentSku).maybeSingle();
                        finalParentId = dbParent?.id;
                    }

                    if (!finalParentId) {
                        console.warn(`Parent not found for variant ${row['SKU']} (Parent SKU: ${parentSku})`);
                        errors++;
                        continue;
                    }

                    const price = parseFloat(row['Precio de venta']?.replace(',', '.') || row['Precio']?.replace('€', '').replace(',', '.').trim() || 0);
                    const partner_price = parseFloat(row['Precio Socio']?.replace(',', '.') || 0);
                    const payload = {
                        reference: row['SKU'],
                        name: row['Nombre'],
                        description: row['Descripción'],
                        price: isNaN(price) ? 0 : price,
                        partner_price: isNaN(partner_price) ? 0 : partner_price,
                        stock: parseInt(row['CANT.'] || 0),
                        image_url: row['URL de la imagen'],
                        category_id: getCategoryId(row['Categorías']), // Inherit category?
                        parent_id: finalParentId,
                        attributes: parseAttributes(row['Opciones']),
                        slug: generateSlug(row['Nombre'], row['SKU'])
                    };

                    // Check if exists
                    const { data: existing } = await supabase.from('products').select('id').eq('reference', payload.reference).maybeSingle();

                    if (existing) {
                        let res = await supabase.from('products').update(payload).eq('id', existing.id);
                        if (res.error && res.error.message.includes('is_active')) {
                            const { is_active, ...resilientPayload } = payload;
                            await supabase.from('products').update(resilientPayload).eq('id', existing.id);
                        }
                    } else {
                        let res = await supabase.from('products').insert([payload]);
                        if (res.error && res.error.message.includes('is_active')) {
                            const { is_active, ...resilientPayload } = payload;
                            await supabase.from('products').insert([resilientPayload]);
                        }
                    }

                    processed++;

                } catch (err) {
                    console.error('Error importing variant:', row['SKU'], err);
                    errors++;
                }
            }

            alert(`Importación completada.\nProcesados: ${processed}\nErrores: ${errors}`);
            fetchAllData();

        } catch (error) {
            alert('Error global en importación: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    }

    function parseAttributes(optionsString) {
        // format: "Color: Rojo; Talla: XL" or similar
        // Adjust regex based on real data if needed
        if (!optionsString) return {};
        const attrs = {};
        // Split by ';' or newlines if any
        optionsString.split(/[;\n]+/).forEach(pair => {
            if (!pair.includes(':')) return;
            const [key, value] = pair.split(':');
            if (key && value) {
                attrs[key.trim()] = value.trim();
            }
        });
        return attrs;
    }

    // --- ATTR REORDERING LOGIC ---
    const reorderAttribute = (key, direction) => {
        setFormData(prev => {
            const entries = Object.entries(prev.attributes || {});
            const index = entries.findIndex(([k]) => k === key);
            if (index === -1) return prev;

            const newIndex = direction === 'up' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= entries.length) return prev;

            const newEntries = [...entries];
            [newEntries[index], newEntries[newIndex]] = [newEntries[newIndex], newEntries[index]];

            return {
                ...prev,
                attributes: Object.fromEntries(newEntries)
            };
        });
    };

    // --- CSV EXPORT LOGIC ---
    const handleExport = () => {
        // Convert products to CSV format
        // We want to export ALL products, flattened
        const csvData = products.map(p => {
            // Find parent SKU if exists (from local state 'products' which has all)
            // Optimization: Create a map for faster lookup if list is huge, but map loop is fine for now
            const parent = p.parent_id ? products.find(parent => parent.id === p.parent_id) : null;

            // Format attributes back to string "Key: Value; Key2: Value2"
            let optionsStr = "";
            if (p.attributes) {
                optionsStr = Object.entries(p.attributes)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join('; ');
            }

            return {
                "SKU": p.reference || "",
                "Nombre": p.name || "",
                "ID alternativa": "",
                "Opciones": optionsStr,
                "Categorías": p.categories?.name || "",
                "SKU de productos originales": parent ? parent.reference : "",
                "Precio": `${p.price} €`,
                "Precio de venta": p.price,
                "Precio Socio": p.partner_price || 0,
                "Moneda": "EUR",
                "Descripción": p.description || "",
                "Inventario de seguimiento": "by product",
                "CANT.": p.stock,
                "Pedido pendiente": "0",
                "Oculto": "0",
                "URL de la imagen": p.image_url || ""
            };
        });

        const csv = Papa.unparse(csvData, {
            quotes: true, // Force quotes to avoid delimiter issues
            delimiter: ",",
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'productos_exportados.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    function openEdit(product) {
        setEditingId(product.id);
        setActiveTab('general');
        setFormData({
            name: product.name,
            reference: product.reference || '',
            price: product.price,
            stock: product.stock || 0,
            category_id: product.category_id || '',
            brand_id: product.brand_id || '',
            room_ids: product.room_ids || [],
            profession_ids: [],
            image_url: product.image_url || '',
            description: product.description || '',
            discount_price: product.discount_price || '',
            partner_price: product.partner_price || '',
            professional_price: product.professional_price || '',
            is_active: product.is_active !== false,
            is_by_meter: product.is_by_meter || false,
            min_meters: product.min_meters || 1,
            max_meters: product.max_meters || 100,
            meter_step: product.meter_step || 1,
            mandatory_accessory_ids: product.mandatory_accessory_ids || [],
            volume_pricing: product.volume_pricing || { individual: [], profesional: [], partner: [] },
            parent_id: product.parent_id,
            attributes: product.attributes || {},
            extra_images: product.extra_images || [],
            related_product_ids: product.related_product_ids || [],
            long_description: product.long_description || '',
            original_price: product.original_price || '',
            badge_tags: product.badge_tags || [],
            badge_ids: [],
            is_active: product.is_active !== false // default to true
        });


        // Load relations
        loadProductRelations(product.id);

        // Load variants if it is a parent
        if (!product.parent_id) {
            const productVariants = products.filter(p => p.parent_id === product.id)
                .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
            setVariants(productVariants);
        } else {
            setVariants([]);
        }

        setIsModalOpen(true);
    }

    function handleDuplicate(product) {
        // Open as edit to load everything (relations, variants, etc)
        openEdit(product);
        // Then convert it to "New Product" mode
        setEditingId(null);
        // Append (Copia) to name to distinguish it
        setFormData(prev => ({
            ...prev,
            name: `${prev.name} (Copia)`,
            reference: prev.reference ? `${prev.reference}-copy` : ''
        }));
    }

    async function moveVariant(variantId, direction) {
        const index = variants.findIndex(v => v.id === variantId);
        if (index === -1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= variants.length) return;

        const newVariants = [...variants];
        const [movedItem] = newVariants.splice(index, 1);
        newVariants.splice(newIndex, 0, movedItem);

        // Update order_index for all variants
        const updatedVariants = newVariants.map((v, i) => ({ ...v, order_index: i }));
        setVariants(updatedVariants);

        // Persist to database
        try {
            const updates = updatedVariants.map(v =>
                supabase.from('products').update({ order_index: v.order_index }).eq('id', v.id)
            );
            await Promise.all(updates);
        } catch (error) {
            console.error("Error updating variant order:", error);
        }
    }

    async function loadProductRelations(productId) {
        try {
            const [roomsData, profsData] = await Promise.all([
                supabase.from('product_rooms').select('room_id').eq('product_id', productId),
                supabase.from('product_professions').select('profession_id').eq('product_id', productId)
            ]);

            // Try loading badges separately (table may not exist)
            let badgeIds = [];
            const { data: badgesData, error: badgesLoadErr } = await supabase.from('product_badges').select('badge_id').eq('product_id', productId);
            if (!badgesLoadErr && badgesData) {
                badgeIds = badgesData.map(b => b.badge_id);
            }

            setFormData(prev => ({
                ...prev,
                room_ids: roomsData.data?.map(r => r.room_id) || [],
                profession_ids: profsData.data?.map(p => p.profession_id) || [],
                badge_ids: badgeIds
            }));
        } catch (error) {
            console.error("Error loading relations:", error);
        }
    }

    function openCreate() {
        setEditingId(null);
        setActiveTab('general');
        setFormData({
            name: '', reference: '', price: '', stock: 0,
            category_id: '', brand_id: '', room_ids: [], profession_ids: [],
            image_url: '', description: '', discount_price: '', partner_price: '',
            professional_price: '',
            volume_pricing: { individual: [], profesional: [], partner: [] },
            parent_id: null, attributes: {}, extra_images: [],
            related_product_ids: [], long_description: '', original_price: '',
            badge_tags: [], badge_ids: [],
            is_active: true,
            is_by_meter: false,
            min_meters: 1,
            max_meters: 100,
            meter_step: 1,
            mandatory_accessory_ids: []
        });

        setVariants([]);
        setIsModalOpen(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            setIsSaving(true);
            const payload = {
                name: formData.name,
                reference: formData.reference,
                price: parseFloat(formData.price),
                stock: parseInt(formData.stock),
                category_id: formData.category_id || null,
                brand_id: formData.brand_id || null,
                image_url: formData.image_url,
                description: formData.description,
                discount_price: formData.discount_price ? parseFloat(formData.discount_price) : null,
                partner_price: formData.partner_price ? parseFloat(formData.partner_price) : null,
                professional_price: formData.professional_price ? parseFloat(formData.professional_price) : null,
                volume_pricing: formData.volume_pricing || { individual: [], profesional: [], partner: [] },
                attributes: formData.attributes,
                parent_id: formData.parent_id,
                extra_images: formData.extra_images || [],
                slug: generateSlug(formData.name, formData.reference),
                related_product_ids: formData.related_product_ids || [],
                long_description: formData.long_description,
                original_price: formData.original_price ? parseFloat(formData.original_price) : null,
                badge_tags: formData.badge_tags || [],
                is_active: formData.is_active,
                is_by_meter: formData.is_by_meter,
                min_meters: formData.min_meters,
                max_meters: formData.max_meters,
                meter_step: formData.meter_step,
                mandatory_accessory_ids: formData.mandatory_accessory_ids || []
            };


            let productId = editingId;

            if (editingId) {
                let res = await supabase.from('products').update(payload).eq('id', editingId);
                if (res.error && res.error.message.includes('is_active')) {
                    console.warn('Saving without is_active...');
                    const { is_active, ...resilientPayload } = payload;
                    res = await supabase.from('products').update(resilientPayload).eq('id', editingId);
                }
                if (res.error) throw res.error;
            } else {
                let res = await supabase.from('products').insert([payload]).select().maybeSingle();
                if (res.error && res.error.message.includes('is_active')) {
                    console.warn('Inserting without is_active...');
                    const { is_active, ...resilientPayload } = payload;
                    res = await supabase.from('products').insert([resilientPayload]).select().maybeSingle();
                }
                if (res.error) throw res.error;
                productId = res.data.id;
            }


            if (productId) {
                // Save Rooms
                await supabase.from('product_rooms').delete().eq('product_id', productId);
                if (formData.room_ids.length > 0) {
                    const roomInserts = formData.room_ids.map(roomId => ({
                        product_id: productId,
                        room_id: roomId
                    }));
                    await supabase.from('product_rooms').insert(roomInserts);
                }

                // Save Professions (Sectores B2B)
                await supabase.from('product_professions').delete().eq('product_id', productId);
                if (formData.profession_ids.length > 0) {
                    const profInserts = formData.profession_ids.map(profId => ({
                        product_id: productId,
                        profession_id: profId
                    }));
                    await supabase.from('product_professions').insert(profInserts);
                }

                // Save Dynamic Badges (table may not exist)
                const { error: delBadgeErr } = await supabase.from('product_badges').delete().eq('product_id', productId);
                if (!delBadgeErr && formData.badge_ids && formData.badge_ids.length > 0) {
                    const badgeInserts = formData.badge_ids.map(badgeId => ({
                        product_id: productId,
                        badge_id: badgeId
                    }));
                    await supabase.from('product_badges').insert(badgeInserts);
                }
            }

            alert(editingId ? 'Producto actualizado con éxito' : 'Producto creado con éxito');
            setIsModalOpen(false);
            fetchAllData();
        } catch (error) {
            alert('Error al guardar: ' + error.message);
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    }

    async function deleteProduct(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar este producto? Si tiene variantes, estas también se eliminarán.')) return;
        try {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) {
                console.error("Delete error details:", error);
                throw new Error(error.message || "Error desconocido al eliminar");
            }
            setProducts(prev => prev.filter(p => p.id !== id && p.parent_id !== id));
            alert('Producto (y sus variantes si existían) eliminado correctamente.');
        } catch (error) {
            alert('Error al eliminar: ' + error.message);
        }
    }

    // Helper to add attribute value (multi-valor: arrays)
    const addAttribute = () => {
        if (!newAttrKey || !newAttrValue) return;
        setFormData(prev => {
            const currentValues = Array.isArray(prev.attributes[newAttrKey])
                ? prev.attributes[newAttrKey]
                : prev.attributes[newAttrKey]
                    ? [prev.attributes[newAttrKey]] // migrar valor único a array
                    : [];
            // Evitar duplicados
            if (currentValues.includes(newAttrValue)) {
                setNewAttrValue('');
                return prev;
            }
            return {
                ...prev,
                attributes: {
                    ...prev.attributes,
                    [newAttrKey]: [...currentValues, newAttrValue]
                }
            };
        });
        setNewAttrValue(''); // Solo limpiar valor, mantener clave para añadir más
    };

    // Eliminar un valor concreto de un atributo
    const removeAttributeValue = (key, value) => {
        setFormData(prev => {
            const currentValues = Array.isArray(prev.attributes[key])
                ? prev.attributes[key]
                : [prev.attributes[key]];
            const newValues = currentValues.filter(v => v !== value);
            const newAttrs = { ...prev.attributes };
            if (newValues.length === 0) {
                delete newAttrs[key]; // Eliminar clave si no quedan valores
            } else {
                newAttrs[key] = newValues;
            }
            return { ...prev, attributes: newAttrs };
        });
    };

    // Eliminar todo un grupo de atributos
    const removeAttributeGroup = (key) => {
        const newAttrs = { ...formData.attributes };
        delete newAttrs[key];
        setFormData(prev => ({ ...prev, attributes: newAttrs }));
    };

    const filteredProducts = useMemo(() => {
        // 1. First, apply primitive filters to all products
        const baseFiltered = products.filter(p => {
            const matchSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.reference?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchCategory = !filterCategory || p.category_id === filterCategory;
            const matchBrand = !filterBrand || p.brand_id === filterBrand;

            let matchStatus = true;
            if (filterStatus === 'low_stock') matchStatus = (p.stock || 0) < 5;
            if (filterStatus === 'no_image') matchStatus = !p.image_url;
            if (filterStatus === 'on_offer') matchStatus = p.discount_price && parseFloat(p.discount_price) > 0;
            if (filterStatus === 'draft') matchStatus = p.is_active === false;
            if (filterStatus === 'published') matchStatus = p.is_active !== false;

            return matchSearch && matchCategory && matchBrand && matchStatus;
        });

        // 2. Separate parents and variants
        const parents = baseFiltered.filter(p => !p.parent_id);
        const variantsMap = {};

        // We look for variants in the FULL products list to ensure they appear if the parent is visible
        products.forEach(p => {
            if (p.parent_id) {
                if (!variantsMap[p.parent_id]) variantsMap[p.parent_id] = [];
                // Only include variants that match the base filters too
                const matchSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.reference?.toLowerCase().includes(searchQuery.toLowerCase());
                const matchStatus = filterStatus === 'all' || (
                    (filterStatus === 'low_stock' && (p.stock || 0) < 5) ||
                    (filterStatus === 'no_image' && !p.image_url) ||
                    (filterStatus === 'on_offer' && p.discount_price && parseFloat(p.discount_price) > 0)
                );

                if (matchSearch && matchStatus) {
                    variantsMap[p.parent_id].push(p);
                }
            }
        });

        // 3. Sort parents
        parents.sort((a, b) => {
            switch (sortBy) {
                case 'name_asc': return a.name.localeCompare(b.name);
                case 'name_desc': return b.name.localeCompare(a.name);
                case 'price_asc': return parseFloat(a.price) - parseFloat(b.price);
                case 'price_desc': return parseFloat(b.price) - parseFloat(a.price);
                case 'stock_asc': return (a.stock || 0) - (b.stock || 0);
                case 'stock_desc': return (b.stock || 0) - (a.stock || 0);
                case 'created_at_asc': return new Date(a.created_at) - new Date(b.created_at);
                case 'created_at_desc': return new Date(b.created_at) - new Date(a.created_at);
                default: return 0;
            }
        });

        // 4. Flatten hierarchy: Parent -> its variants
        const final = [];
        parents.forEach(parent => {
            final.push(parent);
            if (variantsMap[parent.id]) {
                const sortedVariants = [...variantsMap[parent.id]].sort((a, b) => {
                    if (a.order_index !== undefined && b.order_index !== undefined) {
                        return a.order_index - b.order_index;
                    }
                    return a.name.localeCompare(b.name);
                });
                final.push(...sortedVariants);
            }
        });

        // 5. Detect and add filtered "orphan" variants (variants whose parent didn't match filters)
        baseFiltered.forEach(p => {
            if (p.parent_id && !final.find(f => f.id === p.id)) {
                final.push(p);
            }
        });

        return final;
    }, [products, searchQuery, filterCategory, filterBrand, filterStatus, sortBy]);

    // Bulk selection helpers
    const allFilteredIds = filteredProducts.map(p => p.id);
    const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.has(id));
    const someSelected = selectedIds.size > 0;

    function toggleSelect(id) {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    function toggleSelectAll() {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(allFilteredIds));
        }
    }

    async function executeBulkAction() {
        if (!bulkAction || selectedIds.size === 0) return;
        setIsBulkSaving(true);
        const ids = Array.from(selectedIds);
        try {
            if (bulkAction === 'category' && bulkValue) {
                await supabase.from('products').update({ category_id: bulkValue }).in('id', ids);
                setBulkToast(`Categoría actualizada en ${ids.length} productos`);
            } else if (bulkAction === 'brand' && bulkValue) {
                await supabase.from('products').update({ brand_id: bulkValue }).in('id', ids);
                setBulkToast(`Marca actualizada en ${ids.length} productos`);
            } else if (bulkAction === 'discount' && bulkValue) {
                const pct = parseFloat(bulkValue) / 100;
                for (const id of ids) {
                    const prod = products.find(p => p.id === id);
                    if (prod) {
                        const discountPrice = parseFloat((prod.price * (1 - pct)).toFixed(2));
                        await supabase.from('products').update({ discount_price: discountPrice }).eq('id', id);
                    }
                }
                setBulkToast(`Descuento del ${bulkValue}% aplicado a ${ids.length} productos`);
            } else if (bulkAction === 'set_stock') {
                await supabase.from('products').update({ stock: parseInt(bulkValue) }).in('id', ids);
                setBulkToast(`Stock actualizado a ${bulkValue} uds. en ${ids.length} productos`);
            } else if (bulkAction === 'remove_discount') {
                await supabase.from('products').update({ discount_price: null }).in('id', ids);
                setBulkToast(`Oferta eliminada de ${ids.length} productos`);
            } else if (bulkAction === 'delete') {
                if (!window.confirm(`¿Eliminar ${ids.length} productos? Esta acción no se puede deshacer.`)) {
                    setIsBulkSaving(false);
                    return;
                }
                await supabase.from('products').delete().in('id', ids);
                setBulkToast(`${ids.length} productos eliminados`);
            }
            await fetchAllData();
            setSelectedIds(new Set());
            setBulkAction('');
            setBulkValue('');
            setTimeout(() => setBulkToast(''), 3500);
        } catch (err) {
            console.error('Bulk action error:', err);
            setBulkToast('Error: ' + err.message);
        } finally {
            setIsBulkSaving(false);
        }
    }


    return (
        <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 font-outfit">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter">Gestión de Productos</h1>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[.3em] mt-3">Inventario Maestro v2.6</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                    <label className={`bg-white border border-gray-200 text-gray-600 h-14 px-6 rounded-2xl flex items-center gap-3 hover:border-primary transition-all font-black uppercase italic shadow-sm text-[10px] font-outfit ${isSaving ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}>
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        ) : (
                            <Upload className="w-4 h-4 text-primary" />
                        )}
                        {isSaving ? 'Procesando...' : 'Importar CSV'}
                        <input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={isSaving}
                        />
                    </label>

                    <button
                        onClick={handleExport}
                        className="bg-white border border-gray-200 text-gray-600 h-14 px-6 rounded-2xl flex items-center gap-3 hover:border-primary transition-all font-black uppercase italic shadow-sm text-[10px] font-outfit"
                    >
                        <Download className="w-4 h-4 text-primary" /> Exportar CSV
                    </button>
                    <button
                        onClick={openCreate}
                        className="bg-brand-carbon text-white h-14 px-8 rounded-2xl flex items-center gap-3 hover:bg-primary transition-all font-black uppercase italic text-[10px] shadow-xl shadow-brand-carbon/10 group font-outfit"
                    >
                        <Plus className="w-4 h-4 text-primary group-hover:rotate-90 transition-transform" /> Nuevo Producto
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden mb-12">

                {/* Bulk action toolbar */}
                {someSelected && (
                    <div className="flex flex-wrap items-center gap-3 px-6 py-4 bg-primary/5 border-b border-primary/10 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 mr-2">
                            <CheckSquare className="w-4 h-4 text-primary" />
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                                {selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {/* Cambiar categoría */}
                        <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 px-3 py-2 shadow-sm">
                            <Layers className="w-3.5 h-3.5 text-gray-400" />
                            <select
                                className="text-[10px] font-black uppercase text-gray-600 focus:outline-none bg-transparent"
                                value={bulkAction === 'category' ? bulkValue : ''}
                                onChange={e => { setBulkAction('category'); setBulkValue(e.target.value); }}
                            >
                                <option value="">Cambiar Sección...</option>
                                {categories.filter(c => !c.parent_id).map(parent => (
                                    <optgroup key={parent.id} label={parent.name}>
                                        <option value={parent.id}>{parent.name} (general)</option>
                                        {categories.filter(c => c.parent_id === parent.id).map(sub => (
                                            <option key={sub.id} value={sub.id}>&nbsp;&nbsp;{sub.name}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>

                        {/* Cambiar marca */}
                        <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 px-3 py-2 shadow-sm">
                            <Award className="w-3.5 h-3.5 text-gray-400" />
                            <select
                                className="text-[10px] font-black uppercase text-gray-600 focus:outline-none bg-transparent"
                                value={bulkAction === 'brand' ? bulkValue : ''}
                                onChange={e => { setBulkAction('brand'); setBulkValue(e.target.value); }}
                            >
                                <option value="">Cambiar Marca...</option>
                                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>

                        {/* Descuento % */}
                        <div className="flex items-center gap-1.5 bg-white rounded-xl border border-gray-100 px-3 py-2 shadow-sm">
                            <Percent className="w-3.5 h-3.5 text-gray-400" />
                            <input
                                type="number"
                                min="1" max="99"
                                placeholder="% Dto."
                                className="w-16 text-[10px] font-black text-gray-600 focus:outline-none bg-transparent"
                                value={bulkAction === 'discount' ? bulkValue : ''}
                                onChange={e => { setBulkAction('discount'); setBulkValue(e.target.value); }}
                            />
                        </div>

                        {/* Stock */}
                        <div className="flex items-center gap-1.5 bg-white rounded-xl border border-gray-100 px-3 py-2 shadow-sm">
                            <Package className="w-3.5 h-3.5 text-gray-400" />
                            <input
                                type="number"
                                min="0"
                                placeholder="Stock uds."
                                className="w-20 text-[10px] font-black text-gray-600 focus:outline-none bg-transparent"
                                value={bulkAction === 'set_stock' ? bulkValue : ''}
                                onChange={e => { setBulkAction('set_stock'); setBulkValue(e.target.value); }}
                            />
                        </div>

                        {/* Quitar oferta */}
                        <button
                            onClick={() => { setBulkAction('remove_discount'); setBulkValue(''); }}
                            className={`text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border transition-all ${bulkAction === 'remove_discount'
                                ? 'bg-amber-500 text-white border-amber-500'
                                : 'bg-white text-gray-500 border-gray-100 hover:border-amber-300 hover:text-amber-600'
                                }`}
                        >
                            Quitar Oferta
                        </button>

                        {/* Eliminar */}
                        <button
                            onClick={() => { setBulkAction('delete'); setBulkValue(''); }}
                            className={`text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border transition-all ${bulkAction === 'delete'
                                ? 'bg-red-500 text-white border-red-500'
                                : 'bg-white text-red-400 border-gray-100 hover:border-red-300'
                                }`}
                        >
                            <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                            Eliminar
                        </button>

                        {/* Aplicar */}
                        <button
                            onClick={executeBulkAction}
                            disabled={!bulkAction || isBulkSaving}
                            className="ml-auto bg-primary text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/80 transition-all disabled:opacity-40 shadow-lg shadow-primary/20 flex items-center gap-2"
                        >
                            {isBulkSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                            Aplicar
                        </button>

                        {/* Deseleccionar */}
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="text-[9px] font-black uppercase text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>

                        {bulkToast && (
                            <div className="w-full text-[9px] font-black text-green-700 bg-green-50 px-4 py-2 rounded-xl border border-green-100">
                                ✓ {bulkToast}
                            </div>
                        )}
                    </div>
                )}

                <div className="p-6 border-b border-gray-50 flex flex-wrap items-center gap-4 bg-gray-50/30">
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, referencia o SKU..."
                            className="w-full h-12 pl-14 pr-6 bg-white border-none rounded-2xl text-[11px] font-bold tracking-tight focus:ring-2 focus:ring-primary/20 transition-all font-outfit shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Quick filters */}
                    <select
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                        className="h-12 px-4 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                    >
                        <option value="">Todas las categorías</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                    <select
                        value={filterBrand}
                        onChange={e => setFilterBrand(e.target.value)}
                        className="h-12 px-4 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                    >
                        <option value="">Todas las marcas</option>
                        {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>

                    {/* Status Filter */}
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="h-12 px-4 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                    >
                        <option value="all">Filtro Estado: Todos</option>
                        <option value="published">🟢 Publicados</option>
                        <option value="draft">📁 Borradores</option>
                        <option value="low_stock">⚠️ Stock Bajo (&lt;5)</option>
                        <option value="no_image">🖼️ Sin Imagen</option>
                        <option value="on_offer">🏷️ En Oferta</option>
                    </select>

                    {/* Sort Selector */}
                    <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl h-12 px-4 shadow-sm">
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value)}
                            className="text-[10px] font-black uppercase text-brand-carbon focus:outline-none bg-transparent"
                        >
                            <option value="created_at_desc">Más Nuevos</option>
                            <option value="created_at_asc">Más Antiguos</option>
                            <option value="name_asc">Nombre (A-Z)</option>
                            <option value="name_desc">Nombre (Z-A)</option>
                            <option value="price_asc">Precio (Menor a Mayor)</option>
                            <option value="price_desc">Precio (Mayor a Menor)</option>
                            <option value="stock_desc">Más Stock</option>
                            <option value="stock_asc">Menos Stock</option>
                        </select>
                    </div>

                    {(filterCategory || filterBrand || filterStatus !== 'all' || sortBy !== 'created_at_desc') && (
                        <button
                            onClick={() => { setFilterCategory(''); setFilterBrand(''); setFilterStatus('all'); setSortBy('created_at_desc'); }}
                            className="text-[9px] font-black uppercase text-gray-400 hover:text-primary transition-colors flex items-center gap-1"
                        >
                            <X className="w-3 h-3" /> Limpiar
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p className="text-xs font-black uppercase tracking-widest opacity-50">Sincronizando inventario...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left font-outfit">
                            <thead className="bg-gray-50/50 uppercase text-[9px] font-black text-gray-400 border-b border-gray-100 tracking-[0.2em]">
                                <tr>
                                    <th className="p-4 pl-6 w-10">
                                        <button
                                            onClick={toggleSelectAll}
                                            className="text-gray-300 hover:text-primary transition-colors"
                                            title={allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
                                        >
                                            {allSelected
                                                ? <CheckSquare className="w-4 h-4 text-primary" />
                                                : <Square className="w-4 h-4" />
                                            }
                                        </button>
                                    </th>
                                    <th className="p-4">Producto</th>
                                    <th className="p-4">Categoría / Atributos / Badges</th>
                                    <th className="p-4">Precio / Stock</th>
                                    <th className="p-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredProducts.length > 0 ? filteredProducts.map(product => (
                                    <tr
                                        key={product.id}
                                        className={`hover:bg-gray-50/70 transition-all duration-200 group ${selectedIds.has(product.id) ? 'bg-primary/5' : product.parent_id ? 'bg-gray-50/20' : ''
                                            }`}
                                    >
                                        {/* Checkbox */}
                                        <td className="pl-6 w-10">
                                            <div className="flex flex-col items-center gap-2 mt-1">
                                                <button
                                                    onClick={() => toggleSelect(product.id)}
                                                    className="text-gray-200 hover:text-primary transition-colors"
                                                >
                                                    {selectedIds.has(product.id)
                                                        ? <CheckSquare className="w-4 h-4 text-primary" />
                                                        : <Square className="w-4 h-4" />
                                                    }
                                                </button>
                                                <div
                                                    className={`w-1.5 h-1.5 rounded-full ${product.is_active !== false ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-gray-300'}`}
                                                    title={product.is_active !== false ? 'Publicado' : 'Borrador'}
                                                ></div>
                                            </div>
                                        </td>

                                        {/* Producto */}
                                        <td className="p-4">
                                            <div className="flex items-center gap-4">
                                                {product.parent_id && (
                                                    <div className="flex items-center">
                                                        <div className="w-6 border-l-2 border-b-2 border-gray-200 h-6 rounded-bl-lg ml-2 mr-2 opacity-40 -mt-2"></div>
                                                    </div>
                                                )}
                                                <div className={`w-12 h-12 bg-white rounded-xl border border-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center p-1.5 transition-all duration-300 ${product.parent_id ? 'w-10 h-10' : 'group-hover:shadow-md'}`}>
                                                    {product.image_url
                                                        ? <img src={product.image_url} alt={product.name} className="w-full h-full object-contain" />
                                                        : <Package className={`text-gray-200 ${product.parent_id ? 'w-4 h-4' : 'w-5 h-5'}`} />
                                                    }
                                                </div>
                                                <div className={product.parent_id ? 'opacity-80' : ''}>
                                                    <p className={`font-black text-brand-carbon uppercase italic text-xs tracking-tight leading-none mb-1 ${product.parent_id ? 'text-[10px]' : ''
                                                        }`}>
                                                        {product.name}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[8px] text-gray-400 font-black uppercase tracking-widest font-mono">{product.reference || 'SIN REF'}</span>
                                                        {product.parent_id && <span className="text-[7px] font-black bg-blue-50 text-blue-400 px-1.5 py-0.5 rounded border border-blue-100 uppercase">Variante</span>}
                                                        {product.discount_price && parseFloat(product.discount_price) > 0 && (
                                                            <span className="text-[7px] font-black bg-red-50 text-red-400 px-1.5 py-0.5 rounded border border-red-100 uppercase">Oferta</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Categoría / Atributos */}
                                        <td className="p-4">
                                            <div className="space-y-1.5">
                                                {!product.parent_id && (
                                                    <div className="flex items-center gap-1.5 text-[9px] uppercase font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 w-fit">
                                                        <Layers className="w-3 h-3" /> {product.categories?.name || '—'}
                                                    </div>
                                                )}
                                                {product.brands?.name && (
                                                    <div className="text-[8px] text-gray-400 font-black uppercase tracking-widest">{product.brands.name}</div>
                                                )}
                                                {product.attributes && Object.keys(product.attributes).length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {Object.entries(product.attributes).slice(0, 2).map(([k, v]) => (
                                                            <span key={k} className="px-1.5 py-0.5 bg-gray-50 border border-gray-100 text-gray-400 text-[8px] font-bold uppercase rounded">
                                                                {k}: {Array.isArray(v) ? v.join(', ') : v}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                {/* Badges Column Data */}
                                                <div className="flex flex-wrap gap-1 mt-1 border-t border-gray-50 pt-1.5">
                                                    {/* 1. AUTOMATIC BADGES (Parity with Web) */}
                                                    {(() => {
                                                        const autoBadges = [];
                                                        // New
                                                        const createdDate = new Date(product.created_at);
                                                        const diffDays = Math.ceil((new Date() - createdDate) / (1000 * 60 * 60 * 24));
                                                        if (diffDays <= 30) autoBadges.push({ label: 'NUEVO', color: 'bg-yellow-500' });

                                                        // Stock
                                                        if (product.stock === 0) autoBadges.push({ label: 'AGOTADO', color: 'bg-gray-800' });
                                                        else if (product.stock <= 5) autoBadges.push({ label: 'ÚLTIMAS UNDS', color: 'bg-orange-500' });

                                                        // Free Shipping
                                                        if (product.price >= 100) autoBadges.push({ label: 'ENVÍO GRATIS', color: 'bg-emerald-500' });

                                                        return autoBadges.map(ab => (
                                                            <span key={ab.label} className={`px-1.5 py-0.5 text-[7px] font-black uppercase rounded text-white shadow-sm ${ab.color}`}>
                                                                {ab.label}
                                                            </span>
                                                        ));
                                                    })()}

                                                    {/* 2. DYNAMIC BADGES */}
                                                    {product.product_badges?.map(pb => (
                                                        <span
                                                            key={pb.badge_id}
                                                            className="px-1.5 py-0.5 text-[7px] font-black uppercase rounded text-white shadow-sm"
                                                            style={{ backgroundColor: pb.badges?.bg_color || '#333' }}
                                                        >
                                                            {pb.badges?.name}
                                                        </span>
                                                    ))}

                                                    {/* 3. LEGACY TAGS */}
                                                    {product.badge_tags?.map(tag => (
                                                        <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-400 text-[7px] font-black uppercase rounded border border-gray-200">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Precio / Stock */}
                                        <td className="p-4">
                                            <div className="font-black text-brand-carbon italic text-sm leading-none">
                                                {product.discount_price && parseFloat(product.discount_price) > 0
                                                    ? <><span className="line-through text-gray-300 text-xs">{parseFloat(product.price).toFixed(2)}€</span> <span className="text-red-500">{parseFloat(product.discount_price).toFixed(2)}€</span></>
                                                    : <>{parseFloat(product.price).toFixed(2)}€</>
                                                }
                                            </div>
                                            <div className={`flex items-center gap-1 mt-1 text-[8px] font-black uppercase ${product.stock > 0 ? 'text-emerald-500' : 'text-red-400'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${product.stock > 0 ? 'bg-emerald-500' : 'bg-red-400'}`}></span>
                                                {product.stock || 0} uds.
                                            </div>
                                        </td>

                                        {/* Acciones */}
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                <button onClick={() => openEdit(product)} className="w-9 h-9 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-300 hover:text-primary hover:border-primary transition-all" title="Editar">
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => handleDuplicate(product)} className="w-9 h-9 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-300 hover:text-indigo-400 hover:border-indigo-100 transition-all" title="Duplicar">
                                                    <Copy className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => deleteProduct(product.id)} className="w-9 h-9 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-300 hover:text-red-400 hover:border-red-100 transition-all" title="Eliminar">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="p-20 text-center text-gray-400 italic">
                                            No se han encontrado productos.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal de Producto */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-brand-carbon/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto font-outfit">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl my-8 overflow-hidden h-[90vh] flex flex-col border border-white/20">

                        {/* Modal Header */}
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white flex-shrink-0">
                            <div>
                                <h2 className="text-xl font-black uppercase italic text-brand-carbon tracking-tighter">
                                    {editingId ? 'Evolución de Producto' : 'Nuevo Activo Maestro'}
                                </h2>
                                {formData.parent_id && <span className="text-[10px] text-blue-500 font-black uppercase tracking-widest mt-1 block">Variante de Inteligencia</span>}
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-brand-carbon transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-gray-100 px-8 bg-gray-50/30 gap-1 lg:gap-6 flex-shrink-0 overflow-x-auto no-scrollbar">
                            {[
                                { id: 'general', label: '🏷️ Identidad' },
                                { id: 'pricing', label: '💰 Estrategia B2B' },
                                { id: 'content', label: '📄 Contenido & Logística' },
                                // Muestra la pestaña de variantes si es un padre (incluso si es nuevo, pero deshabilitada la creación)
                                ...(!formData.parent_id ? [{ id: 'variants', label: `🌿 Variantes (${variants.length})` }] : [])
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`py-4 px-2 text-[9px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 min-h-0">
                            {activeTab !== 'variants' ? (
                                <form onSubmit={handleSubmit} className="h-full flex flex-col">
                                    <div className="flex-1 overflow-y-auto p-6 no-scrollbar">

                                        {/* TAB: IDENTIDAD */}
                                        {activeTab === 'general' && (
                                            <div className="space-y-6 animate-in fade-in duration-300">
                                                <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
                                                    <div className="flex items-center gap-3 mb-6">
                                                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                                                            <Package className="w-5 h-5" />
                                                        </div>
                                                        <h3 className="text-sm font-black uppercase italic tracking-tighter text-brand-carbon">Identidad & Activos</h3>
                                                    </div>

                                                    {/* ROW 1: Imagen principal (fixed width) + datos a la derecha */}
                                                    <div className="flex gap-6 mb-6">
                                                        {/* Imagen principal — ancho fijo para controlar ImageUpload */}
                                                        <div className="w-44 flex-shrink-0">
                                                            <ImageUpload
                                                                defaultValue={formData.image_url}
                                                                onUpload={(url) => setFormData({ ...formData, image_url: url })}
                                                            />
                                                        </div>

                                                        {/* Columna derecha: nombre + SKU/marca + categoría */}
                                                        <div className="flex-1 min-w-0 flex flex-col gap-4">
                                                            <div>
                                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nombre del Producto *</label>
                                                                <input
                                                                    required
                                                                    type="text"
                                                                    className="w-full border-b-2 border-gray-100 py-2 focus:border-primary focus:outline-none font-bold text-base transition-colors placeholder:text-gray-200"
                                                                    placeholder="Nombre del activo..."
                                                                    value={formData.name}
                                                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-3">
                                                                <div>
                                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Referencia / SKU</label>
                                                                    <input
                                                                        type="text"
                                                                        className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono bg-gray-50/50 border-gray-100"
                                                                        value={formData.reference}
                                                                        onChange={e => setFormData({ ...formData, reference: e.target.value })}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Marca</label>
                                                                    <select
                                                                        className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold uppercase bg-gray-50/50 border-gray-100"
                                                                        value={formData.brand_id}
                                                                        onChange={e => setFormData({ ...formData, brand_id: e.target.value })}
                                                                    >
                                                                        <option value="">Genérica</option>
                                                                        {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Categoría</label>
                                                                    <select
                                                                        className="w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold uppercase bg-gray-50/50 border-gray-100"
                                                                        value={formData.category_id}
                                                                        onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                                                                    >
                                                                        <option value="">Sin Categoría</option>
                                                                        {categories.filter(c => !c.parent_id).map(parent => (
                                                                            <optgroup key={parent.id} label={`── ${parent.name}`}>
                                                                                <option value={parent.id}>{parent.name} (general)</option>
                                                                                {categories.filter(c => c.parent_id === parent.id).map(sub => (
                                                                                    <option key={sub.id} value={sub.id}>• {sub.name}</option>
                                                                                ))}
                                                                            </optgroup>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* ROW 2: Galería de imágenes extra */}
                                                    <div>
                                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">🖼️ Galería Boutique</label>
                                                        <div className="flex flex-wrap gap-3">
                                                            {(formData.extra_images || []).map((img, idx) => (
                                                                <div key={idx} className="relative w-16 h-16 rounded-xl border border-gray-100 overflow-hidden group/img shadow-sm flex-shrink-0">
                                                                    <img src={img} alt={`Extra ${idx + 1}`} className="w-full h-full object-cover" />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const updated = [...formData.extra_images];
                                                                            updated.splice(idx, 1);
                                                                            setFormData({ ...formData, extra_images: updated });
                                                                        }}
                                                                        className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            {/* Botón añadir imagen extra */}
                                                            <label className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors flex-shrink-0">
                                                                <Plus className="w-5 h-5 text-gray-300" />
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    onChange={async (e) => {
                                                                        const file = e.target.files[0];
                                                                        if (!file) return;
                                                                        const fileExt = file.name.split('.').pop();
                                                                        const fileName = `${Math.random()}.${fileExt}`;
                                                                        const { error } = await supabase.storage.from('images').upload(fileName, file);
                                                                        if (!error) {
                                                                            const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
                                                                            setFormData(prev => ({ ...prev, extra_images: [...(prev.extra_images || []), publicUrl] }));
                                                                        }
                                                                    }}
                                                                />
                                                            </label>
                                                        </div>
                                                        <p className="text-[9px] text-gray-400 mt-2 italic">Haz clic en + para añadir imágenes adicionales</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* TAB: ESTRATEGIA B2B */}
                                        {activeTab === 'pricing' && (
                                            <div className="space-y-8 animate-in fade-in duration-300">
                                                <div className="bg-brand-carbon text-white rounded-[2rem] p-6 lg:p-10 shadow-2xl relative overflow-hidden">
                                                    <div className="flex items-center gap-3 mb-10 relative z-10">
                                                        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-inner">
                                                            <Percent className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-base font-black uppercase italic tracking-tighter">Estrategia Comercial & B2B</h3>
                                                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Gestión de márgenes y tarifas especiales</p>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 relative z-10">
                                                        <div className="xl:col-span-7 space-y-8">
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                                <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                                                                    <label className="block text-[8px] font-black text-gray-400 uppercase mb-3 tracking-widest">Original / PVP (€)</label>
                                                                    <input type="number" step="0.01" className="w-full bg-transparent border-none p-0 text-2xl font-black text-gray-400 focus:ring-0" placeholder="0.00" value={formData.original_price} onChange={e => setFormData({ ...formData, original_price: e.target.value })} />
                                                                    <p className="text-[7px] text-gray-600 mt-2 uppercase font-bold italic">Referencia tachada</p>
                                                                </div>
                                                                <div className="bg-white/5 p-5 rounded-2xl border border-primary/30 ring-1 ring-primary/20">
                                                                    <label className="block text-[8px] font-black text-primary uppercase mb-3 tracking-widest">PVP Web (€)</label>
                                                                    <input required type="number" step="0.01" className="w-full bg-transparent border-none p-0 text-2xl font-black text-white focus:ring-0" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                                                                    <p className="text-[7px] text-primary/60 mt-2 uppercase font-bold italic">Público Final / B2C</p>
                                                                </div>
                                                                <div className="bg-red-500/5 p-5 rounded-2xl border border-red-500/20">
                                                                    <label className="block text-[8px] font-black text-red-400 uppercase mb-3 tracking-widest">Oferta (€)</label>
                                                                    <input type="number" step="0.01" className="w-full bg-transparent border-none p-0 text-2xl font-black text-red-500 focus:ring-0" placeholder="Opcional" value={formData.discount_price} onChange={e => setFormData({ ...formData, discount_price: e.target.value })} />
                                                                    <p className="text-[7px] text-red-500/60 mt-2 uppercase font-bold italic">Activa Badge Oferta</p>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                <div className="bg-indigo-500/5 p-6 rounded-2xl border border-indigo-500/20">
                                                                    <label className="block text-[9px] font-black text-indigo-300 uppercase mb-3 italic tracking-wider">💰 Tarifa Profesional (€)</label>
                                                                    <input type="number" step="0.01" className="w-full bg-transparent border-none p-0 text-3xl font-black text-indigo-400 focus:ring-0" placeholder="0.00" value={formData.professional_price} onChange={e => setFormData({ ...formData, professional_price: e.target.value })} />
                                                                    <p className="text-[8px] text-indigo-400/40 mt-3 uppercase font-black tracking-tighter italic">Nivel Mayorista Intermedio</p>
                                                                </div>
                                                                <div className="bg-blue-500/5 p-6 rounded-2xl border border-blue-500/20">
                                                                    <label className="block text-[9px] font-black text-blue-300 uppercase mb-3 italic tracking-wider">💎 Tarifa Socio / Partner (€)</label>
                                                                    <input type="number" step="0.01" className="w-full bg-transparent border-none p-0 text-3xl font-black text-blue-400 focus:ring-0" placeholder="0.00" value={formData.partner_price} onChange={e => setFormData({ ...formData, partner_price: e.target.value })} />
                                                                    <p className="text-[8px] text-blue-400/40 mt-3 uppercase font-black tracking-tighter italic">Nivel Premium Estratégico</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="xl:col-span-5">
                                                            <div className="bg-white/5 rounded-[2.5rem] border border-white/10 p-6 lg:p-8 h-full">
                                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[.3em] mb-8 flex items-center justify-between">
                                                                    <span>📦 Escalamiento por Volumen</span>
                                                                    <BadgePercent className="w-4 h-4 text-primary/40" />
                                                                </h4>
                                                                <div className="space-y-8 max-h-[350px] overflow-y-auto pr-4 custom-scrollbar">
                                                                    {['individual', 'profesional', 'partner'].map(role => (
                                                                        <div key={role} className="space-y-4">
                                                                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                                                                <span className="text-[10px] font-black uppercase text-gray-300 italic tracking-widest">
                                                                                    {role === 'individual' ? 'Tarifas Web B2C' : `Tarifas ${role}`}
                                                                                </span>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        const qty = prompt('¿A partir de qué cantidad?');
                                                                                        const price = prompt('¿Precio unitario?');
                                                                                        if (qty && price) {
                                                                                            setFormData(prev => ({
                                                                                                ...prev,
                                                                                                volume_pricing: {
                                                                                                    ...prev.volume_pricing,
                                                                                                    [role]: [...(prev.volume_pricing?.[role] || []), { qty: parseInt(qty), price: parseFloat(price) }].sort((a, b) => a.qty - b.qty)
                                                                                                }
                                                                                            }));
                                                                                        }
                                                                                    }}
                                                                                    className="text-primary hover:text-white text-[9px] font-black uppercase transition-colors flex items-center gap-1.5"
                                                                                >
                                                                                    <Plus className="w-3 h-3" />
                                                                                    Añadir Escala
                                                                                </button>
                                                                            </div>
                                                                            <div className="flex flex-wrap gap-2">
                                                                                {(formData.volume_pricing?.[role] || []).map((scale, i) => (
                                                                                    <div key={i} className="flex items-center gap-3 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/5 group/scale transition-colors">
                                                                                        <span className="text-[11px] font-black text-white italic">+{scale.qty}</span>
                                                                                        <span className="text-[11px] font-black text-primary">{scale.price}€</span>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                setFormData(prev => ({
                                                                                                    ...prev,
                                                                                                    volume_pricing: {
                                                                                                        ...prev.volume_pricing,
                                                                                                        [role]: prev.volume_pricing[role].filter((_, idx) => idx !== i)
                                                                                                    }
                                                                                                }));
                                                                                            }}
                                                                                            className="opacity-0 group-hover/scale:opacity-100 text-red-400 transition-opacity"
                                                                                        >
                                                                                            <X className="w-3 h-3" />
                                                                                        </button>
                                                                                    </div>
                                                                                ))}
                                                                                {(!formData.volume_pricing?.[role] || formData.volume_pricing[role].length === 0) && (
                                                                                    <p className="text-[9px] text-gray-600 italic font-medium">Sin escalas definidas.</p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* TAB: CONTENIDO & LOGISTICA */}
                                        {activeTab === 'content' && (
                                            <div className="space-y-8 animate-in fade-in duration-300">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <Layers className="w-4 h-4 text-blue-500" />
                                                            <h3 className="text-[10px] font-black uppercase text-brand-carbon">Stock & Inventario</h3>
                                                        </div>
                                                        <input type="number" className="w-full border-2 border-gray-50 rounded-2xl px-4 py-3 text-2xl font-black text-brand-carbon focus:border-primary focus:outline-none" value={formData.stock} onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) })} />
                                                    </div>
                                                    <div className="col-span-2 bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <CheckSquare className="w-4 h-4 text-green-500" />
                                                            <h3 className="text-[10px] font-black uppercase text-brand-carbon">Visibilidad & Estado</h3>
                                                        </div>
                                                        <label className="flex items-center gap-3 cursor-pointer">
                                                            <div className="relative">
                                                                <input type="checkbox" className="sr-only" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} />
                                                                <div className={`w-14 h-8 rounded-full transition-colors duration-300 ${formData.is_active ? 'bg-primary' : 'bg-gray-200'}`}></div>
                                                                <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full shadow-lg transform transition-transform duration-300 ${formData.is_active ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                                            </div>
                                                            <span className={`text-[11px] font-black uppercase italic ${formData.is_active ? 'text-primary' : 'text-gray-400'}`}>
                                                                {formData.is_active ? 'Visible en Boutique' : 'Oculto (Borrador)'}
                                                            </span>
                                                        </label>
                                                    </div>
                                                </div>
                                                <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm">
                                                    <div className="flex items-center gap-3 mb-8">
                                                        <Award className="w-5 h-5 text-orange-500" />
                                                        <h3 className="text-sm font-black uppercase italic tracking-tighter text-brand-carbon">Marketing & Target</h3>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                                        <div className="space-y-4">
                                                            <label className="block text-[10px] font-black text-brand-carbon uppercase tracking-widest">🎨 Badges Boutique</label>
                                                            <div className="flex flex-wrap gap-2 mb-3 min-h-[40px]">
                                                                {(formData.badge_ids || []).map(badgeId => {
                                                                    const badge = allBadges.find(b => b.id === badgeId);
                                                                    if (!badge) return null;
                                                                    return (
                                                                        <span key={badgeId} className="flex items-center gap-2 px-3 py-1 text-[9px] font-black uppercase rounded-lg text-white" style={{ backgroundColor: badge.bg_color }}>
                                                                            {badge.name}
                                                                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, badge_ids: prev.badge_ids.filter(id => id !== badgeId) }))}><X className="w-3 h-3" /></button>
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>
                                                            <select className="w-full h-11 border border-gray-100 rounded-xl px-4 text-[10px] font-bold outline-none" onChange={(e) => { const val = e.target.value; if (val && !formData.badge_ids.includes(val)) setFormData(prev => ({ ...prev, badge_ids: [...prev.badge_ids, val] })); e.target.value = ''; }}>
                                                                <option value="">+ Seleccionar Badge...</option>
                                                                {allBadges.filter(b => !formData.badge_ids.includes(b.id)).map(badge => (
                                                                    <option key={badge.id} value={badge.id}>{badge.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Sectores B2B</label>
                                                            <div className="border border-gray-100 rounded-2xl p-4 max-h-40 overflow-y-auto space-y-2 bg-gray-50/50">
                                                                {professions.map(prof => (
                                                                    <label key={prof.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded-xl">
                                                                        <input type="checkbox" className="w-4 h-4 rounded-lg text-primary" checked={formData.profession_ids?.includes(prof.id)} onChange={(e) => { const checked = e.target.checked; setFormData(prev => ({ ...prev, profession_ids: checked ? [...prev.profession_ids, prof.id] : prev.profession_ids.filter(id => id !== prof.id) })); }} />
                                                                        <span className="text-[10px] font-black uppercase text-gray-500">{prof.name}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Estancias Recomendadas</label>
                                                            <div className="border border-gray-100 rounded-2xl p-4 max-h-40 overflow-y-auto space-y-2 bg-gray-50/50">
                                                                {rooms.map(room => (
                                                                    <label key={room.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded-xl">
                                                                        <input type="checkbox" className="w-4 h-4 rounded-lg text-blue-500" checked={formData.room_ids?.includes(room.id)} onChange={(e) => { const checked = e.target.checked; setFormData(prev => ({ ...prev, room_ids: checked ? [...prev.room_ids, room.id] : prev.room_ids.filter(id => id !== room.id) })); }} />
                                                                        <span className="text-[10px] font-black uppercase text-gray-500">{room.name}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* SECCION ESPECIAL: METROS Y ACCESORIOS */}
                                                <div className="bg-brand-carbon/[0.02] rounded-[2rem] border border-gray-100 p-8 shadow-sm">
                                                    <div className="flex items-center gap-3 mb-8">
                                                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                                                            <Package className="w-5 h-5" />
                                                        </div>
                                                        <h3 className="text-sm font-black uppercase italic tracking-tighter text-brand-carbon">Venta Especial & Metraje</h3>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                        <div className="space-y-6">
                                                            <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${formData.is_by_meter ? 'bg-primary/10 text-primary' : 'bg-gray-50 text-gray-300'}`}>
                                                                        <Activity className="w-5 h-5" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[10px] font-black uppercase text-brand-carbon italic">Venta por Metros</p>
                                                                        <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Activa el slider en la web</p>
                                                                    </div>
                                                                </div>
                                                                <label className="relative inline-flex items-center cursor-pointer">
                                                                    <input type="checkbox" className="sr-only peer" checked={formData.is_by_meter} onChange={e => setFormData({ ...formData, is_by_meter: e.target.checked })} />
                                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                                                </label>
                                                            </div>

                                                            {formData.is_by_meter && (
                                                                <div className="grid grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                                                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                                                        <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2 text-center">Mínimo</label>
                                                                        <input type="number" step="0.1" className="w-full text-center text-sm font-black text-brand-carbon focus:outline-none" value={formData.min_meters} onChange={e => setFormData({ ...formData, min_meters: parseFloat(e.target.value) })} />
                                                                    </div>
                                                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                                                        <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2 text-center">Máximo</label>
                                                                        <input type="number" step="0.1" className="w-full text-center text-sm font-black text-brand-carbon focus:outline-none" value={formData.max_meters} onChange={e => setFormData({ ...formData, max_meters: parseFloat(e.target.value) })} />
                                                                    </div>
                                                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                                                        <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2 text-center">Salto</label>
                                                                        <input type="number" step="0.1" className="w-full text-center text-sm font-black text-brand-carbon focus:outline-none" value={formData.meter_step} onChange={e => setFormData({ ...formData, meter_step: parseFloat(e.target.value) })} />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
                                                            <div className="flex items-center gap-3 mb-4">
                                                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                                                <h3 className="text-[10px] font-black uppercase text-brand-carbon">Accesorios Obligatorios</h3>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2 mb-4 min-h-[40px]">
                                                                {(formData.mandatory_accessory_ids || []).map(id => {
                                                                    const p = products.find(prod => prod.id === id);
                                                                    if (!p) return null;
                                                                    return (
                                                                        <div key={id} className="flex items-center gap-2 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl">
                                                                            <img src={p.image_url} className="w-6 h-6 rounded-lg object-cover" />
                                                                            <span className="text-[9px] font-black text-amber-900 truncate max-w-[100px] uppercase italic">{p.name}</span>
                                                                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, mandatory_accessory_ids: prev.mandatory_accessory_ids.filter(rid => rid !== id) }))} className="text-amber-300 hover:text-red-500"><X className="w-3 h-3" /></button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            <select
                                                                className="w-full h-11 border border-amber-50 rounded-2xl text-[10px] font-black uppercase outline-none bg-amber-50/20 px-4"
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val && !formData.mandatory_accessory_ids?.includes(val)) {
                                                                        setFormData(prev => ({ ...prev, mandatory_accessory_ids: [...(prev.mandatory_accessory_ids || []), val] }));
                                                                    }
                                                                    e.target.value = '';
                                                                }}
                                                            >
                                                                <option value="">+ Añadir Accesorio Obligatorio...</option>
                                                                {products.filter(p => !p.parent_id && p.id !== editingId && !formData.mandatory_accessory_ids?.includes(p.id)).map(p => (
                                                                    <option key={p.id} value={p.id}>{p.name} ({p.reference})</option>
                                                                ))}
                                                            </select>
                                                            <p className="text-[8px] text-gray-400 mt-3 italic">* Se añadirán automáticamente al carrito junto con este producto.</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm">
                                                        <h3 className="text-[11px] font-black uppercase italic text-brand-carbon mb-6 flex items-center gap-2">
                                                            <Sofa className="w-4 h-4 text-primary" /> Relacionados Manuales
                                                        </h3>
                                                        <div className="flex flex-wrap gap-2 mb-4">
                                                            {formData.related_product_ids?.map(id => {
                                                                const p = products.find(prod => prod.id === id);
                                                                if (!p) return null;
                                                                return (
                                                                    <div key={id} className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl">
                                                                        <img src={p.image_url} className="w-6 h-6 rounded-lg object-cover" />
                                                                        <span className="text-[9px] font-black text-gray-600 truncate max-w-[100px] uppercase italic">{p.name}</span>
                                                                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, related_product_ids: prev.related_product_ids.filter(rid => rid !== id) }))} className="text-gray-300 hover:text-red-500"><X className="w-3 h-3" /></button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        <select className="w-full h-12 border border-blue-50 rounded-2xl text-[10px] font-black uppercase outline-none bg-gray-50/50" onChange={(e) => { const val = e.target.value; if (val && !formData.related_product_ids?.includes(val)) setFormData(prev => ({ ...prev, related_product_ids: [...(prev.related_product_ids || []), val] })); e.target.value = ''; }}>
                                                            <option value="">+ Vincular Producto...</option>
                                                            {products.filter(p => p.id !== editingId && !p.parent_id && !formData.related_product_ids?.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm">
                                                        <h3 className="text-[11px] font-black uppercase italic text-brand-carbon mb-6 flex items-center gap-2">
                                                            <Square className="w-4 h-4 text-indigo-500" /> Atributos Avanzados
                                                        </h3>
                                                        <div className="space-y-4">
                                                            <div className="flex flex-col gap-3 mb-2 min-h-[50px]">
                                                                {Object.entries(formData.attributes || {}).map(([key, values], idx, arr) => (
                                                                    <div key={key} className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 w-full group/attr">
                                                                        <div className="flex items-center justify-between mb-3">
                                                                            <div className="flex items-center gap-3">
                                                                                <span className="text-[10px] font-black text-indigo-900 uppercase italic">/ {key}</span>
                                                                                <div className="flex items-center gap-1 opacity-0 group-hover/attr:opacity-100 transition-opacity">
                                                                                    <button
                                                                                        type="button"
                                                                                        disabled={idx === 0}
                                                                                        onClick={() => reorderAttribute(key, 'up')}
                                                                                        className="p-1 hover:bg-white rounded text-indigo-400 disabled:opacity-30"
                                                                                    >
                                                                                        <ChevronUp className="w-3 h-3" />
                                                                                    </button>
                                                                                    <button
                                                                                        type="button"
                                                                                        disabled={idx === arr.length - 1}
                                                                                        onClick={() => reorderAttribute(key, 'down')}
                                                                                        className="p-1 hover:bg-white rounded text-indigo-400 disabled:opacity-30"
                                                                                    >
                                                                                        <ChevronDown className="w-3 h-3" />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                            <button type="button" onClick={() => removeAttributeGroup(key)} className="text-[9px] text-red-400 font-bold uppercase hover:text-red-600">Limpiar</button>
                                                                        </div>
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {(Array.isArray(values) ? values : [values]).map(val => (
                                                                                <span key={val} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border border-indigo-100 text-[9px] font-black text-indigo-600 uppercase shadow-sm">
                                                                                    {val}
                                                                                    <button type="button" onClick={() => removeAttributeValue(key, val)} className="text-red-300 hover:text-red-500"><X className="w-3 h-3" /></button>
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="flex gap-2 p-3 bg-gray-50 rounded-[1.5rem] border border-gray-100">
                                                                <input list="attr-keys" placeholder="Tipo" className="flex-1 text-[10px] font-bold p-2 bg-transparent border-none focus:ring-0" value={newAttrKey} onChange={e => setNewAttrKey(e.target.value)} />
                                                                <datalist id="attr-keys">{Object.keys(PREDEFINED_ATTRIBUTES).map(k => <option key={k} value={k} />)}</datalist>
                                                                <input list="attr-values" placeholder="Valor" className="flex-1 text-[10px] font-bold p-2 bg-transparent border-none focus:ring-0" value={newAttrValue} onChange={e => setNewAttrValue(e.target.value)} />
                                                                <datalist id="attr-values">{(PREDEFINED_ATTRIBUTES[newAttrKey] || []).map(v => <option key={v} value={v} />)}</datalist>
                                                                <button type="button" onClick={addAttribute} className="w-10 h-10 rounded-xl bg-brand-carbon text-white flex items-center justify-center hover:bg-primary transition-all"><Plus className="w-4 h-4" /></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm">
                                                    <div className="flex items-center gap-3 mb-8">
                                                        <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center text-white">
                                                            <Layers className="w-5 h-5 text-primary" />
                                                        </div>
                                                        <h3 className="text-sm font-black uppercase italic tracking-tighter text-brand-carbon">Contenido & Narrativa</h3>
                                                    </div>
                                                    <div className="space-y-8">
                                                        <div>
                                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 italic">Breve Introducción</label>
                                                            <textarea className="w-full border-2 border-gray-50 rounded-2xl px-5 py-4 text-xs font-medium focus:ring-2 ring-blue-500/10 focus:outline-none min-h-[100px] resize-none" placeholder="Escribe algo inspirador sobre este activo..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}></textarea>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black text-brand-carbon uppercase tracking-widest mb-4">🖋️ Editor de Contenido Boutique</label>
                                                            <div className="bg-gray-50/50 rounded-3xl border border-gray-100 overflow-hidden shadow-inner">
                                                                <ReactQuill
                                                                    theme="snow"
                                                                    value={formData.long_description}
                                                                    onChange={(content) => setFormData(prev => ({ ...prev, long_description: content }))}
                                                                    className="h-[400px] mb-12"
                                                                    modules={{
                                                                        toolbar: [
                                                                            [{ 'header': [1, 2, 3, false] }],
                                                                            ['bold', 'italic', 'underline', 'strike'],
                                                                            [{ 'color': [] }, { 'background': [] }],
                                                                            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                                                            ['link', 'clean']
                                                                        ]
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                    </div>

                                    {/* Sticky Save Button */}
                                    <div className="sticky bottom-0 left-0 right-0 z-30 pt-4 pb-4 px-6 bg-white/90 backdrop-blur-md border-t border-gray-100 flex items-center justify-center flex-shrink-0">
                                        <button
                                            disabled={isSaving}
                                            type="submit"
                                            className="w-full max-w-4xl bg-brand-carbon text-white h-16 rounded-[2.5rem] font-black uppercase italic tracking-widest hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-4 shadow-xl shadow-brand-carbon/30 group relative overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            {isSaving ? (
                                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                            ) : (
                                                <Save className="w-5 h-5 text-primary group-hover:rotate-12 transition-transform" />
                                            )}
                                            <span className="text-lg">{isSaving ? 'Sincronizando Activo...' : 'Publicar Evolución Maestra'}</span>
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-16">
                                    {!editingId ? (
                                        <div className="bg-white rounded-[2rem] border border-gray-100 p-12 text-center shadow-sm h-full flex flex-col items-center justify-center">
                                            <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-3xl opacity-20 relative">
                                                <div className="absolute inset-0 border-2 border-dashed border-primary/20 rounded-[2rem] animate-spin-slow"></div>
                                                🌿
                                            </div>
                                            <h3 className="text-xl font-black text-brand-carbon uppercase italic leading-none mb-4">Gestión de Variantes</h3>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[.4em] mb-8 max-w-xs mx-auto">
                                                Primero debes guardar el Activo Maestro para poder añadir y gestionar sus variantes.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                                <h3 className="font-bold text-blue-900 uppercase text-sm mb-1">Variantes del Producto</h3>
                                                <p className="text-xs text-blue-600">Cada variante tiene su <b>propio precio</b>, <b>stock</b> e imagen. Ej: Tira LED 5m = 15€, Tira LED 10m = 28€</p>
                                            </div>

                                            <div className="bg-white p-5 rounded-xl border-2 border-dashed border-blue-200">
                                                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">+ Crear Nueva Variante</h4>
                                                <div className="grid grid-cols-2 gap-3 mb-3">
                                                    <div>
                                                        <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Precio (€) *</label>
                                                        <input type="number" step="0.01" placeholder="Ej: 15.99" className="w-full border rounded-lg px-3 py-2 text-sm font-black focus:outline-none focus:ring-1 focus:ring-blue-500" id="new-variant-price" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Stock *</label>
                                                        <input type="number" placeholder="Ej: 50" className="w-full border rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-blue-500" id="new-variant-stock" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 mb-3">
                                                    <div>
                                                        <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Referencia / SKU</label>
                                                        <input type="text" placeholder="Ej: TIRA-LED-5M-ROJO" className="w-full border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500" id="new-variant-ref" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Precio Oferta (€)</label>
                                                        <input type="number" step="0.01" placeholder="Opcional" className="w-full border rounded-lg px-3 py-2 text-sm font-bold text-red-600 bg-red-50 focus:outline-none" id="new-variant-discount" />
                                                    </div>
                                                </div>
                                                <div className="mb-3">
                                                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Atributos de esta variante</label>
                                                    <div className="flex gap-2">
                                                        <input list="attr-keys-variant" placeholder="Atributo" className="flex-1 text-[10px] font-bold uppercase p-2 border rounded" id="new-variant-attr-key" />
                                                        <datalist id="attr-keys-variant">{Object.keys(PREDEFINED_ATTRIBUTES).map(k => <option key={k} value={k} />)}</datalist>
                                                        <input list="attr-values-variant" placeholder="Valor" className="flex-1 text-[10px] font-bold uppercase p-2 border rounded" id="new-variant-attr-val" />
                                                        <datalist id="attr-values-variant">{(PREDEFINED_ATTRIBUTES[''] || []).map(v => <option key={v} value={v} />)}</datalist>
                                                    </div>
                                                </div>
                                                <button
                                                    disabled={isSaving}
                                                    onClick={async () => {
                                                        const priceEl = document.getElementById('new-variant-price');
                                                        const stockEl = document.getElementById('new-variant-stock');
                                                        const refEl = document.getElementById('new-variant-ref');
                                                        const discountEl = document.getElementById('new-variant-discount');
                                                        const attrKeyEl = document.getElementById('new-variant-attr-key');
                                                        const attrValEl = document.getElementById('new-variant-attr-val');
                                                        if (!priceEl?.value || !refEl?.value) return alert('Precio y Referencia son obligatorios');
                                                        const payload = {
                                                            name: formData.name,
                                                            parent_id: editingId,
                                                            price: parseFloat(priceEl.value),
                                                            stock: parseInt(stockEl?.value || 0),
                                                            reference: refEl.value,
                                                            discount_price: discountEl?.value ? parseFloat(discountEl.value) : null,
                                                            image_url: formData.image_url,
                                                            category_id: formData.category_id,
                                                            attributes: attrKeyEl?.value && attrValEl?.value ? { [attrKeyEl.value]: attrValEl.value } : {},
                                                            slug: generateSlug(formData.name, refEl.value)
                                                        };
                                                        try {
                                                            setIsSaving(true);
                                                            const { data, error } = await supabase.from('products').insert([payload]).select().maybeSingle();
                                                            if (error) throw error;
                                                            setVariants(prev => [...prev, data]);
                                                            if (priceEl) priceEl.value = '';
                                                            if (stockEl) stockEl.value = '';
                                                            if (refEl) refEl.value = '';
                                                            if (discountEl) discountEl.value = '';
                                                            if (attrKeyEl) attrKeyEl.value = '';
                                                            if (attrValEl) attrValEl.value = '';
                                                            alert('Variante creada con éxito');
                                                        } catch (err) {
                                                            alert('Error: ' + err.message);
                                                        } finally {
                                                            setIsSaving(false);
                                                        }
                                                    }}
                                                    className="w-full bg-brand-carbon text-white h-14 rounded-2xl font-black uppercase italic tracking-widest hover:bg-primary transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50 mt-4"
                                                >
                                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
                                                    Crear Variante Inteligente
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Variantes Existentes ({variants.length})</h4>
                                                {variants.map(variant => (
                                                    <div key={variant.id} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                                                        <div className="flex items-center justify-between p-4">
                                                            <div className="flex items-center gap-4 flex-1">
                                                                <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                    {variant.image_url ? <img src={variant.image_url} className="w-full h-full object-contain rounded-lg" /> : <Tag className="w-4 h-4 text-gray-300" />}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-mono text-xs text-gray-500 mb-1">{variant.reference}</p>
                                                                    <div className="flex gap-1.5 flex-wrap">
                                                                        {variant.attributes && Object.entries(variant.attributes).map(([k, v]) => (
                                                                            <span key={k} className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[9px] font-bold uppercase rounded border border-purple-100">
                                                                                {k}: {Array.isArray(v) ? v.join(', ') : v}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-5 flex-shrink-0">
                                                                <div className="text-right">
                                                                    <span className="block text-lg font-black text-brand-carbon">{parseFloat(variant.price).toFixed(2)}€</span>
                                                                    {variant.discount_price && parseFloat(variant.discount_price) > 0 && (
                                                                        <span className="block text-xs text-red-500 font-bold">Oferta: {parseFloat(variant.discount_price).toFixed(2)}€</span>
                                                                    )}
                                                                </div>
                                                                <div className="text-center px-3 py-1 bg-gray-50 rounded-lg">
                                                                    <span className="block text-[9px] font-black text-gray-400 uppercase">Stock</span>
                                                                    <span className={`block text-sm font-black ${parseInt(variant.stock) > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{variant.stock || 0}</span>
                                                                </div>
                                                                <div className="flex gap-1">
                                                                    <div className="flex flex-col gap-1 mr-2">
                                                                        <button
                                                                            onClick={() => moveVariant(variant.id, 'up')}
                                                                            disabled={variants.indexOf(variant) === 0}
                                                                            className="p-1 text-gray-400 hover:text-primary disabled:opacity-20 transition-colors"
                                                                            title="Subir"
                                                                        >
                                                                            <ChevronUp className="w-4 h-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => moveVariant(variant.id, 'down')}
                                                                            disabled={variants.indexOf(variant) === variants.length - 1}
                                                                            className="p-1 text-gray-400 hover:text-primary disabled:opacity-20 transition-colors"
                                                                            title="Bajar"
                                                                        >
                                                                            <ChevronDown className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingId(variant.id);
                                                                            setFormData({
                                                                                name: variant.name,
                                                                                reference: variant.reference || '',
                                                                                price: variant.price,
                                                                                stock: variant.stock || 0,
                                                                                category_id: variant.category_id || '',
                                                                                brand_id: variant.brand_id || '',
                                                                                room_ids: variant.room_ids || [],
                                                                                profession_ids: variant.profession_ids || [],
                                                                                image_url: variant.image_url || '',
                                                                                description: variant.description || '',
                                                                                discount_price: variant.discount_price || '',
                                                                                partner_price: variant.partner_price || '',
                                                                                professional_price: variant.professional_price || '',
                                                                                volume_pricing: variant.volume_pricing || { individual: [], profesional: [], partner: [] },
                                                                                parent_id: variant.parent_id,
                                                                                attributes: variant.attributes || {},
                                                                                extra_images: variant.extra_images || [],
                                                                                related_product_ids: variant.related_product_ids || [],
                                                                                long_description: variant.long_description || '',
                                                                                original_price: variant.original_price || '',
                                                                                badge_tags: variant.badge_tags || [],
                                                                                badge_ids: [],
                                                                                is_active: variant.is_active !== false
                                                                            });
                                                                            setActiveTab('general');
                                                                        }}
                                                                        className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors"
                                                                        title="Editar variante completa"
                                                                    >
                                                                        <Edit2 className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            deleteProduct(variant.id);
                                                                            setVariants(prev => prev.filter(v => v.id !== variant.id));
                                                                        }}
                                                                        className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-lg transition-colors"
                                                                        title="Eliminar variante"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
