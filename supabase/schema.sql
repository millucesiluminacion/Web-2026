-- Tablas para la tienda Mil Luces

-- 1. Categorías
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar columna order_index
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='categories' AND COLUMN_NAME='order_index') THEN
        ALTER TABLE public.categories ADD COLUMN order_index INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. Marcas
CREATE TABLE IF NOT EXISTS public.brands (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    image_url TEXT,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar columna order_index
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='brands' AND COLUMN_NAME='order_index') THEN
        ALTER TABLE public.brands ADD COLUMN order_index INTEGER DEFAULT 0;
    END IF;
END $$;

-- 3. Por qué elegirnos (Beneficios)
CREATE TABLE IF NOT EXISTS public.why_choose_us (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar columna order_index
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='why_choose_us' AND COLUMN_NAME='order_index') THEN
        ALTER TABLE public.why_choose_us ADD COLUMN order_index INTEGER DEFAULT 0;
    END IF;
END $$;

-- 4. Productos
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    stock INTEGER DEFAULT 0,
    image_url TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar columnas faltantes en products
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='products' AND COLUMN_NAME='reference') THEN
        ALTER TABLE public.products ADD COLUMN reference TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='products' AND COLUMN_NAME='discount_price') THEN
        ALTER TABLE public.products ADD COLUMN discount_price DECIMAL(10,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='products' AND COLUMN_NAME='brand_id') THEN
        ALTER TABLE public.products ADD COLUMN brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='products' AND COLUMN_NAME='room_id') THEN
        ALTER TABLE public.products ADD COLUMN room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 5. Clientes
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Pedidos (Mejorado para Checkout Real)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id),
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    shipping_address TEXT,
    shipping_city TEXT,
    shipping_zip TEXT,
    total DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
    payment_method TEXT, -- 'stripe', 'paypal', 'transfer'
    payment_status TEXT DEFAULT 'PENDING',
    payment_id TEXT, -- ID de transacción de Stripe/PayPal
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar columnas nuevas en orders si ya existe
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='orders' AND COLUMN_NAME='customer_name') THEN
        ALTER TABLE public.orders ADD COLUMN customer_name TEXT;
        ALTER TABLE public.orders ADD COLUMN customer_email TEXT;
        ALTER TABLE public.orders ADD COLUMN customer_phone TEXT;
        ALTER TABLE public.orders ADD COLUMN shipping_address TEXT;
        ALTER TABLE public.orders ADD COLUMN shipping_city TEXT;
        ALTER TABLE public.orders ADD COLUMN shipping_zip TEXT;
        ALTER TABLE public.orders ADD COLUMN payment_method TEXT;
        ALTER TABLE public.orders ADD COLUMN payment_status TEXT DEFAULT 'PENDING';
        ALTER TABLE public.orders ADD COLUMN payment_id TEXT;
        -- Actualizar check constraint para incluir 'PAID'
        ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
        ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status IN ('PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'));
    END IF;
END $$;

-- 6.1 Detalle de Pedidos (Artículos comprados)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    product_name TEXT, -- Backup del nombre en caso de que el producto se borre
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Estancias (Iluminación por estancias)
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    image_url TEXT,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar columna order_index
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='rooms' AND COLUMN_NAME='order_index') THEN
        ALTER TABLE public.rooms ADD COLUMN order_index INTEGER DEFAULT 0;
    END IF;
END $$;

