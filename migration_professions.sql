-- migration_professions.sql
-- Sectores Profesionales para el Mega-Menú y Landing Pro

CREATE TABLE IF NOT EXISTS professions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon_name TEXT DEFAULT 'Briefcase',
    image_url TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_professions (
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    profession_id UUID REFERENCES professions(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, profession_id)
);

-- Habilitar RLS
ALTER TABLE professions ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_professions ENABLE ROW LEVEL SECURITY;

-- Políticas públicas
CREATE POLICY "Professions are viewable by everyone" ON professions FOR SELECT USING (true);
CREATE POLICY "Product professions are viewable by everyone" ON product_professions FOR SELECT USING (true);

-- Políticas para admins
CREATE POLICY "Admins can manage professions" ON professions FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))
);

CREATE POLICY "Admins can manage product professions" ON product_professions FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager'))
);
