const API = 'https://api.ozonexpress.ma'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { action, parcel, trackingNumber, customerId: bodyCustomerId, apiKey: bodyApiKey } = req.body || {}
  const customerId = bodyCustomerId || process.env.OZON_CUSTOMER_ID || process.env.VITE_OZON_CUSTOMER_ID
  const apiKey = bodyApiKey || process.env.OZON_API_KEY || process.env.VITE_OZON_API_KEY

  if (!customerId || !apiKey) {
    return res.status(400).json({ error: 'ID Client et clé API Ozon Express non configurés sur le serveur ou dans la requête' })
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
