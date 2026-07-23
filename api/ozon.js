const API = 'https://api.ozonexpress.ma'

export default async function handler(req, res) {
  // CORS Headers for Vercel Serverless Function
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action, parcel, trackingNumber, customerId: bodyCustomerId, apiKey: bodyApiKey } = req.body || {}
  const customerId = bodyCustomerId || process.env.VITE_OZON_CUSTOMER_ID || process.env.OZON_CUSTOMER_ID || '89381'
  const apiKey = bodyApiKey || process.env.VITE_OZON_API_KEY || process.env.OZON_API_KEY || 'db4545-4ede23-78ef27-868f4a-fa5359'

  if (!customerId || !apiKey) {
    return res.status(400).json({ error: 'ID Client et clé API Ozon Express non configurés sur le serveur' })
  }

  const suffix = action === 'parcel-info' ? 'parcel-info' : 'add-parcel'
  const form = new FormData()

  if (action === 'parcel-info') {
    form.append('tracking-number', trackingNumber || '')
  } else {
    Object.entries(parcel || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        form.append(key, String(value))
      }
    })
  }

  try {
    const response = await fetch(`${API}/customers/${encodeURIComponent(customerId)}/${encodeURIComponent(apiKey)}/${suffix}`, {
      method: 'POST',
      body: form
    })
    const data = await response.json().catch(() => ({}))
    return res.status(response.status).json(data)
  } catch (error) {
    return res.status(502).json({ error: error.message || 'La requête vers Ozon Express a échoué' })
  }
}
