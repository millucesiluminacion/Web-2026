import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
    Search, Package, Truck, ExternalLink, FileText, FileCheck2,
    Receipt, Clock, CheckCircle2, AlertCircle, Loader2, MapPin, X
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import {
    parseOrderTracking,
    parseOrderInvoiceMeta,
    isOrderPaidOrBeyond,
    saveOrderInvoiceRequest
} from '../lib/orderTrackingUtils';
import { generateOrderTicketPDF } from '../lib/pdfGenerator';

const STATUS_MAP = {
    'PENDING': { label: 'Pendiente', style: 'bg-amber-50 text-amber-600 border-amber-100' },
    'AWAITING_PAYMENT': { label: 'Pendiente de Pago', style: 'bg-orange-50 text-orange-600 border-orange-100' },
    'PAID': { label: 'Pagado', style: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    'PROCESSING': { label: 'En Preparación', style: 'bg-blue-50 text-blue-600 border-blue-100' },
    'READY_TO_SHIP': { label: 'Listo para Envío', style: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
    'SHIPPED': { label: 'Enviado', style: 'bg-purple-50 text-purple-600 border-purple-100' },
    'IN_TRANSIT': { label: 'En Reparto', style: 'bg-purple-50 text-purple-600 border-purple-100' },
    'DELIVERED': { label: 'Entregado', style: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    'COMPLETED': { label: 'Completado', style: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    'CANCELLED': { label: 'Cancelado', style: 'bg-red-50 text-red-600 border-red-100' },
    'RETURNED': { label: 'Devuelto', style: 'bg-gray-100 text-gray-600 border-gray-200' }
};

export default function OrderTrackingPage() {
    const [searchParams] = useSearchParams();
    const [orderRef, setOrderRef] = useState(searchParams.get('ref') || '');
    const [email, setEmail] = useState(searchParams.get('email') || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [order, setOrder] = useState(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);

    // Modal "Pedir Factura"
    const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
    const [invoiceForm, setInvoiceForm] = useState({
        company_name: '',
        vat_id: '',
        fiscal_address: ''
    });
    const [savingInvoiceReq, setSavingInvoiceReq] = useState(false);

    useEffect(() => {
        const initialRef = searchParams.get('ref');
        const initialEmail = searchParams.get('email');
        if (initialRef && initialEmail) {
            lookupOrder(initialRef, initialEmail);
        }
    }, []);

    const lookupOrder = async (refInput, emailInput) => {
        const cleanRef = (refInput || '').replace(/^#/, '').trim().toUpperCase();
        const cleanEmail = (emailInput || '').trim();

        if (!cleanRef || !cleanEmail) {
            setError('Por favor, introduce la referencia del pedido y el email de compra.');
            return;
        }

        setLoading(true);
        setError('');
        setOrder(null);

        try {
            const { data, error: dbError } = await supabase
                .from('orders')
                .select('*, order_items(*, products(reference, slug, image_url))')
                .ilike('customer_email', cleanEmail)
                .order('created_at', { ascending: false });

            if (dbError) throw dbError;

            const matched = (data || []).find(o => {
                const fullId = String(o.id || '').toUpperCase();
                const shortId = fullId.slice(0, 8);
                return shortId === cleanRef || fullId === cleanRef;
            });

            if (!matched) {
                setError('No hemos encontrado ningún pedido que coincida con esa referencia y email. Revisa los datos e inténtalo de nuevo.');
            } else {
                setOrder(matched);
            }
        } catch (err) {
            console.error('Error searching order:', err);
            setError('Ocurrió un error al consultar el pedido. Por favor, inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        lookupOrder(orderRef, email);
    };

    const handleDownloadTicket = async () => {
        if (!order) return;
        try {
            setGeneratingPdf(true);
            await generateOrderTicketPDF(order, order.order_items);
        } catch (err) {
            console.error('Error generating ticket PDF:', err);
            alert('No se pudo generar el ticket en PDF. Inténtalo de nuevo.');
        } finally {
            setGeneratingPdf(false);
        }
    };

    const openRequestInvoiceModal = () => {
        if (!order) return;
        const { invoiceRequest } = parseOrderInvoiceMeta(order);
        setInvoiceForm({
            company_name: invoiceRequest?.company_name || order.customer_name || '',
            vat_id: invoiceRequest?.vat_id || '',
            fiscal_address: invoiceRequest?.fiscal_address || [order.shipping_address, order.shipping_zip, order.shipping_city].filter(Boolean).join(', ')
        });
        setInvoiceModalOpen(true);
    };

    const handleSaveInvoiceRequest = async (e) => {
        e.preventDefault();
        if (!order) return;
        if (!invoiceForm.company_name.trim() || !invoiceForm.vat_id.trim()) {
            alert('Por favor, indica el Nombre / Razón Social y el NIF / CIF.');
            return;
        }
        try {
            setSavingInvoiceReq(true);
            const updatedNotes = await saveOrderInvoiceRequest(supabase, order, invoiceForm);
            setOrder(prev => ({ ...prev, notes: updatedNotes }));
            setInvoiceModalOpen(false);
        } catch (err) {
            console.error('Error saving invoice request:', err);
            alert('No se pudo guardar la solicitud de factura: ' + err.message);
        } finally {
            setSavingInvoiceReq(false);
        }
    };

    const statusObj = order ? (STATUS_MAP[order.status] || { label: order.status || 'Recibido', style: 'bg-gray-50 text-gray-500 border-gray-100' }) : null;
    const tracking = order ? parseOrderTracking(order) : null;
    const hasTracking = Boolean(tracking?.carrier || tracking?.number || tracking?.url);
    const { invoiceRequest, officialInvoice } = order ? parseOrderInvoiceMeta(order) : {};
    const canDownloadTicket = order ? isOrderPaidOrBeyond(order) : false;

    return (
        <div className="min-h-screen bg-[#FDFDFD] pt-8 pb-24 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Cabecera */}
                <div className="text-center mb-10">
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mb-4">
                        <Receipt className="w-3.5 h-3.5" /> Consulta de Pedidos y Facturas
                    </span>
                    <h1 className="text-3xl md:text-4xl font-black text-brand-carbon uppercase italic tracking-tighter">
                        Localiza tu Pedido o Ticket
                    </h1>
                    <p className="text-xs font-medium text-gray-500 mt-2 max-w-lg mx-auto">
                        Tanto si compraste como invitado como si tienes cuenta, introduce la referencia de tu pedido y tu email para consultar el estado, descargar tu <strong>Ticket Simplificado (PDF)</strong> o <strong>Pedir Factura</strong>.
                    </p>
                </div>

                {/* Buscador */}
                <form
                    onSubmit={handleSubmit}
                    className="bg-white rounded-[2rem] p-6 md:p-8 border border-gray-100 shadow-sm mb-8"
                >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-4">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                Referencia del Pedido *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Ej: #A1B2C3D4"
                                value={orderRef}
                                onChange={e => setOrderRef(e.target.value)}
                                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-carbon text-sm font-mono font-bold uppercase"
                            />
                        </div>
                        <div className="md:col-span-5">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                Email de Compra *
                            </label>
                            <input
                                type="email"
                                required
                                placeholder="tu@email.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-carbon text-sm font-medium"
                            />
                        </div>
                        <div className="md:col-span-3">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 px-6 bg-brand-carbon text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-primary transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-carbon/10 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                Buscar
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-700 text-xs font-bold">
                            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                            <span>{error}</span>
                        </div>
                    )}
                </form>

                {/* Resultado del Pedido */}
                {order && (
                    <div className="bg-white rounded-[2.5rem] p-6 md:p-10 border border-gray-100 shadow-sm space-y-6 animate-in fade-in duration-300">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="font-mono text-sm font-black text-brand-carbon bg-gray-100 px-3 py-1 rounded-lg">
                                        #{order.id.slice(0, 8).toUpperCase()}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusObj.style}`}>
                                        {statusObj.label}
                                    </span>
                                </div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    Realizado el {new Date(order.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                            <div className="sm:text-right">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Importe Total</p>
                                <p className="text-2xl font-black text-brand-carbon italic">
                                    {Number(order.total || 0).toFixed(2)} €
                                </p>
                            </div>
                        </div>

                        {/* Botones de Descarga de Ticket y Pedir Factura */}
                        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-gray-50/80 border border-gray-100">
                            <div className="flex flex-wrap items-center gap-2">
                                {canDownloadTicket ? (
                                    <button
                                        type="button"
                                        onClick={handleDownloadTicket}
                                        disabled={generatingPdf}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-carbon hover:bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm disabled:opacity-50"
                                    >
                                        {generatingPdf ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <FileText className="w-3.5 h-3.5" />
                                        )}
                                        Descargar Ticket (PDF)
                                    </button>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50/70 text-amber-700 border border-amber-200/70 rounded-xl text-[10px] font-bold uppercase tracking-wider">
                                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                                        Ticket disponible al confirmarse el pago
                                    </span>
                                )}

                                {officialInvoice?.url ? (
                                    <a
                                        href={officialInvoice.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                                    >
                                        <FileCheck2 className="w-3.5 h-3.5" />
                                        Descargar Factura Oficial (PDF)
                                    </a>
                                ) : invoiceRequest?.requested ? (
                                    <button
                                        type="button"
                                        onClick={openRequestInvoiceModal}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                        title="Ver o editar datos fiscales enviados"
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                                        Factura Solicitada ({invoiceRequest.vat_id})
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={openRequestInvoiceModal}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-100 text-brand-carbon border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        <Receipt className="w-3.5 h-3.5 text-primary" />
                                        Pedir Factura
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Seguimiento de envío si existe */}
                        {hasTracking && (
                            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-white text-indigo-600 flex items-center justify-center shadow-sm border border-indigo-100 shrink-0">
                                        <Truck className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-950">
                                            Seguimiento de Envío {tracking.carrier ? `· ${tracking.carrier}` : ''}
                                        </p>
                                        {tracking.number && (
                                            <p className="text-xs font-bold text-indigo-700 mt-0.5">
                                                Nº Seguimiento: <span className="font-mono font-black select-all">{tracking.number}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {tracking.url && (
                                    <a
                                        href={tracking.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm shrink-0"
                                    >
                                        Seguir Envío <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                )}
                            </div>
                        )}

                        {/* Líneas del pedido */}
                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                Artículos del Pedido ({order.order_items?.length || 0})
                            </p>
                            <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
                                {(order.order_items || []).map((item, idx) => (
                                    <div key={item.id || idx} className="p-4 flex items-center justify-between gap-4 bg-white">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 p-1.5 flex items-center justify-center shrink-0">
                                                {item.products?.image_url ? (
                                                    <img src={item.products.image_url} alt={item.product_name} className="max-h-full max-w-full object-contain" />
                                                ) : (
                                                    <Package className="w-5 h-5 text-gray-300" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-black text-brand-carbon uppercase truncate">
                                                    {item.product_name || 'Artículo Mil Luces'}
                                                </p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                    Cant: {item.quantity || 1} × {Number(item.price || 0).toFixed(2)} €
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-xs font-black text-brand-carbon shrink-0">
                                            {((Number(item.quantity) || 1) * (Number(item.price) || 0)).toFixed(2)} €
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Dirección */}
                        <div className="p-4 rounded-2xl bg-gray-50/60 border border-gray-100 flex items-start gap-3">
                            <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                            <div className="text-xs text-gray-600">
                                <span className="font-black text-brand-carbon uppercase text-[10px] tracking-widest block mb-0.5">
                                    {order.shipping_method === 'pickup' ? 'Recogida en Tienda' : 'Dirección de Entrega'}
                                </span>
                                {order.shipping_method === 'pickup'
                                    ? 'Mil Luces Iluminación · C/ Río Tormes, 5, Local 3, 28943 Fuenlabrada, Madrid'
                                    : [order.shipping_address, order.shipping_zip, order.shipping_city].filter(Boolean).join(', ')}
                            </div>
                        </div>
                    </div>
                )}

                {/* Banner para crear cuenta */}
                <div className="mt-8 p-6 rounded-2xl bg-brand-carbon text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-black uppercase italic tracking-wide">¿Compraste como invitado?</p>
                        <p className="text-[11px] text-gray-300 mt-0.5">
                            Si creas una cuenta con el mismo email de tu compra, todos tus pedidos y facturas se vincularán automáticamente a tu perfil.
                        </p>
                    </div>
                    <Link
                        to="/login"
                        className="px-5 py-2.5 bg-white text-brand-carbon rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-primary hover:text-white transition-all shrink-0"
                    >
                        Acceder / Registrarme
                    </Link>
                </div>
            </div>

            {/* Modal "Pedir Factura" */}
            {invoiceModalOpen && order && (
                <div className="fixed inset-0 bg-brand-carbon/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                    <Receipt className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-brand-carbon uppercase italic leading-none">
                                        Pedir Factura
                                    </h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                        Pedido #{order.id.slice(0, 8).toUpperCase()}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setInvoiceModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveInvoiceRequest} className="p-6 space-y-4">
                            <p className="text-xs text-gray-500 leading-relaxed">
                                Indica tus datos fiscales para que nuestro equipo emita la <strong>Factura Oficial</strong> desde nuestro sistema TPV y la adjunte a tu pedido.
                            </p>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                    Razón Social o Nombre Completo *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Instalaciones Eléctricas S.L."
                                    value={invoiceForm.company_name}
                                    onChange={e => setInvoiceForm({ ...invoiceForm, company_name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary text-sm font-bold text-brand-carbon"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                    NIF / CIF / DNI *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: B12345678"
                                    value={invoiceForm.vat_id}
                                    onChange={e => setInvoiceForm({ ...invoiceForm, vat_id: e.target.value.toUpperCase() })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary text-sm font-bold text-brand-carbon uppercase"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                    Dirección Fiscal Completa *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Calle, Número, CP, Ciudad, Provincia"
                                    value={invoiceForm.fiscal_address}
                                    onChange={e => setInvoiceForm({ ...invoiceForm, fiscal_address: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-primary text-sm font-medium text-brand-carbon"
                                />
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setInvoiceModalOpen(false)}
                                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingInvoiceReq}
                                    className="px-5 py-2.5 rounded-xl bg-brand-carbon text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {savingInvoiceReq ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                    Enviar Solicitud
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

