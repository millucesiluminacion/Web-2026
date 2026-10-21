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
    'CANCELLED': { label: 'Cancelado', badgeClass: 'bg-rose-100 text-rose-800' },
    'RETURNED': { label: 'Devuelto / Abono', badgeClass: 'bg-gray-100 text-gray-800' }
};

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

    if (order.tracking_carrier || order.tracking_number || order.tracking_url) {
        return {
            carrier: order.tracking_carrier || '',
            number: order.tracking_number || '',
            url: order.tracking_url || '',
            cleanNotes: order.admin_notes || ''
        };
    }

    const notesStr = order.admin_notes || '';
    const match = notesStr.match(/\[TRACKING:([\s\S]*?)\]\n?/);
    if (match) {
        try {
            const parsed = JSON.parse(match[1]);
            const cleanNotes = notesStr.replace(match[0], '');
            return {
                carrier: parsed.carrier || '',
                number: parsed.number || '',
                url: parsed.url || '',
                cleanNotes: cleanNotes
            };
        } catch (e) {
            console.warn('[orderTrackingUtils] Error parsing tracking JSON from notes:', e);
        }
    }

    return {
        carrier: '',
        number: '',
        url: '',
        cleanNotes: notesStr
    };
}

/**
 * Serializa los datos de tracking en el texto de admin_notes
 */
export function serializeOrderTracking(tracking, existingNotes = '') {
    const cleanNotes = (existingNotes || '').replace(/\[TRACKING:[\s\S]*?\]\n?/, '').trim();
    const hasData = tracking && (tracking.carrier || tracking.number || tracking.url);
    if (!hasData) return cleanNotes;

    const header = '[TRACKING:' + JSON.stringify({
        carrier: tracking.carrier || '',
        number: tracking.number || '',
        url: tracking.url || ''
    }) + ']\n';

    return cleanNotes ? `${header}${cleanNotes}` : header;
}

/**
 * Guarda los datos de tracking en Supabase probando columnas nativas primero y fallback en admin_notes
 */
export async function saveOrderTracking(supabase, orderId, tracking, currentNotes = '', newStatus = null) {
    const updatePayload = {};
    if (newStatus) updatePayload.status = newStatus;

    // 1. Intentar actualizar columnas nativas
    try {
        const { error: nativeError } = await supabase
            .from('orders')
            .update({
                ...updatePayload,
                tracking_carrier: tracking.carrier || null,
                tracking_number: tracking.number || null,
                tracking_url: tracking.url || null
            })
            .eq('id', orderId);

        if (!nativeError) {
            return { success: true, mode: 'columns' };
        }
        console.warn('[saveOrderTracking] Native columns not present, using admin_notes fallback:', nativeError.message);
    } catch (e) {
        console.warn('[saveOrderTracking] Native update failed, falling back:', e.message);
    }

    // 2. Fallback: Serializar dentro de admin_notes
    const serializedNotes = serializeOrderTracking(tracking, currentNotes);
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
