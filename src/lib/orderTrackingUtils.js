/**
 * Utilidades para Gestión de Empresas de Transporte y Seguimiento de Pedidos
 * Mil Luces Iluminación
 */

export const CARRIER_PRESETS = [
    { id: 'correos_express', name: 'Correos Express', urlTemplate: 'https://www.correosexpress.com/localizador-envios?envio={num}' },
    { id: 'gls', name: 'GLS Spain', urlTemplate: 'https://www.gls-spain.es/es/seguir-envio/?match={num}' },
    { id: 'seur', name: 'SEUR', urlTemplate: 'https://www.seur.com/seguimiento/?tracking-number={num}' },
    { id: 'mrw', name: 'MRW', urlTemplate: 'https://www.mrw.es/seguimiento_envios/mrw_seguimiento_envio.asp?envio={num}' },
    { id: 'dhl', name: 'DHL Express', urlTemplate: 'https://www.dhl.com/es-es/home/seguimiento.html?tracking-id={num}' },
    { id: 'correos', name: 'Correos (Paq)', urlTemplate: 'https://www.correos.es/es/es/herramientas/localizador/envios/detalle?tracking-code={num}' },
    { id: 'tipsa', name: 'Tipsa', urlTemplate: 'https://www.tip-sa.com/seguimiento-envios?guia={num}' },
    { id: 'nacex', name: 'Nacex', urlTemplate: 'https://www.nacex.com/seguimiento.do?albaran={num}' },
    { id: 'zeleris', name: 'Zeleris', urlTemplate: 'https://www.zeleris.com/seguimiento-de-envios?tracking={num}' },
    { id: 'pickup', name: 'Recogida en Tienda (Showroom)', urlTemplate: '' },
    { id: 'custom', name: 'Otra Agencia (Personalizada)', urlTemplate: '' }
];

export const STATUS_LABELS_ES = {
    'PENDING': { label: 'Pendiente de Pago', badgeClass: 'bg-amber-100 text-amber-800' },
    'AWAITING_PAYMENT': { label: 'Esperando Pago', badgeClass: 'bg-amber-100 text-amber-800' },
    'PAID': { label: 'Pago Confirmado', badgeClass: 'bg-emerald-100 text-emerald-800' },
    'PROCESSING': { label: 'En Preparación', badgeClass: 'bg-blue-100 text-blue-800' },
    'READY_TO_SHIP': { label: 'Listo para Envío', badgeClass: 'bg-indigo-100 text-indigo-800' },
    'SHIPPED': { label: 'Enviado', badgeClass: 'bg-primary/10 text-primary font-black' },
    'IN_TRANSIT': { label: 'En Tránsito', badgeClass: 'bg-sky-100 text-sky-800' },
    'DELIVERED': { label: 'Entregado', badgeClass: 'bg-green-100 text-green-800' },
    'COMPLETED': { label: 'Entregado', badgeClass: 'bg-emerald-100 text-emerald-800' },
    'CANCELLED': { label: 'Cancelado', badgeClass: 'bg-rose-100 text-rose-800' },
    'RETURNED': { label: 'Devuelto / Abono', badgeClass: 'bg-gray-100 text-gray-800' }
};

/**
 * Determina si un pedido está pagado o en un estado posterior (apto para descargar Ticket Simplificado)
 */
