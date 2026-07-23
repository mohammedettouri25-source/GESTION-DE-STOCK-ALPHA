import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || (typeof process !== 'undefined' && process.env?.SUPABASE_URL)
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY)

if (!url || !key) {
  console.warn('⚠️ Supabase config missing. URL:', url, 'KEY:', key ? '******' : 'undefined')
} else {
  console.log('✅ Supabase initialized with URL:', url)
}

export const supabase = url && key ? createClient(url, key) : null
