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
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Obtener configuración de Stripe desde la base de datos
        const { data, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'payment_stripe')
            .single();

        const stripeConfig = data?.value || {};
        const isSandbox = stripeConfig.sandbox || stripeConfig.mode === 'sandbox';

        let rawSecretKey = isSandbox
            ? (stripeConfig.testSecretKey || stripeConfig.secretKey || process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY || '')
            : (stripeConfig.liveSecretKey || stripeConfig.secretKey || process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY || '');

        let secretKey = rawSecretKey.trim().replace(/^["']|["']$/g, '');

        if (secretKey.startsWith('pk_')) {
            const rawPubKey = isSandbox
                ? (stripeConfig.testPublicKey || stripeConfig.publicKey || '')
                : (stripeConfig.livePublicKey || stripeConfig.publicKey || '');
            const cleanPubKey = rawPubKey.trim().replace(/^["']|["']$/g, '');
            if (cleanPubKey.startsWith('sk_') || cleanPubKey.startsWith('rk_')) {
                secretKey = cleanPubKey;
                console.log('[Stripe Intent API] Keys were inverted in DB settings; auto-corrected secretKey on backend.');
            }
        }

        if (!secretKey) {
            return res.status(400).json({ error: 'Stripe no está configurado en el panel de administración.' });
        }

        const stripe = new Stripe(secretKey, { apiVersion: '2024-04-10' });

        // Determinar si usar cuenta conectada (Stripe Connect)
        const stripeOptions = {};
        if (stripeConfig.mode === 'connect' && stripeConfig.connectAccountId) {
            stripeOptions.stripeAccount = stripeConfig.connectAccountId;
        }

        const { orderId, metadata = {} } = req.body;

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
            return res.status(400).json({ error: 'Pedido no encontrado o sin productos.' });
        }

        // 2. Fetch actual product prices from the database
        const productIds = orderItems.map(item => item.product_id);
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, price, discount_price')
            .in('id', productIds);

        if (productsError || !products?.length) {
            return res.status(400).json({ error: 'Error al verificar los precios de los productos.' });
        }

        // 3. Recalculate the total from actual DB prices
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

        // 4. Fetch shipping config to add shipping cost
        const { data: orderData } = await supabase
            .from('orders')
            .select('total')
            .eq('id', orderId)
            .single();

        // Use the verified subtotal. For now, we trust the order total for shipping
        // since shipping is calculated server-side in the config.
        // But we verify it's within a reasonable margin (±5€ for shipping)
        const clientTotal = orderData?.total || 0;
        const maxAllowedDifference = 30; // Allow up to 30€ difference for shipping + pro discounts

        if (Math.abs(clientTotal - verifiedSubtotal) > maxAllowedDifference) {
            console.error(`[Stripe] Price mismatch! Client: ${clientTotal}, Server: ${verifiedSubtotal}`);
            return res.status(400).json({ error: 'Error de verificación de precio. Los precios han cambiado.' });
        }

        // Use the order total (which includes shipping) but only if it passed verification
        const verifiedAmount = clientTotal;

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
        console.error('[Stripe PaymentIntent Error]:', err.message);
        return res.status(500).json({ error: 'Error al procesar el pago. Inténtelo de nuevo.' });
    }
}
