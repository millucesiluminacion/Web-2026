import { useState, useEffect } from 'react';
import { Search, Loader2, User, Shield, Mail, Calendar, Trash2, Edit2, X, Plus, UserCheck, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function UsersAdmin() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isUpdating, setIsUpdating] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    async function fetchUsers() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error.message);
        } finally {
            setLoading(false);
        }
    }

    async function updateRole(userId, newRole) {
        try {
            setIsUpdating(userId);
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (error) {
            alert('Error al actualizar rol: ' + error.message);
        } finally {
            setIsUpdating(null);
        }
    }

    const filteredUsers = users.filter(u =>
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getRoleStyles = (role) => {
        switch (role?.toLowerCase()) {
            case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'manager': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
            case 'editor': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <span className="text-[10px] font-black text-primary uppercase tracking-[.4em] mb-2 block font-outfit">Access Control</span>
                    <h1 className="text-4xl lg:text-5xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter font-outfit">
                        Gestión de <span className="text-primary/40">Usuarios</span>
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-100 uppercase italic tracking-widest font-outfit flex items-center gap-2">
                        <UserCheck className="w-4 h-4" />
                        {users.length} Administradores
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-gray-100">
                <div className="p-8 border-b border-gray-100 bg-gray-50/20">
                    <div className="relative max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="BUSCAR EQUIPO POR NOMBRE O EMAIL..."
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-300 font-outfit"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-32 flex flex-col items-center justify-center text-gray-400">
                        <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary/20" />
                        <p className="text-[10px] font-black uppercase tracking-widest font-outfit">Cargando privilegios del sistema...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100 font-outfit">
                                    <th className="p-8 text-[10px] font-black uppercase tracking-widest text-gray-400">Miembro del Equipo</th>
                                    <th className="p-8 text-[10px] font-black uppercase tracking-widest text-gray-400">Identificador</th>
                                    <th className="p-8 text-[10px] font-black uppercase tracking-widest text-gray-400">Rol de Acceso</th>
                                    <th className="p-8 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="group hover:bg-gray-50/30 transition-all font-outfit">
                                        <td className="p-8">
                                            <div className="flex items-center gap-5">
                                                <div className="relative">
                                                    <div className="w-14 h-14 rounded-2xl bg-brand-carbon text-white flex items-center justify-center font-black italic text-xl shadow-lg border-2 border-white group-hover:scale-110 transition-transform overflow-hidden">
                                                        {user.avatar_url ? (
                                                            <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                                                        ) : (
                                                            user.full_name?.charAt(0) || 'U'
                                                        )}
                                                    </div>
                                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black uppercase italic text-brand-carbon">{user.full_name || 'Sin Nombre'}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Mail className="w-3 h-3 text-gray-300" />
                                                        <p className="text-[10px] font-bold text-gray-400 lowercase">{user.email || 'sin-email@mil-luces.com'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-8">
                                            <p className="font-mono text-[10px] text-gray-400 font-bold bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 w-fit">
                                                {user.id.slice(0, 12).toUpperCase()}
                                            </p>
                                        </td>
                                        <td className="p-8">
                                            <div className="relative group/select">
                                                <select
                                                    value={user.role || 'editor'}
                                                    onChange={(e) => updateRole(user.id, e.target.value)}
                                                    disabled={isUpdating === user.id}
                                                    className={`appearance-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[.2em] border shadow-sm cursor-pointer focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50 ${getRoleStyles(user.role)}`}
                                                >
                                                    <option value="admin">Administrador Full</option>
                                                    <option value="manager">Gestor de Boutique</option>
                                                    <option value="editor">Editor de Contenido</option>
                                                </select>
                                                {isUpdating === user.id && (
                                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                                        <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-8 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <span className="text-[9px] font-black text-emerald-500 uppercase italic tracking-widest bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                                    Activo
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="p-32 text-center">
                                            <div className="flex flex-col items-center justify-center opacity-20">
                                                <Shield className="w-16 h-16 mb-4 text-gray-400" />
                                                <p className="text-xs font-black uppercase tracking-[.4em] font-outfit">Sin miembros encontrados</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Permissions Widget */}
            <div className="mt-12 bg-neutral-900 rounded-[2.5rem] p-12 flex flex-col lg:flex-row items-center justify-between gap-12 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-1000"></div>

                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                    <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center text-primary shadow-luxury border border-white/5">
                        <Settings className="w-10 h-10 animate-spin-slow" />
                    </div>
                    <div>
                        <p className="text-lg font-black uppercase italic tracking-widest font-outfit text-white">Seguridad de Infraestructura</p>
                        <p className="text-[11px] text-white/40 font-bold uppercase tracking-widest mt-2 leading-relaxed font-outfit max-w-2xl">
                            Estás visualizando los privilegios de acceso basados en roles (RBAC). Cualquier cambio en esta sección impactará directamente en los permisos de visualización y edición dentro del panel administrativo.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap justify-center gap-6 relative z-10">
                    <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-2xl flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                        <span className="text-[9px] font-black uppercase tracking-widest">Admin Control</span>
                    </div>
                    <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-2xl flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                        <span className="text-[9px] font-black uppercase tracking-widest">Manager View</span>
                    </div>
                    <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-2xl flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                        <span className="text-[9px] font-black uppercase tracking-widest">Editor Access</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
