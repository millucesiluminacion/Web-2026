import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Loader2, X, Package, Tag, Layers, Sofa, Award, Upload, Download, Copy } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import ImageUpload from '../../components/admin/ImageUpload';
import Papa from 'papaparse';

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
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [activeTab, setActiveTab] = useState('general'); // 'general' | 'variants'

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        reference: '',
        price: '',
        stock: 0,
        category_id: '',
        brand_id: '',
        room_ids: [],
        image_url: '',
        description: '',
        discount_price: '',
        parent_id: null,
        attributes: {},
        extra_images: [] // gallery images
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
            const [prodRes, catRes, brandRes, roomRes] = await Promise.all([
                supabase.from('products')
                    .select('*, categories(name), brands(name), product_rooms(room_id)')
                    .order('created_at', { ascending: false }),
                supabase.from('categories').select('id, name').order('name'),
                supabase.from('brands').select('id, name').order('name'),
                supabase.from('rooms').select('id, name').order('name')
            ]);

            const allProducts = prodRes.data || [];

            // Format products map rooms
            const formattedProducts = allProducts.map(p => ({
                ...p,
                room_ids: p.product_rooms?.map(pr => pr.room_id) || []
            }));

            setProducts(formattedProducts);
            setCategories(catRes.data || []);
            setBrands(brandRes.data || []);
            setRooms(roomRes.data || []);
        } catch (error) {
            console.error('Error fetching data:', error.message);
        } finally {
            setLoading(false);
        }
    }

    // --- CSV IMPORT LOGIC ---
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                await processImport(results.data);
            },
            error: (error) => {
                alert('Error al leer CSV: ' + error.message);
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
                    const payload = {
                        reference: row['SKU'],
                        name: row['Nombre'],
                        description: row['Descripción'],
                        price: isNaN(price) ? 0 : price,
                        stock: parseInt(row['CANT.'] || 0),
                        image_url: row['URL de la imagen'],
                        category_id: getCategoryId(row['Categorías']),
                        attributes: parseAttributes(row['Opciones']),
                        parent_id: null
                    };

                    // Check if exists to update or insert
                    const { data: existing } = await supabase.from('products').select('id').eq('reference', payload.reference).single();

                    let productId;
                    if (existing) {
                        // Update existing parent
                        await supabase.from('products').update(payload).eq('id', existing.id);
                        productId = existing.id;
                    } else {
                        const { data: newProd, error } = await supabase.from('products').insert([payload]).select().single();
                        if (error) throw error;
                        productId = newProd.id;
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
                        const { data: dbParent } = await supabase.from('products').select('id').eq('reference', parentSku).single();
                        finalParentId = dbParent?.id;
                    }

                    if (!finalParentId) {
                        console.warn(`Parent not found for variant ${row['SKU']} (Parent SKU: ${parentSku})`);
                        errors++;
                        continue;
                    }

                    const price = parseFloat(row['Precio de venta']?.replace(',', '.') || row['Precio']?.replace('€', '').replace(',', '.').trim() || 0);
                    const payload = {
                        reference: row['SKU'],
                        name: row['Nombre'],
                        description: row['Descripción'],
                        price: isNaN(price) ? 0 : price,
                        stock: parseInt(row['CANT.'] || 0),
                        image_url: row['URL de la imagen'],
                        category_id: getCategoryId(row['Categorías']), // Inherit category?
                        parent_id: finalParentId,
                        attributes: parseAttributes(row['Opciones'])
                    };

                    // Check if exists
                    const { data: existing } = await supabase.from('products').select('id').eq('reference', payload.reference).single();

                    if (existing) {
                        await supabase.from('products').update(payload).eq('id', existing.id);
                    } else {
                        await supabase.from('products').insert([payload]);
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
            image_url: product.image_url || '',
            description: product.description || '',
            discount_price: product.discount_price || '',
            parent_id: product.parent_id,
            attributes: product.attributes || {},
            extra_images: product.extra_images || []
        });

        // Load variants if it is a parent
        if (!product.parent_id) {
            const productVariants = products.filter(p => p.parent_id === product.id);
            setVariants(productVariants);
        } else {
            setVariants([]);
        }

        setIsModalOpen(true);
    }

    function openCreate() {
        setEditingId(null);
        setActiveTab('general');
        setFormData({
            name: '', reference: '', price: '', stock: 0,
            category_id: '', brand_id: '', room_ids: [],
            image_url: '', description: '', discount_price: '',
            parent_id: null, attributes: {}, extra_images: []
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
                attributes: formData.attributes,
                parent_id: formData.parent_id,
                extra_images: formData.extra_images || []
            };

            let productId = editingId;

            if (editingId) {
                const { error } = await supabase.from('products').update(payload).eq('id', editingId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('products').insert([payload]).select().single();
                if (error) throw error;
                productId = data.id;
            }

            // Handle Rooms Relation - Only for Parents or if logic allows children to have separate rooms
            // Usually variants inherit, but for now we save for all if selected
            if (productId) {
                await supabase.from('product_rooms').delete().eq('product_id', productId);
                if (formData.room_ids.length > 0) {
                    const roomInserts = formData.room_ids.map(roomId => ({
                        product_id: productId,
                        room_id: roomId
                    }));
                    await supabase.from('product_rooms').insert(roomInserts);
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
        if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) return;
        try {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) throw error;
            setProducts(products.filter(p => p.id !== id));
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

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.reference?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-black text-gray-800 uppercase italic">Gestión de Productos</h1>

                <div className="flex gap-2">
                    <label className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors font-bold uppercase italic shadow-sm cursor-pointer text-xs">
                        <Upload className="w-4 h-4" /> Importar CSV
                        <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                    </label>
                    <button onClick={handleExport} className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700 transition-colors font-bold uppercase italic shadow-sm text-xs">
                        <Download className="w-4 h-4" /> Exportar CSV
                    </button>
                    <button
                        onClick={openCreate}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors font-bold uppercase italic shadow-sm text-xs"
                    >
                        <Plus className="w-4 h-4" /> Nuevo Producto
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <div className="p-4 border-b border-gray-100">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, SKU..."
                            className="pl-10 w-full border border-gray-200 rounded-lg py-2 px-4 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p className="text-xs font-black uppercase tracking-widest opacity-50">Sincronizando inventario...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 uppercase text-[10px] font-black text-gray-500 border-b">
                                <tr>
                                    <th className="p-4">Producto</th>
                                    <th className="p-4">Atributos / Var</th>
                                    <th className="p-4">Precio / Stock</th>
                                    <th className="p-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredProducts.length > 0 ? filteredProducts.map(product => (
                                    <tr key={product.id} className={`hover:bg-gray-50 transition-colors group ${product.parent_id ? 'bg-gray-50/50' : ''}`}>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                {product.parent_id && <div className="w-4 border-l-2 border-b-2 border-gray-300 h-4 rounded-bl-lg ml-2"></div>}
                                                <div className="w-12 h-12 bg-white rounded-lg border border-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
                                                    {product.image_url ? (
                                                        <img src={product.image_url} alt={product.name} className="w-full h-full object-contain" />
                                                    ) : (
                                                        <Package className="w-5 h-5 text-gray-100" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className={`font-bold text-gray-900 uppercase text-xs line-clamp-1 ${product.parent_id ? 'text-gray-600' : ''}`}>
                                                        {product.parent_id ? `↳ ${product.name}` : product.name}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 font-mono">{product.reference || 'SIN REF'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="space-y-1">
                                                {/* Mostrar Atributos si es variante */}
                                                {product.attributes && Object.keys(product.attributes).length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {Object.entries(product.attributes).map(([k, v]) => {
                                                            const valArray = Array.isArray(v) ? v : [v];
                                                            return (
                                                                <span key={k} className="px-1.5 py-0.5 bg-purple-50 text-purple-600 text-[9px] font-bold uppercase rounded border border-purple-100">
                                                                    {k}: {valArray.length > 2 ? `${valArray.slice(0, 2).join(', ')}... (+${valArray.length - 2})` : valArray.join(', ')}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                {!product.parent_id && !product.attributes && (
                                                    <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-blue-600">
                                                        <Layers className="w-3 h-3" /> {product.categories?.name || 'Varios'}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-black text-gray-900">{parseFloat(product.price).toFixed(2)}€</div>
                                            <div className={`text-[10px] font-bold uppercase ${product.stock > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {product.stock} en stock
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEdit(product)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => deleteProduct(product.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl my-8 overflow-hidden h-[90vh] flex flex-col">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
                            <div>
                                <h2 className="font-black uppercase italic text-gray-800 tracking-wider">
                                    {editingId ? 'Editar Producto' : 'Nuevo Producto'}
                                </h2>
                                {formData.parent_id && <span className="text-xs text-blue-500 font-bold uppercase">Es Variante</span>}
                            </div>

                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Tabs */}
                        {!formData.parent_id && editingId && (
                            <div className="flex border-b border-gray-100 px-4 bg-gray-50 gap-4 flex-shrink-0">
                                <button
                                    onClick={() => setActiveTab('general')}
                                    className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    Datos Generales
                                </button>
                                <button
                                    onClick={() => setActiveTab('variants')}
                                    className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'variants' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    Variantes ({variants.length})
                                </button>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto p-6">
                            {activeTab === 'general' ? (
                                <form onSubmit={handleSubmit}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Columna Izquierda: Imagen y Datos básicos */}
                                        <div className="space-y-5">
                                            <ImageUpload
                                                defaultValue={formData.image_url}
                                                onUpload={(url) => setFormData({ ...formData, image_url: url })}
                                            />

                                            {/* Extra Gallery Images */}
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Galería de Imágenes</label>
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {(formData.extra_images || []).map((img, idx) => (
                                                        <div key={idx} className="relative w-16 h-16 rounded-lg border border-gray-200 overflow-hidden group">
                                                            <img src={img} alt={`Extra ${idx + 1}`} className="w-full h-full object-cover" />
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const updated = [...formData.extra_images];
                                                                    updated.splice(idx, 1);
                                                                    setFormData({ ...formData, extra_images: updated });
                                                                }}
                                                                className="absolute inset-0 bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <ImageUpload
                                                    defaultValue=""
                                                    onUpload={(url) => {
                                                        if (url) setFormData(prev => ({ ...prev, extra_images: [...(prev.extra_images || []), url] }));
                                                    }}
                                                />
                                                <p className="text-[9px] text-gray-400 mt-1">Sube imágenes adicionales para la galería del producto</p>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nombre del Producto</label>
                                                <input
                                                    required
                                                    type="text"
                                                    className="w-full border rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-blue-500 focus:outline-none font-bold text-sm"
                                                    value={formData.name}
                                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Referencia / SKU</label>
                                                    <input
                                                        type="text"
                                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none font-mono"
                                                        value={formData.reference}
                                                        onChange={e => setFormData({ ...formData, reference: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Stock</label>
                                                    <input
                                                        type="number"
                                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none font-bold"
                                                        value={formData.stock}
                                                        onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Precio (€)</label>
                                                    <input
                                                        required
                                                        type="number"
                                                        step="0.01"
                                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none font-black"
                                                        value={formData.price}
                                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Precio Oferta (€)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none font-black text-red-600 bg-red-50"
                                                        value={formData.discount_price}
                                                        onChange={e => setFormData({ ...formData, discount_price: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Columna Derecha: Relaciones y Descripción */}
                                        <div className="space-y-5">
                                            {/* Si es variante, hereda categoría/marca generalmente, pero permitimos editar */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Categoría</label>
                                                    <select
                                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none font-bold uppercase"
                                                        value={formData.category_id}
                                                        onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                                                    >
                                                        <option value="">Sin Categoría</option>
                                                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Marca</label>
                                                    <select
                                                        className="w-full border rounded-lg px-3 py-2 text-[10px] focus:outline-none font-bold uppercase"
                                                        value={formData.brand_id}
                                                        onChange={e => setFormData({ ...formData, brand_id: e.target.value })}
                                                    >
                                                        <option value="">Genérica</option>
                                                        {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                                    </select>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Estancias</label>
                                                <div className="border rounded-lg p-3 max-h-32 overflow-y-auto space-y-2 bg-gray-50/50">
                                                    {rooms.map(room => (
                                                        <label key={room.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded transition-colors">
                                                            <input
                                                                type="checkbox"
                                                                className="rounded text-blue-600 focus:ring-blue-500"
                                                                checked={formData.room_ids.includes(room.id)}
                                                                onChange={(e) => {
                                                                    const checked = e.target.checked;
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        room_ids: checked
                                                                            ? [...prev.room_ids, room.id]
                                                                            : prev.room_ids.filter(id => id !== room.id)
                                                                    }));
                                                                }}
                                                            />
                                                            <span className="text-xs font-bold uppercase text-gray-600">{room.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* === ATRIBUTOS MULTI-VALOR === */}
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Opciones del Producto</label>

                                                {/* Lista de atributos actuales como tags */}
                                                <div className="border rounded-lg p-3 bg-gray-50/50 space-y-3 mb-3">
                                                    {Object.entries(formData.attributes).length > 0 ? Object.entries(formData.attributes).map(([key, values]) => {
                                                        // Asegurar que values sea array (compatibilidad con datos antiguos)
                                                        const valArray = Array.isArray(values) ? values : [values];
                                                        return (
                                                            <div key={key}>
                                                                <div className="flex items-center justify-between mb-1.5">
                                                                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-wider">{key}</span>
                                                                    <button type="button" onClick={() => removeAttributeGroup(key)} className="text-[9px] text-red-400 hover:text-red-600 font-bold uppercase">Eliminar grupo</button>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {valArray.map(val => (
                                                                        <span key={val} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white rounded-full border border-gray-200 text-[10px] font-bold text-gray-700 uppercase shadow-sm">
                                                                            {key === 'Color' && (
                                                                                <span className="w-3 h-3 rounded-full border border-gray-300" style={{ backgroundColor: { 'Blanco': '#fff', 'Negro': '#1a1a1a', 'Gris': '#808080', 'Dorado': '#D4AF37', 'Plateado': '#C0C0C0', 'Cobre': '#B87333', 'Rojo': '#DC2626', 'Azul': '#2563EB', 'Verde': '#16A34A', 'Madera': '#8B4513', 'RGB': 'linear-gradient(90deg,red,green,blue)' }[val] || '#ccc' }}></span>
                                                                            )}
                                                                            {val}
                                                                            <button type="button" onClick={() => removeAttributeValue(key, val)} className="text-red-300 hover:text-red-600 ml-0.5">
                                                                                <X className="w-3 h-3" />
                                                                            </button>
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    }) : (
                                                        <p className="text-xs text-gray-400 italic text-center py-3">Sin opciones definidas. Añade voltajes, potencias, colores...</p>
                                                    )}
                                                </div>

                                                {/* Selector para añadir nuevos valores */}
                                                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                                        <div>
                                                            <input
                                                                list="attr-keys"
                                                                placeholder="Atributo (ej. Voltaje, W/M)"
                                                                className="w-full text-[10px] font-bold uppercase p-2 border rounded"
                                                                value={newAttrKey}
                                                                onChange={e => setNewAttrKey(e.target.value)}
                                                            />
                                                            <datalist id="attr-keys">
                                                                {Object.keys(PREDEFINED_ATTRIBUTES).map(k => <option key={k} value={k} />)}
                                                            </datalist>
                                                        </div>
                                                        <div>
                                                            <input
                                                                list="attr-values"
                                                                placeholder="Valor o escribe libre"
                                                                className="w-full text-[10px] font-bold uppercase p-2 border rounded"
                                                                value={newAttrValue}
                                                                onChange={e => setNewAttrValue(e.target.value)}
                                                            />
                                                            <datalist id="attr-values">
                                                                {(PREDEFINED_ATTRIBUTES[newAttrKey] || []).map(v => <option key={v} value={v} />)}
                                                            </datalist>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={addAttribute}
                                                        disabled={!newAttrKey || !newAttrValue}
                                                        className="w-full bg-blue-600 text-white text-[10px] font-black uppercase py-1.5 rounded hover:bg-blue-700 disabled:opacity-50"
                                                    >
                                                        + Añadir Valor
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Descripción Corta</label>
                                                <textarea
                                                    className="w-full border rounded-lg px-3 py-2.5 text-xs focus:outline-none min-h-[100px] resize-none"
                                                    placeholder="Detalles del producto..."
                                                    value={formData.description}
                                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                                ></textarea>
                                            </div>

                                            <button
                                                disabled={isSaving}
                                                type="submit"
                                                className="w-full bg-blue-600 text-white font-black py-4 rounded-lg hover:bg-blue-700 transition-colors uppercase italic tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                                            >
                                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? 'Guardar Cambios' : 'Crear Producto'}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                        <h3 className="font-bold text-blue-900 uppercase text-sm mb-1">Variantes del Producto</h3>
                                        <p className="text-xs text-blue-600">Cada variante tiene su <b>propio precio</b>, <b>stock</b> e imagen. Ej: Tira LED 5m = 15€, Tira LED 10m = 28€</p>
                                    </div>

                                    {/* Inline New Variant Form */}
                                    <div className="bg-white p-5 rounded-xl border-2 border-dashed border-blue-200">
                                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">+ Crear Nueva Variante</h4>

                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div>
                                                <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Precio (€) *</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="Ej: 15.99"
                                                    className="w-full border rounded-lg px-3 py-2 text-sm font-black focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    id="new-variant-price"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Stock *</label>
                                                <input
                                                    type="number"
                                                    placeholder="Ej: 50"
                                                    className="w-full border rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    id="new-variant-stock"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div>
                                                <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Referencia / SKU</label>
                                                <input
                                                    type="text"
                                                    placeholder="Ej: TIRA-LED-5M-ROJO"
                                                    className="w-full border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    id="new-variant-ref"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Precio Oferta (€)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="Opcional"
                                                    className="w-full border rounded-lg px-3 py-2 text-sm font-bold text-red-600 bg-red-50 focus:outline-none"
                                                    id="new-variant-discount"
                                                />
                                            </div>
                                        </div>

                                        {/* Variant Attributes - compact inline */}
                                        <div className="mb-3">
                                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Atributos de esta variante</label>
                                            <div id="new-variant-attrs-display" className="flex flex-wrap gap-1 mb-2"></div>
                                            <div className="flex gap-2">
                                                <input
                                                    list="attr-keys-variant"
                                                    placeholder="Atributo"
                                                    className="flex-1 text-[10px] font-bold uppercase p-2 border rounded"
                                                    id="new-variant-attr-key"
                                                />
                                                <datalist id="attr-keys-variant">
                                                    {Object.keys(PREDEFINED_ATTRIBUTES).map(k => <option key={k} value={k} />)}
                                                </datalist>
                                                <input
                                                    list="attr-values-variant"
                                                    placeholder="Valor"
                                                    className="flex-1 text-[10px] font-bold uppercase p-2 border rounded"
                                                    id="new-variant-attr-val"
                                                />
                                                <datalist id="attr-values-variant">
                                                    {(() => {
                                                        const keyEl = typeof document !== 'undefined' ? document.getElementById('new-variant-attr-key') : null;
                                                        const key = keyEl?.value || '';
                                                        return (PREDEFINED_ATTRIBUTES[key] || []).map(v => <option key={v} value={v} />);
                                                    })()}
                                                </datalist>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            disabled={isSaving}
                                            onClick={async () => {
                                                const priceEl = document.getElementById('new-variant-price');
                                                const stockEl = document.getElementById('new-variant-stock');
                                                const refEl = document.getElementById('new-variant-ref');
                                                const discountEl = document.getElementById('new-variant-discount');
                                                const attrKeyEl = document.getElementById('new-variant-attr-key');
                                                const attrValEl = document.getElementById('new-variant-attr-val');

                                                const price = parseFloat(priceEl?.value);
                                                const stock = parseInt(stockEl?.value || '0');

                                                if (!price || isNaN(price)) {
                                                    alert('El precio es obligatorio');
                                                    return;
                                                }

                                                // Build attributes from current key/val
                                                const attrs = {};
                                                if (attrKeyEl?.value && attrValEl?.value) {
                                                    attrs[attrKeyEl.value.trim()] = attrValEl.value.trim();
                                                }

                                                const parent = products.find(p => p.id === editingId);
                                                const payload = {
                                                    name: parent.name,
                                                    reference: refEl?.value || `${parent.reference || 'PROD'}-V${variants.length + 1}`,
                                                    price: price,
                                                    stock: stock,
                                                    discount_price: discountEl?.value ? parseFloat(discountEl.value) : null,
                                                    category_id: parent.category_id,
                                                    brand_id: parent.brand_id,
                                                    image_url: parent.image_url,
                                                    description: '',
                                                    parent_id: editingId,
                                                    attributes: attrs
                                                };

                                                try {
                                                    setIsSaving(true);
                                                    const { data, error } = await supabase.from('products').insert([payload]).select().single();
                                                    if (error) throw error;
                                                    setVariants(prev => [...prev, data]);
                                                    // Reset form
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
                                            className="w-full bg-blue-600 text-white text-xs font-black uppercase py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                            Crear Variante
                                        </button>
                                    </div>

                                    {/* Existing Variants List */}
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
                                                                {variant.attributes && Object.entries(variant.attributes).map(([k, v]) => {
                                                                    const valStr = Array.isArray(v) ? v.join(', ') : v;
                                                                    return (
                                                                        <span key={k} className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[9px] font-bold uppercase rounded border border-purple-100">
                                                                            {k}: {valStr}
                                                                        </span>
                                                                    );
                                                                })}
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
                                                            <span className={`block text-sm font-black ${parseInt(variant.stock) > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                                {variant.stock || 0}
                                                            </span>
                                                        </div>
                                                        <div className="flex gap-1">
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
                                                                        image_url: variant.image_url || '',
                                                                        description: variant.description || '',
                                                                        discount_price: variant.discount_price || '',
                                                                        parent_id: variant.parent_id,
                                                                        attributes: variant.attributes || {},
                                                                        extra_images: variant.extra_images || []
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

                                        {variants.length === 0 && (
                                            <div className="text-center p-10 text-gray-400 text-xs italic bg-gray-50 border border-dashed border-gray-200 rounded-xl">
                                                <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                                No hay variantes. Crea una arriba con precio y stock propios.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )
            }
        </div>
    );
}

