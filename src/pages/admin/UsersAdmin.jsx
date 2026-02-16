import { useState, useEffect } from 'react';
import { Search, Loader2, User, Shield, Mail, Calendar, Trash2, Edit2, X, Plus, UserCheck, Settings, Key, Download, Upload, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import Papa from 'papaparse';

export default function UsersAdmin() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isUpdating, setIsUpdating] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [activeTab, setActiveTab] = useState('all'); // all, persona, profesional
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        role: 'editor',
        user_type: 'persona',
        company_name: '',
        vat_id: '',
        discount_percent: 0
    });

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

    function openCreate() {
        setEditingUser(null);
        setFormData({
            full_name: '',
            email: '',
            role: 'editor',
            user_type: 'persona',
            company_name: '',
            vat_id: '',
            discount_percent: 0
        });
        setIsModalOpen(true);
    }

    function openEdit(user) {
        setEditingUser(user);
        setFormData({
            full_name: user.full_name || '',
            email: user.email || '',
            role: user.role || 'editor',
            user_type: user.user_type || 'persona',
            company_name: user.company_name || '',
            vat_id: user.vat_id || '',
            discount_percent: user.discount_percent || 0
        });
        setIsModalOpen(true);
    }

    async function handleSaveUser(e) {
        e.preventDefault();
        try {
            setIsSaving(true);
            if (editingUser) {
                // Update
                const { error } = await supabase
                    .from('profiles')
                    .update(formData)
                    .eq('id', editingUser.id);
                if (error) throw error;
            } else {
                // For "Creating" a user without auth (not recommended but for CRM/team list purposes)
                // In a real app, this should probably be an invitation
                alert('La creación de usuarios requiere que se registren primero para obtener un ID de seguridad. Por ahora puedes editar los perfiles existentes.');
                return;
            }
            fetchUsers();
            setIsModalOpen(false);
        } catch (error) {
            alert('Error al guardar: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    }

    async function sendPasswordReset(email) {
        if (!confirm(`¿Enviar email de restablecimiento de contraseña a ${email}?`)) return;
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            alert('Email de restablecimiento enviado correctamente.');
        } catch (error) {
            alert('Error al enviar email: ' + error.message);
        }
    }

    const handleExport = () => {
        const csv = Papa.unparse(users.map(u => ({
            ID: u.id,
            Nombre: u.full_name,
            Email: u.email,
            Rol: u.role,
            Tipo: u.user_type,
            Empresa: u.company_name,
            NIF: u.vat_id,
            Descuento: u.discount_percent,
            Creado: u.created_at
        })));
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `equipo_mil_luces_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const importedData = results.data;
                let count = 0;
                let errors = 0;

                for (const row of importedData) {
                    const id = row.ID;
                    if (!id) continue;

                    const updates = {};
                    if (row.Nombre) updates.full_name = row.Nombre;
                    if (row.Rol) updates.role = row.Rol;
                    if (row.Tipo) updates.user_type = row.Tipo;
                    if (row.Empresa) updates.company_name = row.Empresa;
                    if (row.NIF) updates.vat_id = row.NIF;
                    if (row.Descuento) updates.discount_percent = parseFloat(row.Descuento);

                    if (Object.keys(updates).length > 0) {
                        const { error } = await supabase.from('profiles').update(updates).eq('id', id);
                        if (error) errors++;
                        else count++;
                    }
                }
                alert(`Importación finalizada: ${count} actualizados, ${errors} errores.`);
                fetchUsers();
            }
        });
    };

    async function deleteUser(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar este perfil de administrador? (Nota: Esto no elimina la cuenta de Auth, solo el perfil)')) return;
        try {
            const { error } = await supabase.from('profiles').delete().eq('id', id);
            if (error) throw error;
            setUsers(users.filter(u => u.id !== id));
        } catch (error) {
            alert('Error al eliminar: ' + error.message);
        }
    }

    const filteredUsers = users.filter(u => {
        const matchesSearch =
            u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesTab =
            activeTab === 'all' ||
            u.user_type === activeTab;

        return matchesSearch && matchesTab;
    });

    const userCounts = {
        all: users.length,
        persona: users.filter(u => u.user_type === 'persona').length,
        profesional: users.filter(u => u.user_type === 'profesional').length
    };

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
                    <h1 className="text-2xl lg:text-3xl font-black text-brand-carbon uppercase italic leading-none tracking-tighter font-outfit">
                        Gestión de <span className="text-primary/40">Equipo</span>
                    </h1>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-3 bg-brand-carbon text-white px-8 h-14 rounded-2xl font-black uppercase italic text-[10px] shadow-2xl hover:bg-primary transition-all group font-outfit"
                    >
                        <Plus className="w-4 h-4 text-primary group-hover:rotate-90 transition-transform" />
                        Registrar Miembro
                    </button>
                    <label className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-6 h-14 rounded-2xl font-black uppercase italic text-[10px] shadow-sm hover:border-primary transition-all cursor-pointer font-outfit">
                        <Upload className="w-4 h-4 text-primary" />
                        Importar CSV
                        <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
                    </label>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-6 h-14 rounded-2xl font-black uppercase italic text-[10px] shadow-sm hover:border-primary transition-all font-outfit"
                    >
                        <Download className="w-4 h-4 text-primary" />
                        Exportar CSV
                    </button>
                    <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-6 h-14 rounded-2xl border border-blue-100 uppercase italic tracking-widest font-outfit flex items-center gap-2 shadow-sm">
                        <UserCheck className="w-4 h-4" />
                        {users.length} Administradores
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-gray-100">
                <div className="p-8 border-b border-gray-100 bg-gray-50/20">
                    <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                        <div className="relative max-w-md w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="BUSCAR POR NOMBRE O EMAIL..."
                                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-300 font-outfit"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
                            {[
                                { id: 'all', label: 'Todos', count: userCounts.all },
                                { id: 'persona', label: 'Particulares', count: userCounts.persona },
                                { id: 'profesional', label: 'Profesionales', count: userCounts.profesional }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === tab.id
                                        ? 'bg-brand-carbon text-white shadow-lg'
                                        : 'text-gray-400 hover:text-brand-carbon hover:bg-gray-50'
                                        }`}
                                >
                                    {tab.label}
                                    <span className={`px-2 py-0.5 rounded-md text-[8px] ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
                                        }`}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>
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
                                            <div className="flex flex-col gap-1">
                                                <p className="font-mono text-[10px] text-gray-400 font-bold bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 w-fit">
                                                    {user.id.slice(0, 12).toUpperCase()}
                                                </p>
                                                {user.user_type === 'profesional' && (
                                                    <span className="text-[8px] font-black text-primary uppercase bg-primary/5 px-2 py-0.5 rounded border border-primary/10 w-fit">
                                                        PRO {user.discount_percent}% DESC
                                                    </span>
                                                )}
                                            </div>
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
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openEdit(user)}
                                                    className="p-3 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                                    title="Editar Datos"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => sendPasswordReset(user.email)}
                                                    className="p-3 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                                    title="Resetear Contraseña"
                                                >
                                                    <Key className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => deleteUser(user.id)}
                                                    className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                    title="Eliminar Perfil"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
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

            {/* Modal de Edición */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
                    <div className="absolute inset-0 bg-brand-carbon/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                        <div className="p-10 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10">
                            <div>
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-brand-carbon font-outfit">
                                    {editingUser ? 'Editar' : 'Registrar'} <span className="text-primary/40">Miembro</span>
                                </h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 font-outfit">
                                    {editingUser ? 'Actualizar credenciales de acceso' : 'Añadir nuevo integrante al sistema'}
                                </p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-4 hover:bg-gray-100 rounded-full transition-all">
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveUser} className="p-10 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[.3em] text-gray-400 font-outfit">Tipo de Cuenta</label>
                                    <select
                                        className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all font-outfit"
                                        value={formData.user_type}
                                        onChange={(e) => setFormData({ ...formData, user_type: e.target.value })}
                                    >
                                        <option value="persona">Particular</option>
                                        <option value="profesional">Profesional / Empresa</option>
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[.3em] text-gray-400 font-outfit">% Descuento Especial</label>
                                    <div className="relative">
                                        <Settings className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        <input
                                            type="number"
                                            className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all font-outfit"
                                            value={formData.discount_percent}
                                            onChange={(e) => setFormData({ ...formData, discount_percent: parseFloat(e.target.value) })}
                                            placeholder="Ej: 5"
                                        />
                                    </div>
                                </div>
                            </div>

                            {formData.user_type === 'profesional' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-4 duration-300">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[.3em] text-gray-400 font-outfit">Nombre Fiscal</label>
                                        <div className="relative">
                                            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                            <input
                                                className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all font-outfit"
                                                value={formData.company_name}
                                                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                                placeholder="Nombre de la empresa"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[.3em] text-gray-400 font-outfit">NIF / CIF</label>
                                        <div className="relative">
                                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                            <input
                                                className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all font-outfit"
                                                value={formData.vat_id}
                                                onChange={(e) => setFormData({ ...formData, vat_id: e.target.value })}
                                                placeholder="ID Fiscal"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[.3em] text-gray-400 font-outfit">Nombre Completo</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        <input
                                            required
                                            className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all font-outfit"
                                            value={formData.full_name}
                                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                            placeholder="Ej: Marc Pérez"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[.3em] text-gray-400 font-outfit">Email Corporativo</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        <input
                                            required
                                            type="email"
                                            className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all font-outfit"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="email@mil-luces.com"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-[.3em] text-gray-400 font-outfit">Nivel de Acceso</label>
                                <div className="grid grid-cols-1 gap-3">
                                    {[
                                        { id: 'admin', label: 'Administrador Full', desc: 'Control total de la boutique' },
                                        { id: 'manager', label: 'Gestor de Boutique', desc: 'Gestión de productos y stock' },
                                        { id: 'editor', label: 'Editor de Contenido', desc: 'Solo edición visual y blog' }
                                    ].map((role) => (
                                        <button
                                            key={role.id}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, role: role.id })}
                                            className={`flex flex-col p-4 rounded-2xl border-2 transition-all text-left ${formData.role === role.id ? 'border-primary bg-primary/5' : 'border-gray-50 bg-white hover:border-gray-100'
                                                }`}
                                        >
                                            <span className="text-[10px] font-black uppercase italic tracking-widest">{role.label}</span>
                                            <span className="text-[9px] font-bold text-gray-400 uppercase mt-1 tracking-tighter">{role.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-6">
                                <button
                                    disabled={isSaving}
                                    className="w-full bg-brand-carbon text-white py-5 rounded-[1.5rem] font-black uppercase italic text-xs shadow-2xl hover:bg-primary transition-all flex items-center justify-center gap-3 font-outfit active:scale-95"
                                >
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Shield className="w-5 h-5 text-primary" />}
                                    {editingUser ? 'Confirmar Privilegios' : 'Enviar Invitación'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
