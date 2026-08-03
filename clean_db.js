import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanAppSync() {
  console.log('Fetching products from app_sync...')
  const { data, error } = await supabase.from('app_sync').select('entity_id, payload').eq('entity_type', 'products')
  
  if (error) {
    console.error('Error fetching data:', error)
    return
  }
  
  console.log(`Found ${data.length} product rows. Cleaning...`)
  let cleanedCount = 0
  
  for (const row of data) {
    let payload = row.payload
    let changed = false
    
    if (payload && typeof payload === 'object') {
      if (payload.image && payload.image.startsWith('data:image')) {
        payload.image = ''
        changed = true
      }
      if (payload.images && Array.isArray(payload.images)) {
        const before = payload.images.length
        payload.images = payload.images.filter(img => !img.startsWith('data:image'))
        if (payload.images.length !== before) changed = true
      }
      if (payload.variants && Array.isArray(payload.variants)) {
        payload.variants.forEach(v => {
          if (v.image && v.image.startsWith('data:image')) {
            v.image = ''
            changed = true
          }
          if (v.images && Array.isArray(v.images)) {
            const before = v.images.length
            v.images = v.images.filter(img => !img.startsWith('data:image'))
            if (v.images.length !== before) changed = true
          }
        })
      }
    }
    
    if (changed) {
      console.log(`Cleaning payload for product: ${row.entity_id}`)
      const { error: updateError } = await supabase.from('app_sync')
        .update({ payload })
        .eq('entity_type', 'products')
        .eq('entity_id', row.entity_id)
        
      if (updateError) {
        console.error(`Failed to update ${row.entity_id}:`, updateError)
      } else {
        cleanedCount++
      }
    }
  }
  
  console.log(`Finished. Cleaned ${cleanedCount} rows.`)
}

cleanAppSync()
