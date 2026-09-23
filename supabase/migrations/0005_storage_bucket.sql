-- Create public 'products' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Grant public read and insert access to products bucket
CREATE POLICY "Public Access Products Bucket" ON storage.objects
FOR ALL TO public
USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');
