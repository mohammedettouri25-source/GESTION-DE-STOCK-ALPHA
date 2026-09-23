import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || (typeof process !== 'undefined' && process.env?.SUPABASE_URL)
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY)

if (!url || !key) {
  console.warn('⚠️ Supabase config missing. URL:', url, 'KEY:', key ? '******' : 'undefined')
} else {
  console.log('✅ Supabase initialized with URL:', url)
}

export const supabase = url && key ? createClient(url, key) : null

export async function uploadProductImage(file) {
  if (!supabase || !file) return null
  try {
    const ext = file.name ? file.name.split('.').pop() : 'jpg'
    const fileName = `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`
    
    // Upload to Supabase Storage bucket 'products'
    const { data, error } = await supabase.storage
      .from('products')
      .upload(fileName, file, { cacheControl: '3600000', upsert: true })

    if (error) {
      console.warn('Supabase storage upload fallback to local base64:', error.message)
      return null
    }

    const { data: publicData } = supabase.storage.from('products').getPublicUrl(fileName)
    return publicData?.publicUrl || null
  } catch (err) {
    console.warn('uploadProductImage exception:', err.message)
    return null
  }
}
