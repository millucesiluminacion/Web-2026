import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = {
    api: { bodyParser: true }
};

export default async function handler(req, res) {
    const allowedOrigin = process.env.VITE_APP_URL || 'https://milluces.vercel.app';
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
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
        const stripeOptions = {};
        if (stripeConfig.mode === 'connect' && stripeConfig.connectAccountId) {
            stripeOptions.stripeAccount = stripeConfig.connectAccountId;
        }

        const { orderId, metadata = {} } = req.body || {};

        if (!orderId) {
            return res.status(400).json({ error: 'Se requiere un ID de pedido válido.' });
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

        // Update order with payment intent ID for tracking
        await supabase
            .from('orders')
            .update({ payment_intent_id: paymentIntent.id })
            .eq('id', orderId);

        return res.status(200).json({
            clientSecret: paymentIntent.client_secret,
            id: paymentIntent.id,
            verifiedAmount
        });

    } catch (err) {
        console.error('[Stripe PaymentIntent Catch Error]:', err);
        return res.status(500).json({
            error: err.message || 'Error al procesar el pago en Stripe.',
            code: err.code || null,
            type: err.type || null
        });
    }
}