export function isOrderPaidOrBeyond(order) {
    if (!order) return false;
    const status = String(order.status || '').toUpperCase();
    if (status === 'CANCELLED' || status === 'RETURNED') return false;

    const paidStatuses = ['PAID', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'];
    if (paidStatuses.includes(status)) return true;

    const paymentStatus = String(order.payment_status || '').toUpperCase();
    return paymentStatus === 'PAID';
}

function stripMetadataTags(text = '') {
    return String(text || '')
        .replace(/\[TRACKING:[\s\S]*?\]\n?/g, '')
        .replace(/\[INVOICE_REQ:[\s\S]*?\]\n?/g, '')
        .replace(/\[OFFICIAL_INVOICE:[\s\S]*?\]\n?/g, '')
        .trim();
}

/**
 * Extrae metadatos de facturación del pedido:
 * - invoiceRequest: datos cuando el cliente marca "Pedir Factura" (Razón Social, NIF/CIF, Dirección Fiscal)
 * - officialInvoice: PDF de factura oficial subida desde el TPV por el administrador
 */
export function parseOrderInvoiceMeta(order) {
    if (!order) {
        return {
            invoiceRequest: null,
            officialInvoice: null,
            cleanCustomerNotes: '',
            cleanAdminNotes: ''
        };
    }

    const notesStr = String(order.notes || '');
    const adminNotesStr = String(order.admin_notes || '');
    const combined = `${notesStr}\n${adminNotesStr}`;

    let invoiceRequest = null;
    const reqMatch = combined.match(/\[INVOICE_REQ:([\s\S]*?)\]/);
    if (reqMatch) {
        try {
            const parsed = JSON.parse(reqMatch[1]);
            if (parsed && parsed.requested) {
                invoiceRequest = {
                    requested: true,
                    company_name: parsed.company_name || '',
                    vat_id: parsed.vat_id || '',
                    fiscal_address: parsed.fiscal_address || '',
                    requested_at: parsed.requested_at || null
                };
            }
        } catch (e) {
            console.warn('[orderTrackingUtils] Error parsing INVOICE_REQ JSON:', e);
        }
    }

    let officialInvoice = null;
    const offMatch = combined.match(/\[OFFICIAL_INVOICE:([\s\S]*?)\]/);
    if (offMatch) {
        try {
            const parsed = JSON.parse(offMatch[1]);
            if (parsed && parsed.url) {
                officialInvoice = {
                    url: parsed.url,
                    filename: parsed.filename || 'Factura.pdf',
                    uploaded_at: parsed.uploaded_at || null
                };
            }
        } catch (e) {
            console.warn('[orderTrackingUtils] Error parsing OFFICIAL_INVOICE JSON:', e);
        }
    }

    return {
        invoiceRequest,
        officialInvoice,
        cleanCustomerNotes: stripMetadataTags(notesStr),
        cleanAdminNotes: stripMetadataTags(adminNotesStr)
    };
}

/**
 * Serializa la solicitud "Pedir Factura" dentro de las notas del pedido
 */
export function serializeInvoiceRequestInNotes(invoiceReq, existingNotes = '') {
    const cleanNotes = stripMetadataTags(existingNotes);
    if (!invoiceReq || !invoiceReq.requested) return cleanNotes;

    const header = '[INVOICE_REQ:' + JSON.stringify({
        requested: true,
        company_name: (invoiceReq.company_name || '').trim(),
        vat_id: (invoiceReq.vat_id || '').trim().toUpperCase(),
        fiscal_address: (invoiceReq.fiscal_address || '').trim(),
        requested_at: invoiceReq.requested_at || new Date().toISOString()
    }) + ']';

    return cleanNotes ? `${header}\n${cleanNotes}` : header;
}

/**
 * Guarda la solicitud "Pedir Factura" de un cliente o invitado en un pedido existente
 */
export async function saveOrderInvoiceRequest(supabase, order, invoiceReqData) {
    const nextNotes = serializeInvoiceRequestInNotes(
        { ...invoiceReqData, requested: true },
        order?.notes || ''
    );

    const { error } = await supabase
        .from('orders')
        .update({ notes: nextNotes })
        .eq('id', order.id);

    if (error) throw error;
    return { updatedNotes: nextNotes };
}

/**
 * Guarda o elimina el enlace al PDF de la Factura Oficial (TPV) en admin_notes preservando el resto de metadatos
 */
export async function saveOfficialInvoiceMeta(supabase, order, officialInvoiceData, customHumanAdminNotes = null) {
    const rawAdminNotes = String(order?.admin_notes || '');
    const trackingMatch = rawAdminNotes.match(/\[TRACKING:[\s\S]*?\]/);
    const cleanHumanNotes = customHumanAdminNotes !== null
        ? stripMetadataTags(customHumanAdminNotes)
        : stripMetadataTags(rawAdminNotes);

    const parts = [];
    if (trackingMatch) parts.push(trackingMatch[0]);
    if (officialInvoiceData && officialInvoiceData.url) {
        parts.push('[OFFICIAL_INVOICE:' + JSON.stringify({
            url: officialInvoiceData.url,
            filename: officialInvoiceData.filename || 'Factura-Oficial.pdf',
            uploaded_at: officialInvoiceData.uploaded_at || new Date().toISOString()
        }) + ']');
    }
    if (cleanHumanNotes) parts.push(cleanHumanNotes);

    const serializedAdminNotes = parts.join('\n');

    const { error } = await supabase
        .from('orders')
        .update({ admin_notes: serializedAdminNotes })
        .eq('id', order.id);

    if (error) throw error;
    return { updatedAdminNotes: serializedAdminNotes };
}

/**
 * Genera la URL de seguimiento a partir del nombre de la agencia y el código
 */
export function buildTrackingUrl(carrierName, trackingNumber) {
    if (!trackingNumber) return '';
    const cleanNum = String(trackingNumber).trim();
    if (!cleanNum) return '';

    const preset = CARRIER_PRESETS.find(c => 
        carrierName && c.name.toLowerCase().includes(carrierName.toLowerCase().split(' ')[0])
    );

    if (preset && preset.urlTemplate) {
        return preset.urlTemplate.replace('{num}', encodeURIComponent(cleanNum));
    }
    return '';
}

/**
 * Extrae datos de tracking de un pedido (probando columnas nativas o fallback en admin_notes)
 */
export function parseOrderTracking(order) {
    if (!order) return { carrier: '', number: '', url: '', cleanNotes: '' };

    const notesStr = order.admin_notes || '';

    if (order.tracking_carrier || order.tracking_number || order.tracking_url) {
        return {
            carrier: order.tracking_carrier || '',
            number: order.tracking_number || '',
            url: order.tracking_url || '',
            cleanNotes: stripMetadataTags(notesStr)
        };
    }

    const match = notesStr.match(/\[TRACKING:([\s\S]*?)\]\n?/);
    if (match) {
        try {
            const parsed = JSON.parse(match[1]);
            return {
                carrier: parsed.carrier || '',
                number: parsed.number || '',
                url: parsed.url || '',
                cleanNotes: stripMetadataTags(notesStr)
            };
        } catch (e) {
            console.warn('[orderTrackingUtils] Error parsing tracking JSON from notes:', e);
        }
    }

    return {
        carrier: '',
        number: '',
        url: '',
        cleanNotes: stripMetadataTags(notesStr)
    };
}

/**
 * Serializa los datos de tracking en el texto de admin_notes preservando [OFFICIAL_INVOICE:...]
 */
export function serializeOrderTracking(tracking, existingNotes = '', rawExistingAdminNotes = '') {
    const sourceForTags = rawExistingAdminNotes || existingNotes || '';
    const officialMatch = String(sourceForTags).match(/\[OFFICIAL_INVOICE:[\s\S]*?\]/);
    const cleanNotes = stripMetadataTags(existingNotes);
    const hasData = tracking && (tracking.carrier || tracking.number || tracking.url);

    const parts = [];
    if (hasData) {
        parts.push('[TRACKING:' + JSON.stringify({
            carrier: tracking.carrier || '',
            number: tracking.number || '',
            url: tracking.url || ''
        }) + ']');
    }
    if (officialMatch) {
        parts.push(officialMatch[0]);
    }
    if (cleanNotes) {
        parts.push(cleanNotes);
    }

    return parts.join('\n');
}

/**
 * Guarda los datos de tracking en Supabase probando columnas nativas primero y fallback en admin_notes
 */
export async function saveOrderTracking(supabase, orderId, tracking, currentNotes = '', newStatus = null, rawExistingAdminNotes = '') {
    const updatePayload = {};
    if (newStatus) updatePayload.status = newStatus;

    const sourceForTags = rawExistingAdminNotes || currentNotes || '';
    const officialMatch = String(sourceForTags).match(/\[OFFICIAL_INVOICE:[\s\S]*?\]/);
    const cleanHumanNotes = stripMetadataTags(currentNotes);
    const adminNotesWithoutTracking = [officialMatch ? officialMatch[0] : '', cleanHumanNotes].filter(Boolean).join('\n');

    // 1. Intentar actualizar columnas nativas
    try {
        const { error: nativeError } = await supabase
            .from('orders')
            .update({
                ...updatePayload,
                tracking_carrier: tracking.carrier || null,
                tracking_number: tracking.number || null,
                tracking_url: tracking.url || null,
                admin_notes: adminNotesWithoutTracking
            })
            .eq('id', orderId);

        if (!nativeError) {
            return { success: true, mode: 'columns', serializedNotes: adminNotesWithoutTracking };
        }
        console.warn('[saveOrderTracking] Native columns not present, using admin_notes fallback:', nativeError.message);
    } catch (e) {
        console.warn('[saveOrderTracking] Native update failed, falling back:', e.message);
    }

    // 2. Fallback: Serializar dentro de admin_notes
    const serializedNotes = serializeOrderTracking(tracking, currentNotes, rawExistingAdminNotes);
    const { error: fallbackError } = await supabase
        .from('orders')
        .update({
            ...updatePayload,
            admin_notes: serializedNotes
        })
        .eq('id', orderId);

    if (fallbackError) {
        throw fallbackError;
    }

    return { success: true, mode: 'notes', serializedNotes };
}
