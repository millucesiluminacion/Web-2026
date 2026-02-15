import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Package, ShoppingCart, Users, Settings, LogOut, Menu, Tag, Award,
    CheckSquare, Sofa, Image as ImageIcon, CreditCard, BookOpen, Briefcase, UserPlus
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export function AdminLayout() {
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchRole = async (userId) => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', userId)
                    .single();

                if (error) throw error;
                setUserRole(data?.role);

                // RBAC: Redirect if not an authorized role
                const authorizedRoles = ['admin', 'manager', 'editor'];
                if (!authorizedRoles.includes(data?.role)) {
                    navigate('/');
                }
            } catch (error) {
                console.error('Error fetching role:', error.message);
                navigate('/');
            } finally {
                setLoading(false);
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (!session) {
                navigate('/login');
            } else {
                fetchRole(session.user.id);
            }
        });

        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (!session) {
                navigate('/login');
            } else {
                fetchRole(session.user.id);
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50">
                <div className="w-16 h-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin mb-4"></div>
                <p className="text-[10px] font-black uppercase tracking-[.4em] text-gray-400 font-outfit">Verificando Credenciales...</p>
            </div>
        );
    }

    const navGroups = [
        {
            title: 'Comercio',
            items: [
                { icon: Package, label: 'Productos', path: '/admin/products' },
                { icon: Menu, label: 'Categorías', path: '/admin/categories' },
                { icon: Sofa, label: 'Estancias', path: '/admin/rooms' },
                { icon: Tag, label: 'Ofertas', path: '/admin/offers' },
                { icon: Award, label: 'Marcas', path: '/admin/brands' },
            ]
        },
        {
            title: 'Contenido',
            items: [
                { icon: ImageIcon, label: 'Sliders / Banners', path: '/admin/sliders' },
                { icon: BookOpen, label: 'Blog', path: '/admin/blog' },
                { icon: Briefcase, label: 'Proyectos', path: '/admin/projects' },
                { icon: CheckSquare, label: 'Por qué elegirnos', path: '/admin/why-us' },
            ]
        },
        {
            title: 'Gestión',
            items: [
                { icon: ShoppingCart, label: 'Pedidos', path: '/admin/orders' },
                { icon: Users, label: 'Clientes', path: '/admin/customers' },
            ]
        },
        {
            title: 'Sistema',
            items: [
                { icon: CreditCard, label: 'Pagos', path: '/admin/payments' },
                { icon: UserPlus, label: 'Usuarios', path: '/admin/users' },
                { icon: Settings, label: 'Ajustes', path: '/admin/settings' },
            ]
        }
    ];

    return (
        <div className="flex h-screen bg-[#FDFDFD] font-sans text-brand-carbon">
            {/* Sidebar - Boutique Carbon */}
            <aside className={`${isSidebarOpen ? 'w-72' : 'w-24'} bg-brand-carbon text-white transition-all duration-500 ease-in-out flex flex-col z-50`}>
                <div className="p-8 flex items-center justify-between border-b border-white/5 h-24">
                    {isSidebarOpen ? (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1 overflow-hidden shadow-luxury">
                                <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-black text-sm tracking-[.1em] text-white uppercase italic">MIL LUCES</span>
                                <span className="text-[7px] font-bold text-primary uppercase tracking-[.4em]">Boutique Admin</span>
                            </div>
                        </div>
                    ) : (
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1 overflow-hidden mx-auto shadow-luxury">
                            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                    )}
                </div>

                <nav className="flex-1 py-8 overflow-y-auto custom-scrollbar">
                    <div className="px-4 space-y-8">
                        {/* Dashboard Solo Link */}
                        <Link
                            to="/admin"
                            className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${location.pathname === '/admin'
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <LayoutDashboard className={`w-5 h-5 transition-transform duration-500 ${location.pathname === '/admin' ? 'scale-110' : 'group-hover:scale-110'}`} />
                            {isSidebarOpen && (
                                <span className="text-[11px] font-black uppercase tracking-widest italic">Dashboard</span>
                            )}
                        </Link>

                        {navGroups.map((group) => {
                            const filteredItems = group.items.filter(item => {
                                if (item.label === 'Usuarios') return userRole === 'admin';
                                return true;
                            });

                            if (filteredItems.length === 0) return null;

                            return (
                                <div key={group.title} className="space-y-3">
                                    {isSidebarOpen && (
                                        <h3 className="px-5 text-[9px] font-black text-gray-500 uppercase tracking-[.3em]">{group.title}</h3>
                                    )}
                                    <ul className="space-y-1">
                                        {filteredItems.map((item) => {
                                            const Icon = item.icon;
                                            const isActive = location.pathname === item.path;
                                            return (
                                                <li key={item.path}>
                                                    <Link
                                                        to={item.path}
                                                        className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 group ${isActive
                                                            ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                                            : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                                    >
                                                        <Icon className={`w-5 h-5 transition-transform duration-500 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                                                        {isSidebarOpen && (
                                                            <span className="text-[11px] font-black uppercase tracking-widest italic">{item.label}</span>
                                                        )}
                                                    </Link>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                </nav>

                <div className="p-6 border-t border-white/5">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-4 text-gray-500 hover:text-white transition-all group w-full px-4 py-4 rounded-2xl hover:bg-white/5"
                    >
                        <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        {isSidebarOpen && <span className="text-[11px] font-black uppercase tracking-widest italic">Cerrar Sesión</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 p-6 flex items-center justify-between z-40">
                    <button
                        onClick={() => setSidebarOpen(!isSidebarOpen)}
                        className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 rounded-full transition-all text-gray-400 hover:text-brand-carbon"
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-black text-brand-carbon uppercase italic">
                                {user?.user_metadata?.full_name || 'Miembro del Equipo'}
                            </p>
                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">
                                {user?.email}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black italic shadow-inner overflow-hidden border border-primary/5">
                            {user?.user_metadata?.full_name?.charAt(0) || 'A'}
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-10 bg-[#FDFDFD]">
                    <div className="max-w-[1600px] mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