-- 8. Ofertas y Cupones
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discount_percentage DECIMAL(5,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    expiry_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Sliders y Banners de la Home
CREATE TABLE IF NOT EXISTS public.sliders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    image_url TEXT NOT NULL UNIQUE,
    link_url TEXT,
    title TEXT,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    type TEXT DEFAULT 'main_slider', -- 'main_slider' o 'side_banner'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Configuración de la Aplicación (Pagos, SEO, etc.)
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Blog Posts
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT,
    content TEXT,
    image_url TEXT,
    author TEXT,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Proyectos (Portfolio)
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    category TEXT,
    image_url TEXT,
    year TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. Perfiles de Usuario (Cuentas Administrativas)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'manager', 'editor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger para crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email, 'admin');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger si existe para evitar duplicados
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insertar configuración por defecto para pagos
INSERT INTO public.app_settings (key, value, description)
VALUES 
('payment_stripe', '{"enabled": false, "publicKey": "", "secretKey": ""}', 'Configuración de pasarela Stripe'),
('payment_paypal', '{"enabled": false, "clientId": "", "secretKey": ""}', 'Configuración de pasarela PayPal')
ON CONFLICT (key) DO NOTHING;

-- Asegurar UNIQUE en image_url para sliders
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'sliders_image_url_key' 
        AND conrelid = 'public.sliders'::regclass
    ) THEN
        ALTER TABLE public.sliders ADD CONSTRAINT sliders_image_url_key UNIQUE (image_url);
    END IF;
END $$;

-- Seguridad: Habilitar RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.why_choose_us ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sliders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso público temporal (Solo para desarrollo)
DO $$ 
BEGIN
    -- Limpieza de políticas antiguas
    DROP POLICY IF EXISTS "Public Read Access" ON public.categories;
    DROP POLICY IF EXISTS "Public Read Access" ON public.brands;
    DROP POLICY IF EXISTS "Public Read Access" ON public.why_choose_us;
    DROP POLICY IF EXISTS "Public Read Access" ON public.products;
    DROP POLICY IF EXISTS "Public Read Access" ON public.rooms;
    DROP POLICY IF EXISTS "Public Read Access" ON public.offers;
    DROP POLICY IF EXISTS "Public Read Access" ON public.sliders;
    DROP POLICY IF EXISTS "Public Read Access" ON public.blog_posts;
    DROP POLICY IF EXISTS "Public Read Access" ON public.projects;
    
    DROP POLICY IF EXISTS "Anon Full Access" ON public.categories;
    DROP POLICY IF EXISTS "Anon Full Access" ON public.brands;
    DROP POLICY IF EXISTS "Anon Full Access" ON public.why_choose_us;
    DROP POLICY IF EXISTS "Anon Full Access" ON public.products;
    DROP POLICY IF EXISTS "Anon Full Access" ON public.rooms;
    DROP POLICY IF EXISTS "Anon Full Access" ON public.offers;
    DROP POLICY IF EXISTS "Anon Full Access" ON public.sliders;
    DROP POLICY IF EXISTS "Anon Full Access" ON public.blog_posts;
    DROP POLICY IF EXISTS "Anon Full Access" ON public.projects;
    DROP POLICY IF EXISTS "Anon Full Access" ON public.profiles;

    DROP POLICY IF EXISTS "Public Access" ON storage.objects;
    DROP POLICY IF EXISTS "Anon Upload" ON storage.objects;
    DROP POLICY IF EXISTS "Anon Delete" ON storage.objects;
END $$;

-- Políticas de acceso total para desarrollo (Anon y Authenticated)
DO $$ 
BEGIN
    -- Lista de tablas a las que queremos dar acceso total
    PERFORM set_config('my.tables', 'categories,brands,why_choose_us,products,rooms,offers,sliders,blog_posts,projects,orders,order_items,app_settings,profiles', true);
END $$;

DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(string_to_array(current_setting('my.tables'), ',')) LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Anon Full Access" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Anon Full Access" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
        -- Asegurar que el rol anon tiene permisos de uso en el esquema y tablas
        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated', t);
    END LOOP;
END $$;

-- 7. Configuración de Almacenamiento (Storage)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Anon Upload" ON storage.objects;
DROP POLICY IF EXISTS "Anon Delete" ON storage.objects;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'images');
CREATE POLICY "Anon Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'images');
CREATE POLICY "Anon Delete" ON storage.objects FOR DELETE USING (bucket_id = 'images');

-- Permisos adicionales para secuencias (necesario para IDs o seriales si existieran)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
