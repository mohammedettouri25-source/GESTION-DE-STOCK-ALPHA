-- Create WhatsApp AI Settings and Chat Log tables

CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number_id text DEFAULT '',
  whatsapp_token text DEFAULT '',
  verify_token text DEFAULT 'alphashop_whatsapp_verify_token_123',
  ai_provider text DEFAULT 'openai',
  ai_api_key text DEFAULT '',
  ai_model text DEFAULT 'gpt-4o-mini',
  system_prompt text DEFAULT 'أنت مساعد مبيعات احترافي لمتجرنا في المغرب. تجيب الزبائن بالدارجة المغربية أو الفرنسية أو العربية بأسلوب مؤدب وسريع. تساعدهم في معرفة تفاصيل المنتجات، الأسعار، والتوصيل، وتشجعهم على تقديم طلباتهم.',
  auto_reply_enabled boolean DEFAULT true,
  include_products_context boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_chats (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number text NOT NULL,
  customer_name text DEFAULT '',
  message_text text NOT NULL,
  direction text CHECK (direction IN ('inbound', 'outbound')) NOT NULL,
  is_ai boolean DEFAULT false,
  status text DEFAULT 'sent',
  raw_payload jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_chats ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated and public access
DROP POLICY IF EXISTS "public full access whatsapp_settings" ON public.whatsapp_settings;
CREATE POLICY "public full access whatsapp_settings" ON public.whatsapp_settings FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public full access whatsapp_chats" ON public.whatsapp_chats;
CREATE POLICY "public full access whatsapp_chats" ON public.whatsapp_chats FOR ALL TO public USING (true) WITH CHECK (true);
