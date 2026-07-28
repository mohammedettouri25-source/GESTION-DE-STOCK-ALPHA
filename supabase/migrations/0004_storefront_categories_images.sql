-- Migration 0004: Ensure category text column and images array column exist on products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image text;

-- Allow public read access to products & variants for storefront
CREATE POLICY "public_read_products_storefront" ON public.products FOR SELECT TO anon USING (true);
CREATE POLICY "public_read_variants_storefront" ON public.product_variants FOR SELECT TO anon USING (true);
