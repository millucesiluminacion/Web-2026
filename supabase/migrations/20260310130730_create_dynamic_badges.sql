-- Create badges table for styles
create table if not exists public.badges (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  bg_color text default '#333333',
  text_color text default '#ffffff',
  icon_name text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create product_badges junction table
create table if not exists public.product_badges (
  product_id uuid references public.products(id) on delete cascade,
  badge_id uuid references public.badges(id) on delete cascade,
  primary key (product_id, badge_id)
);

-- Enable RLS
alter table public.badges enable row level security;
alter table public.product_badges enable row level security;

-- Policies for public reading
create policy "Badges are viewable by everyone" on public.badges
  for select using (true);

create policy "Product badges are viewable by everyone" on public.product_badges
  for select using (true);

-- Policies for admin management (requires service role or authenticated admin)
-- Note: Assuming standard authenticated user for now, or you can restrict to a specific role if identified.
create policy "Admins can manage badges" on public.badges
  using (auth.role() = 'authenticated');

create policy "Admins can manage product_badges" on public.product_badges
  using (auth.role() = 'authenticated');
