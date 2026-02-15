-- 1. Create the new junction table for multi-room products
CREATE TABLE IF NOT EXISTS public.product_rooms (
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, room_id)
);

-- 2. Enable Security (RLS)
ALTER TABLE public.product_rooms ENABLE ROW LEVEL SECURITY;

-- 3. Create policies so you can see and edit data
CREATE POLICY "Public read access" ON public.product_rooms
    FOR SELECT USING (true);

CREATE POLICY "Admin full access" ON public.product_rooms
    FOR ALL USING (
        auth.role() = 'authenticated'
    );

-- 4. Move your existing data to the new table automatically
INSERT INTO public.product_rooms (product_id, room_id)
SELECT id, room_id FROM public.products
WHERE room_id IS NOT NULL
ON CONFLICT DO NOTHING;
