import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
import { sendServerPurchaseEvent, sendServerRefundEvent } from './_lib/ga4-server.js';

export const config = {
    api: { bodyParser: true }
};

export default async function handler(req, res) {
    const allowedOrigins = [
        'https://www.millucesiluminacion.com',
        'https://millucesiluminacion.com',
        'https://milluces.vercel.app',
        'http://localhost:5173',
        'http://localhost:3000',
        process.env.VITE_APP_URL
    ].filter(Boolean);

    const reqOrigin = req.headers.origin;
    const corsOrigin = (reqOrigin && allowedOrigins.includes(reqOrigin))
        ? reqOrigin
        : 'https://www.millucesiluminacion.com';

    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('[Stripe Intent] Supabase credentials missing in env vars');
            return res.status(500).json({ error: 'Error de configuración del servidor (Supabase credentials missing).' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Obtener configuración de Stripe desde la base de datos
        const { data, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'payment_stripe')
            .maybeSingle();

        const stripeConfig = data?.value || {};
        const isSandbox = stripeConfig.sandbox || stripeConfig.mode === 'sandbox';

        let rawSecretKey = isSandbox
            ? (stripeConfig.testSecretKey || stripeConfig.secretKey || process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY || '')
            : (stripeConfig.liveSecretKey || stripeConfig.secretKey || process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY || '');

        let secretKey = (rawSecretKey || '').trim().replace(/^["']|["']$/g, '');

        // Auto-correct inverted keys
        if (secretKey.startsWith('pk_')) {
            const rawPubKey = isSandbox
                ? (stripeConfig.testPublicKey || stripeConfig.publicKey || '')
                : (stripeConfig.livePublicKey || stripeConfig.publicKey || '');
            const cleanPubKey = (rawPubKey || '').trim().replace(/^["']|["']$/g, '');
            if (cleanPubKey.startsWith('sk_') || cleanPubKey.startsWith('rk_')) {
                secretKey = cleanPubKey;
                console.log('[Stripe Intent API] Keys were inverted in DB settings; auto-corrected secretKey on backend.');
            }
        }

        if (!secretKey) {
            return res.status(400).json({ error: 'Stripe no está configurado en el panel de administración (falta la Secret Key).' });
        }

        if (!secretKey.startsWith('sk_') && !secretKey.startsWith('rk_')) {
            return res.status(400).json({ error: 'La Secret Key de Stripe configurada no es válida (debe empezar por sk_test_ o sk_live_).' });
        }

        const stripe = new Stripe(secretKey, { apiVersion: '2024-04-10' });

        // Determinar si usar cuenta conectada (Stripe Connect)
        let stripeOptions = undefined;
        if (stripeConfig.mode === 'connect' && stripeConfig.connectAccountId) {
            stripeOptions = { stripeAccount: stripeConfig.connectAccountId };
        }

        let body = req.body || {};
        if (typeof body === 'string') {
            try {
                body = JSON.parse(body);
            } catch (e) {
                console.error('[Stripe Intent] Could not parse string body:', e.message);
            }
        }
        const { orderId, sessionId, metadata = {} } = body;

        // CREAR SESIÓN DE CHECKOUT / ENLACE DE PAGO STRIPE (PARA PEDIDOS MANUALES O PENDIENTES)
        if (body.action === 'create-checkout-session') {
            if (!orderId) {
                return res.status(400).json({ error: 'Se requiere un ID de pedido válido.' });
            }

            const { data: order, error: orderErr } = await supabase
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .maybeSingle();

            if (orderErr || !order) {
                return res.status(404).json({ error: 'Pedido no encontrado en la base de datos.' });
            }

            const paidStatuses = ['PAID', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'];
            if (paidStatuses.includes(String(order.status || '').toUpperCase()) || String(order.payment_status || '').toUpperCase() === 'PAID') {
                return res.status(400).json({ error: 'Este pedido ya figura como pagado.', isPaid: true });
            }

            if (order.status === 'CANCELLED' || order.status === 'RETURNED') {
                return res.status(400).json({ error: 'Este pedido está cancelado y no admite pagos.' });
            }

            const totalAmount = Number(order.total);
            if (!totalAmount || totalAmount <= 0) {
                return res.status(400).json({ error: 'El importe total del pedido no es válido para cobrar.' });
            }

            const expectedCents = Math.round(totalAmount * 100);
            const shortRef = String(order.id || '').slice(0, 8).toUpperCase();

            // Si ya existe una sesión registrada en admin_notes, verificar si ya está pagada o sigue abierta con el mismo importe
            const existingMatch = String(order.admin_notes || '').match(/\[PAYMENT_LINK:([\s\S]*?)\]/);
            if (existingMatch && !body.forceNew) {
                try {
                    const parsedMeta = JSON.parse(existingMatch[1]);
                    if (parsedMeta?.session_id) {
                        const existingSession = await stripe.checkout.sessions.retrieve(parsedMeta.session_id, stripeOptions);
                        if (existingSession) {
                            if (existingSession.payment_status === 'paid') {
                                const paymentId = (typeof existingSession.payment_intent === 'string' ? existingSession.payment_intent : existingSession.payment_intent?.id) || existingSession.id;
                                await supabase
                                    .from('orders')
                                    .update({ status: 'PAID', payment_status: 'PAID', payment_id: paymentId })
                                    .eq('id', order.id);
                                try {
                                    await sendServerPurchaseEvent(supabase, order.id, { clientTracked: false });
                                } catch (e) {}
                                return res.status(400).json({ error: 'Este pedido ya ha sido abonado.', isPaid: true });
                            }
                            if (existingSession.status === 'open' && existingSession.amount_total === expectedCents && existingSession.url) {
                                return res.status(200).json({
                                    success: true,
                                    url: existingSession.url,
                                    sessionId: existingSession.id,
                                    shortRef,
                                    reused: true
                                });
                            }
                        }
                    }
                } catch (reuseErr) {
                    console.warn('[Stripe Checkout Session] Could not reuse existing session, creating a new one:', reuseErr.message);
                }
            }

            // Determinar URL del sitio validada contra lista blanca
            const rawOrigin = req.headers.origin || process.env.VITE_APP_URL || 'https://www.millucesiluminacion.com';
            let siteUrl = 'https://www.millucesiluminacion.com';
            try {
                const parsed = new URL(rawOrigin);
                const candidate = `${parsed.protocol}//${parsed.host}`;
                if (allowedOrigins.includes(candidate)) {
                    siteUrl = candidate;
                }
            } catch (e) {
                siteUrl = 'https://www.millucesiluminacion.com';
            }

            const cleanCustomerEmail = (order.customer_email || '').trim();

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                mode: 'payment',
                customer_email: cleanCustomerEmail || undefined,
                client_reference_id: order.id,
                metadata: {
                    orderId: order.id,
                    shortRef: shortRef,
                    customerName: order.customer_name || ''
                },
                line_items: [
                    {
                        price_data: {
                            currency: 'eur',
                            product_data: {
                                name: `Pedido #${shortRef} - Mil Luces Iluminación`,
                                description: `Abono del pedido #${shortRef} (${order.customer_name || 'Cliente'})`
                            },
                            unit_amount: expectedCents
                        },
                        quantity: 1
                    }
                ],
                success_url: `${siteUrl}/pedido-seguimiento?ref=${shortRef}&email=${encodeURIComponent(cleanCustomerEmail)}&session_id={CHECKOUT_SESSION_ID}&payment=success`,
                cancel_url: `${siteUrl}/mi-cuenta?payment=cancelled`
            }, stripeOptions);

            // Persistir enlace generado en admin_notes
            try {
                const existingAdminNotes = order.admin_notes || '';
                const paymentTag = `[PAYMENT_LINK:${JSON.stringify({ url: session.url, session_id: session.id, created_at: new Date().toISOString() })}]`;
                let updatedAdminNotes = existingAdminNotes;
                if (/\[PAYMENT_LINK:[\s\S]*?\]/.test(updatedAdminNotes)) {
                    updatedAdminNotes = updatedAdminNotes.replace(/\[PAYMENT_LINK:[\s\S]*?\]/, paymentTag);
                } else {
                    updatedAdminNotes = updatedAdminNotes ? `${paymentTag}\n${updatedAdminNotes}` : paymentTag;
                }
                await supabase.from('orders').update({ admin_notes: updatedAdminNotes }).eq('id', order.id);
            } catch (err) {
                console.warn('[Stripe Checkout Session] Could not update admin_notes:', err);
            }

            return res.status(200).json({
                success: true,
                url: session.url,
                sessionId: session.id,
                shortRef
            });
        }

        // CONFIRMAR PAGO DE SESIÓN STRIPE CHECKOUT (REDIRECCIÓN TRAS PAGO EXITOSO)
        if (body.action === 'confirm-checkout-session') {
            const currentSessionId = sessionId || body.sessionId;
            if (!currentSessionId) {
                return res.status(400).json({ error: 'Se requiere sessionId de Stripe.' });
            }

            const session = await stripe.checkout.sessions.retrieve(currentSessionId, stripeOptions);
            if (!session) {
                return res.status(404).json({ error: 'Sesión de Stripe no encontrada.' });
            }

            if (session.payment_status !== 'paid') {
                return res.status(400).json({ error: `El pago aún no está completado en Stripe. Estado actual: ${session.payment_status}` });
            }

            const sessionOrderId = session.client_reference_id || session.metadata?.orderId;
            if (orderId && sessionOrderId && orderId !== sessionOrderId) {
                return res.status(400).json({ error: 'La sesión de pago no corresponde al pedido indicado.' });
            }

            const targetOrderId = sessionOrderId || orderId;
            if (!targetOrderId) {
                return res.status(400).json({ error: 'No se pudo asociar la sesión a un pedido.' });
            }

            const { data: currentOrder } = await supabase
                .from('orders')
                .select('id, status, payment_status')
                .eq('id', targetOrderId)
                .maybeSingle();

            const paymentId = (typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id) || currentSessionId;
            const advancedStatuses = ['PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'];
            const nextStatus = (currentOrder && advancedStatuses.includes(String(currentOrder.status || '').toUpperCase()))
                ? currentOrder.status
                : 'PAID';

            const { data: updatedOrder, error: updateErr } = await supabase
                .from('orders')
                .update({
                    status: nextStatus,
                    payment_status: 'PAID',
                    payment_id: paymentId
                })
                .eq('id', targetOrderId)
                .select('id, status, payment_status, payment_id, total')
                .maybeSingle();

            if (updateErr) {
                console.error('[Stripe Session Confirm] DB error:', updateErr.message);
                return res.status(500).json({ error: updateErr.message });
            }

            console.log(`[Stripe Session Confirm] Order ${targetOrderId} marked as PAID via session ${currentSessionId}`);

            // GA4 server purchase event
            try {
                await sendServerPurchaseEvent(supabase, targetOrderId, {
                    clientTracked: Boolean(body.clientTracked),
                    gaClientId: body.gaClientId || null
                });
            } catch (err) {
                console.warn('[Stripe Session Confirm] GA4 error:', err);
            }

            return res.status(200).json({ success: true, order: updatedOrder });
        }

        // COMPROBAR ESTADO DE PAGO EN STRIPE
        if (body.action === 'check-payment-status') {
            if (!orderId) {
                return res.status(400).json({ error: 'Se requiere un ID de pedido válido.' });
            }

            const { data: order, error: orderErr } = await supabase
                .from('orders')
                .select('id, status, payment_status, payment_id, admin_notes')
                .eq('id', orderId)
                .maybeSingle();

            if (orderErr || !order) {
                return res.status(404).json({ error: 'Pedido no encontrado.' });
            }

            const paidStatuses = ['PAID', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'];
            if (paidStatuses.includes(String(order.status || '').toUpperCase()) || String(order.payment_status || '').toUpperCase() === 'PAID') {
                return res.status(200).json({
                    success: true,
                    isPaid: true,
                    status: order.status,
                    payment_status: order.payment_status,
                    payment_id: order.payment_id
                });
            }

            // Buscar si tiene session_id en admin_notes
            let recordedSessionId = null;
            const match = String(order.admin_notes || '').match(/\[PAYMENT_LINK:([\s\S]*?)\]/);
            if (match) {
                try {
                    const parsed = JSON.parse(match[1]);
                    recordedSessionId = parsed.session_id;
                } catch (e) {}
            }

            if (recordedSessionId) {
                try {
                    const session = await stripe.checkout.sessions.retrieve(recordedSessionId, stripeOptions);
                    if (session && session.payment_status === 'paid') {
                        const paymentId = (typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id) || recordedSessionId;
                        const { data: updatedOrder } = await supabase
                            .from('orders')
                            .update({
                                status: 'PAID',
                                payment_status: 'PAID',
                                payment_id: paymentId
                            })
                            .eq('id', order.id)
                            .select('id, status, payment_status, payment_id')
                            .maybeSingle();

                        try {
                            await sendServerPurchaseEvent(supabase, order.id, { clientTracked: false });
                        } catch (e) {}

                        return res.status(200).json({
                            success: true,
                            isPaid: true,
                            status: updatedOrder?.status || 'PAID',
                            payment_status: 'PAID',
                            payment_id: paymentId
                        });
                    }
                } catch (sessErr) {
                    console.warn('[check-payment-status] Session lookup error:', sessErr.message);
                }
            }

            return res.status(200).json({
                success: true,
                isPaid: false,
                status: order.status,
                payment_status: order.payment_status
            });
        }

        if (!orderId) {
            return res.status(400).json({ error: 'Se requiere un ID de pedido válido.' });
        }

        // CONFIRMAR PAGO EN SERVIDOR (service_role bypasses RLS)
        if (body.action === 'confirm') {
            const { paymentIntentId } = body;
            if (!paymentIntentId) {
                return res.status(400).json({ error: 'Se requiere paymentIntentId para confirmar el pago.' });
            }

            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, stripeOptions);

            if (paymentIntent.status !== 'succeeded') {
                return res.status(400).json({ error: `El pago no está completado en Stripe. Estado actual: ${paymentIntent.status}` });
            }

            const { data: updatedOrder, error: updateErr } = await supabase
                .from('orders')
                .update({
                    status: 'PAID',
                    payment_status: 'PAID',
                    payment_id: paymentIntentId
                })
                .eq('id', orderId)
                .select()
                .maybeSingle();

            if (updateErr) {
                console.error('[Stripe Confirm API] DB update error:', updateErr.message);
                return res.status(500).json({ error: updateErr.message || 'Error al actualizar el estado del pedido en la base de datos.' });
            }

            console.log(`[Stripe Confirm API] Order ${orderId} successfully marked as PAID.`);
            
            // Sincronización GA4 con await (imprescindible en Vercel Serverless para que no corte la ejecución)
            // Si clientTracked=true, solo marca [GA4_PURCHASE_SYNCED] evitando duplicados; si había AdBlock, envía por servidor.
            try {
                await sendServerPurchaseEvent(supabase, orderId, {
                    clientTracked: Boolean(body.clientTracked),
                    gaClientId: body.gaClientId || null
                });
            } catch (err) {
                console.warn('[Stripe Confirm API] Error triggering GA4 server purchase:', err);
            }

            return res.status(200).json({ success: true, order: updatedOrder });
        }

        // SINCRONIZAR COMPRA A GA4 (DESDE PANEL ADMIN O CONFIRMACIÓN)
        if (body.action === 'sync-ga4') {
            const result = await sendServerPurchaseEvent(supabase, orderId, {
                clientTracked: Boolean(body.clientTracked),
                gaClientId: body.gaClientId || null
            });
            return res.status(200).json({ success: true, result });
        }

        // ANULAR / REEMBOLSAR COMPRA EN GA4
        if (body.action === 'refund-ga4') {
            await sendServerRefundEvent(supabase, orderId);
            return res.status(200).json({ success: true, message: 'Refund sent to GA4' });
        }

        // SERVER-SIDE PRICE VERIFICATION
        // 1. Fetch order items from the database
        const { data: orderItems, error: itemsError } = await supabase
            .from('order_items')
            .select('product_id, quantity')
            .eq('order_id', orderId);

        if (itemsError || !orderItems?.length) {
            console.error('[Stripe Intent] Error querying order_items:', itemsError?.message);
            return res.status(400).json({ error: 'Pedido no encontrado o sin productos.' });
        }

        // 2. Fetch actual product prices from the database
        const productIds = orderItems.map(item => item.product_id);
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, price, discount_price')
            .in('id', productIds);

        if (productsError || !products?.length) {
            console.error('[Stripe Intent] Error querying products:', productsError?.message);
            return res.status(400).json({ error: 'Error al verificar los precios de los productos.' });
        }

        // 3. Recalculate subtotal
        const productMap = {};
        products.forEach(p => {
            productMap[p.id] = (p.discount_price && p.discount_price > 0 && p.discount_price < p.price)
                ? p.discount_price
                : p.price;
        });

        let verifiedSubtotal = 0;
        for (const item of orderItems) {
            const unitPrice = productMap[item.product_id];
            if (unitPrice === undefined) {
                return res.status(400).json({ error: `Producto ${item.product_id} no encontrado en el catálogo.` });
            }
            verifiedSubtotal += unitPrice * item.quantity;
        }

        // 4. Fetch actual order total
        const { data: orderData } = await supabase
            .from('orders')
            .select('total')
            .eq('id', orderId)
            .maybeSingle();

        const clientTotal = orderData?.total || verifiedSubtotal;
        const verifiedAmount = clientTotal > 0 ? clientTotal : verifiedSubtotal;

        if (!verifiedAmount || verifiedAmount <= 0) {
            return res.status(400).json({ error: 'El importe del pago no es válido.' });
        }

        // Crear el PaymentIntent with verified amount
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(verifiedAmount * 100), // Stripe usa céntimos
            currency: 'eur',
            metadata: { ...metadata, orderId },
            automatic_payment_methods: {
                enabled: true,
            },
        }, stripeOptions);

        return res.status(200).json({
            clientSecret: paymentIntent.client_secret,
            id: paymentIntent.id,
            verifiedAmount
        });

    } catch (err) {
        console.error('[Stripe PaymentIntent Catch Error]:', err);
        const isStripeErr = err.type && (err.type.startsWith('Stripe') || err.type.includes('Error'));
        const statusCode = err.statusCode || (isStripeErr ? 400 : 500);
        return res.status(statusCode).json({
            error: err.raw?.message || err.message || 'Error al procesar el pago en Stripe.',
            code: err.code || null,
            type: err.type || null
        });
    }
}
