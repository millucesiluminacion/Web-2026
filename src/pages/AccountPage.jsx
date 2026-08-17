import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    User, Mail, Phone, MapPin, Shield, Star,
    Zap, LogOut, Loader2, Save, Key, ShoppingBag,
    ArrowRight, Bell, Heart, CreditCard, X, Upload, CheckSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

export default function AccountPage() {
    const { user, profile, signOut, isPartner, userTier, refreshProfile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('perfil'); // 'perfil', 'favoritos', 'pedidos'

    // Data states
    const [orders, setOrders] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [isDataLoading, setIsDataLoading] = useState(false);

    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        address: '',
        company_name: '',
        vat_id: '',
        tax_document_url: ''
    });
    const [showWelcome, setShowWelcome] = useState(false);

    const [passwordData, setPasswordData] = useState({
        password: '',
        confirmPassword: ''
    });

    useEffect(() => {
        if (profile) {
            setFormData({
                full_name: profile.full_name || '',
                phone: profile.phone || '',
                address: profile.address || '',
                company_name: profile.company_name || '',
                vat_id: profile.vat_id || '',
                tax_document_url: profile.tax_document_url || ''
            });
            setShowWelcome(profile.needs_welcome_msg);
            setLoading(false);
            fetchAccountData();
        }
    }, [profile]);

    const dismissWelcome = async () => {
        try {
            await supabase.from('profiles').update({ needs_welcome_msg: false }).eq('id', user.id);
            setShowWelcome(false);
        } catch (err) {
            console.error("Error dismissing welcome:", err);
        }
    };

    const fetchAccountData = async () => {
        if (!user) return;
        setIsDataLoading(true);
        try {
            // Fetch Orders (By user_id OR email for redundancy)
            const { data: ordersData } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .or(`user_id.eq.${user.id},customer_email.eq.${user.email}`)
                .order('created_at', { ascending: false });

            // Fetch Favorites
            const { data: favsData } = await supabase
                .from('user_favorites')
                .select('*, products(*)')
                .eq('user_id', user.id);

            if (ordersData) setOrders(ordersData);
            if (favsData) setFavorites(favsData.map(f => f.products));
        } catch (err) {
            console.error("Error fetching account data:", err);
        } finally {
            setIsDataLoading(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update(formData)
                .eq('id', user.id);

            if (error) throw error;
            await refreshProfile();
            alert('Perfil actualizado con éxito');
        } catch (err) {
            alert('Error al actualizar: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (passwordData.password !== passwordData.confirmPassword) {
            return alert('Las contraseñas no coinciden');
        }
        setIsSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordData.password
            });
            if (error) throw error;
            alert('Contraseña actualizada correctamente');
            setPasswordData({ password: '', confirmPassword: '' });
        } catch (err) {
            alert('Error al actualizar contraseña: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveFavorite = async (productId) => {
        try {
            const { error } = await supabase
                .from('user_favorites')
                .delete()
                .eq('user_id', user.id)
                .eq('product_id', productId);

            if (error) throw error;
            setFavorites(favorites.filter(p => p.id !== productId));
        } catch (err) {
            alert("Error al quitar favorito");
        }
    };

    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    if (loading) return (
        <div className="flex h-[60vh] items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 font-outfit">
            {/* Welcome Banner for Migrated Users */}
            {showWelcome && (
                <div className="mb-8 p-8 rounded-[2rem] bg-primary/10 border border-primary/20 flex items-center justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg">
                            <Zap className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-sm font-black uppercase italic text-brand-carbon tracking-tight">¡Hola {profile.full_name?.split(' ')[0]}! Te echábamos de menos</p>
                            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mt-1">Hemos migrado tu cuenta y ya la tienes activa, disfruta de nuestra nueva tienda online.</p>
                        </div>
                    </div>
                    <button
                        onClick={dismissWelcome}
                        className="p-3 hover:bg-white rounded-full transition-all text-gray-400 hover:text-brand-carbon shadow-sm"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}
            {/* Header / Banner */}
            <div className="relative mb-12 rounded-[3rem] overflow-hidden bg-brand-carbon p-10 lg:p-16 text-white shadow-2xl">
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                    <div className="flex items-center gap-8">
                        <div className="w-24 h-24 lg:w-32 lg:h-32 bg-primary/20 rounded-[2.5rem] border border-primary/20 flex items-center justify-center text-4xl font-black italic text-primary">
                            {formData.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`text-[10px] font-black uppercase tracking-[.3em] px-3 py-1 rounded-lg ${userTier === 'vip' ? 'bg-yellow-400 text-brand-carbon' : userTier === 'pro' ? 'bg-primary text-white' : 'bg-white/10 text-gray-400'}`}>
                                    {userTier === 'vip' ? 'Socio VIP' : userTier === 'pro' ? 'Cliente Profesional' : 'Cliente Boutique'}
                                </span>
                            </div>
                            <h1 className="text-4xl lg:text-6xl font-black uppercase italic leading-none tracking-tighter">
                                Hola, <span className="text-primary">{formData.full_name?.split(' ')[0] || 'Usuario'}</span>
                            </h1>
                            <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mt-4 flex items-center gap-2">
                                <Mail className="w-4 h-4 text-primary" /> {user?.email}
                            </p>
                        </div>
                    </div>

                    {profile?.discount_percent > 0 && (
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] flex items-center gap-6">
                            <div className="bg-primary/20 p-4 rounded-2xl">
                                <Zap className="w-8 h-8 text-primary shadow-[0_0_20px_rgba(255,5,5,0.4)]" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Tu Ventaja Exclusiva</p>
                                <p className="text-3xl font-black italic">{profile.discount_percent}% de Descuento</p>
                                <p className="text-[9px] font-bold text-gray-500 uppercase mt-1 leading-tight">Aplicado automáticamente en todo el catálogo</p>
                            </div>
                        </div>
                    )}
                </div>
                {/* Decorative background elements */}
                <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/10 rounded-full blur-[100px]"></div>
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Categorías laterales */}
                <div className="lg:col-span-3 space-y-4">
                    {[
                        { id: 'perfil', label: 'Mi Información', icon: User },
                        { id: 'favoritos', label: 'Mis Favoritos', icon: Heart },
                        { id: 'pedidos', label: 'Historial de Pedidos', icon: ShoppingBag },
                        { id: 'pagos', label: 'Métodos de Pago', icon: CreditCard },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center justify-between p-6 rounded-3xl transition-all group ${activeTab === tab.id
                                ? 'bg-primary text-white shadow-xl shadow-primary/20 translate-x-2'
                                : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100 hover:border-primary/20'}`}
                        >
                            <div className="flex items-center gap-4">
                                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : 'text-gray-300'}`} />
                                <span className="text-[11px] font-black uppercase tracking-widest italic">{tab.label}</span>
                            </div>
                            <ArrowRight className={`w-4 h-4 opacity-0 transition-all ${activeTab === tab.id ? 'opacity-100 mr-2' : ''}`} />
                        </button>
                    ))}

                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-4 p-6 rounded-3xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all group mt-8"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="text-[11px] font-black uppercase tracking-widest italic">Cerrar Sesión</span>
                    </button>
                </div>

                {/* Área de contenido central */}
                <div className="lg:col-span-9 space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
                    {activeTab === 'favoritos' && (
                        <div className="space-y-8">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-4">
                                    <Heart className="w-6 h-6 text-primary" />
                                    <h3 className="text-xl font-black text-brand-carbon uppercase italic">Mis Productos Favoritos</h3>
                                </div>
                                <span className="text-[10px] font-black uppercase text-gray-400">{favorites.length} Guardados</span>
                            </div>

                            {favorites.length === 0 ? (
                                <div className="bg-white rounded-[3rem] p-20 border border-gray-100 shadow-luxury text-center">
                                    <Heart className="w-16 h-16 text-gray-100 mx-auto mb-6" />
                                    <p className="text-sm font-black uppercase text-gray-400 italic">No tienes productos en favoritos aún</p>
                                    <Link to="/productos" className="mt-8 inline-flex px-10 py-5 bg-brand-carbon text-white rounded-2xl font-black uppercase italic text-xs hover:bg-primary transition-all">Explorar Catálogo</Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {favorites.map(product => (
                                        <div key={product.id} className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-luxury flex items-center gap-6 group hover:border-primary/20 transition-all">
                                            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-50 flex-shrink-0">
                                                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-xs font-black uppercase truncate text-brand-carbon mb-1">{product.name}</h4>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">{product.category}</p>
                                                <div className="flex items-center justify-between">
                                                    <Link to={`/producto/${product.slug}`} className="text-[10px] font-black text-primary uppercase italic hover:underline">Ver Producto</Link>
                                                    <button
                                                        onClick={() => handleRemoveFavorite(product.id)}
                                                        className="p-2 text-gray-300 hover:text-red-500 transition-all"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'pedidos' && (
                        <div className="space-y-8">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-4">
                                    <ShoppingBag className="w-6 h-6 text-primary" />
                                    <h3 className="text-xl font-black text-brand-carbon uppercase italic">Historial de Pedidos</h3>
                                </div>
                                <span className="text-[10px] font-black uppercase text-gray-400">{orders.length} Realizados</span>
                            </div>

                            {isDataLoading ? (
                                <div className="flex justify-center p-20">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            ) : orders.length === 0 ? (
                                <div className="bg-white rounded-[3rem] p-20 border border-gray-100 shadow-luxury text-center">
                                    <ShoppingBag className="w-16 h-16 text-gray-100 mx-auto mb-6" />
                                    <p className="text-sm font-black uppercase text-gray-400 italic">Aún no has realizado ningún pedido</p>
                                    <Link to="/productos" className="mt-8 inline-flex px-10 py-5 bg-brand-carbon text-white rounded-2xl font-black uppercase italic text-xs hover:bg-primary transition-all">Empezar a Comprar</Link>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {orders.map(order => (
                                        <div key={order.id} className="bg-white rounded-[3rem] border border-gray-100 shadow-luxury overflow-hidden group hover:border-primary/20 transition-all">
                                            <div className="p-8 lg:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                                                <div className="flex items-center gap-8">
                                                    <div className="w-16 h-16 rounded-[1.5rem] bg-gray-50 flex items-center justify-center text-brand-carbon group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                                        <ShoppingBag className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span className="text-[10px] font-black uppercase tracking-[.3em] text-gray-400">Ref: #{order.id.slice(0, 8).toUpperCase()}</span>
                                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                                                                order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-700' :
                                                                    'bg-amber-100 text-amber-700'
                                                                }`}>
                                                                {order.status === 'PENDING' ? 'Pendiente' :
                                                                    order.status === 'PROCESSING' ? 'En Preparación' :
                                                                        order.status === 'SHIPPED' ? 'Enviado' :
                                                                            order.status === 'COMPLETED' ? 'Entregado' : order.status}
                                                            </span>
                                                        </div>
                                                        <p className="text-lg font-black uppercase italic text-brand-carbon tracking-tight">
                                                            {new Date(order.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-10">
                                                    <div className="text-right hidden sm:block">
                                                        <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Método</p>
                                                        <p className="text-[11px] font-black text-brand-carbon uppercase italic">
                                                            {order.shipping_method === 'pickup' ? 'Recogida Tienda' : 'Envío Domicilio'}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Inversión Total</p>
                                                        <p className="text-2xl font-black italic text-brand-carbon">{order.total.toFixed(2)}€</p>
                                                    </div>
                                                    <div className="w-12 h-12 rounded-full border border-gray-100 flex items-center justify-center group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all cursor-pointer">
                                                        <ArrowRight className="w-5 h-5" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Order Mini Items List */}
                                            <div className="px-10 pb-8 flex gap-4 overflow-x-auto scrollbar-hide">
                                                {order.order_items?.map((item, idx) => (
                                                    <div key={idx} className="flex-shrink-0 flex items-center gap-3 bg-gray-50/50 p-3 rounded-2xl border border-gray-50">
                                                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[10px] font-black">
                                                            {item.quantity}x
                                                        </div>
                                                        <p className="text-[10px] font-bold text-gray-500 uppercase truncate max-w-[120px]">{item.product_name}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'perfil' && (
                        <div className="space-y-8">
                            {/* Datos Personales */}
                            <div className="bg-white rounded-[2.5rem] shadow-luxury border border-gray-100 p-10">
                                <div className="flex items-center justify-between mb-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                                        <h3 className="text-xl font-black text-brand-carbon uppercase italic">Información Personal</h3>
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tus datos nunca serán compartidos</p>
                                </div>

                                <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre y Apellidos</label>
                                        <div className="relative">
                                            <User className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                            <input
                                                type="text"
                                                className="premium-input pl-14 w-full h-16 bg-gray-50/50 hover:bg-white focus:bg-white"
                                                value={formData.full_name}
                                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Teléfono de Contacto</label>
                                        <div className="relative">
                                            <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                            <input
                                                type="tel"
                                                className="premium-input pl-14 w-full h-16 bg-gray-50/50 hover:bg-white focus:bg-white"
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Dirección Principal</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-6 top-6 w-4 h-4 text-gray-300" />
                                            <textarea
                                                className="premium-input pl-14 w-full h-32 pt-6 bg-gray-50/50 hover:bg-white focus:bg-white resize-none"
                                                value={formData.address}
                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {(profile?.company_name || profile?.user_type === 'profesional') && (
                                        <>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Empresa / Razón Social</label>
                                                <input
                                                    type="text"
                                                    className="premium-input w-full h-16 bg-gray-50/50 hover:bg-white focus:bg-white"
                                                    value={formData.company_name}
                                                    onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">CIF / NIF (VAT ID)</label>
                                                <input
                                                    type="text"
                                                    className="premium-input w-full h-16 bg-gray-50/50 hover:bg-white focus:bg-white"
                                                    value={formData.vat_id}
                                                    onChange={e => setFormData({ ...formData, vat_id: e.target.value })}
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* Professional Document Upload */}
                                    {profile?.user_type === 'profesional' && (
                                        <div className="md:col-span-2 space-y-4 pt-4 border-t border-gray-100">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Shield className="w-5 h-5 text-primary" />
                                                <span className="text-[10px] font-black uppercase tracking-[.3em] text-brand-carbon">Validación Profesional</span>
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                                                Sube tu DNI/CIF o modelo 036 para validar tus ventajas comerciales como cliente profesional.
                                            </p>

                                            {formData.tax_document_url ? (
                                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                                            <CheckSquare className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black uppercase text-brand-carbon">Documento Cargado</p>
                                                            <a
                                                                href={formData.tax_document_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-[9px] font-bold text-primary uppercase tracking-widest hover:underline"
                                                            >Ver Documento Actual</a>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, tax_document_url: '' })}
                                                        className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-red-500 transition-all"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="relative group">
                                                    <input
                                                        type="file"
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                        onChange={async (e) => {
                                                            const file = e.target.files[0];
                                                            if (!file) return;
                                                            try {
                                                                const { data, error } = await supabase.storage
                                                                    .from('images')
                                                                    .upload(`docs/${user.id}/${Date.now()}_${file.name}`, file);
                                                                if (error) throw error;
                                                                const { data: { publicUrl } } = supabase.storage
                                                                    .from('images')
                                                                    .getPublicUrl(data.path);
                                                                setFormData({ ...formData, tax_document_url: publicUrl });
                                                            } catch (err) {
                                                                alert('Error al subir documento: ' + err.message);
                                                            }
                                                        }}
                                                    />
                                                    <div className="flex items-center gap-3 p-6 bg-white border-2 border-dashed border-gray-100 rounded-3xl group-hover:border-primary/20 group-hover:bg-primary/5 transition-all text-center justify-center">
                                                        <Upload className="w-5 h-5 text-gray-300 group-hover:text-primary" />
                                                        <span className="text-[10px] font-black uppercase italic tracking-tighter text-gray-400 group-hover:text-brand-carbon">Subir DNI / CIF / 036</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="md:col-span-2 pt-6">
                                        <button
                                            type="submit"
                                            disabled={isSaving}
                                            className="bg-brand-carbon text-white h-16 px-12 rounded-2xl flex items-center justify-center gap-4 hover:bg-primary transition-all font-black uppercase italic text-xs shadow-2xl disabled:opacity-50"
                                        >
                                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Save className="w-5 h-5 text-primary" />}
                                            Guardar Cambios del Perfil
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Cambio de Contraseña */}
                            <div className="bg-white rounded-[2.5rem] shadow-luxury border border-gray-100 p-10">
                                <div className="flex items-center gap-4 mb-10">
                                    <div className="w-2 h-2 bg-brand-carbon rounded-full"></div>
                                    <h3 className="text-xl font-black text-brand-carbon uppercase italic">Seguridad y Acceso</h3>
                                </div>

                                <form onSubmit={handleUpdatePassword} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nueva Contraseña</label>
                                        <div className="relative">
                                            <Key className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                            <input
                                                type="password"
                                                className="premium-input pl-14 w-full h-16 bg-gray-50/50 hover:bg-white focus:bg-white"
                                                value={passwordData.password}
                                                onChange={e => setPasswordData({ ...passwordData, password: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirmar Contraseña</label>
                                        <div className="relative">
                                            <Shield className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                            <input
                                                type="password"
                                                className="premium-input pl-14 w-full h-16 bg-gray-50/50 hover:bg-white focus:bg-white"
                                                value={passwordData.confirmPassword}
                                                onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 pt-4">
                                        <button
                                            type="submit"
                                            disabled={isSaving}
                                            className="bg-brand-carbon text-white h-16 px-12 rounded-2xl flex items-center justify-center gap-4 hover:bg-primary transition-all font-black uppercase italic text-xs shadow-2xl disabled:opacity-50"
                                        >
                                            Actualizar Contraseña
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                    {activeTab === 'pagos' && (
                        <div className="space-y-8">
                            <div className="flex items-center gap-4 mb-2">
                                <CreditCard className="w-6 h-6 text-emerald-500" />
                                <h3 className="text-xl font-black text-brand-carbon uppercase italic">Métodos de Pago</h3>
                            </div>

                            <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-luxury space-y-8">
                                <div className="flex items-start gap-6 bg-emerald-50/50 p-8 rounded-3xl border border-emerald-100/50 text-emerald-900">
                                    <Shield className="w-8 h-8 text-emerald-600 flex-shrink-0" />
                                    <div>
                                        <h4 className="text-sm font-black uppercase italic tracking-tight mb-2">Transacciones Blindadas</h4>
                                        <p className="text-xs font-bold leading-relaxed opacity-70">
                                            Tus pagos se procesan de forma segura a través de Stripe. No almacenamos los datos completos de tu tarjeta en nuestra base de datos para garantizar el máximo estándar de seguridad (PCI DSS).
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                    <div className="p-8 rounded-[2rem] bg-gradient-to-br from-brand-carbon to-slate-800 text-white shadow-2xl relative overflow-hidden group">
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-start mb-12">
                                                <CreditCard className="w-8 h-8 text-primary" />
                                                <span className="text-[10px] font-black uppercase tracking-[.3em] opacity-40">Stripe Secure</span>
                                            </div>
                                            <p className="text-lg font-mono tracking-[.3em] mb-8">•••• •••• •••• 4242</p>
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Titular</p>
                                                    <p className="text-xs font-black uppercase italic">{formData.full_name}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Expira</p>
                                                    <p className="text-xs font-black italic">12/28</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/20 transition-all duration-700"></div>
                                    </div>

                                    <button className="h-full min-h-[200px] border-2 border-dashed border-gray-100 rounded-[2rem] flex flex-col items-center justify-center gap-4 hover:border-primary/40 hover:bg-gray-50/50 transition-all group">
                                        <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-primary group-hover:text-white transition-all">
                                            <CreditCard className="w-6 h-6" />
                                        </div>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-brand-carbon">Gestionar en Stripe</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
