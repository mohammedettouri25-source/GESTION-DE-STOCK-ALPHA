const endpoint = (customerId, apiKey, suffix = 'add-parcel') =>
  `https://api.ozonexpress.ma/customers/${encodeURIComponent(customerId)}/${encodeURIComponent(apiKey)}/${suffix}`

async function serverRequest(payload) {
  const response = await fetch('/api/ozon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body.message || body.error || `Ozon Express API Error ${response.status}`)
  }
  return body
}

function processOzonResult(body, keyName = 'ADD-PARCEL') {
  const data = body?.[keyName] || body || {}
  
  if (data.RESULT === 'ERROR' || data.STATUS === 'ERROR' || data.error) {
    const msg = data.MESSAGE || data.error || data.message || 'Erreur Ozon Express'
    throw new Error(msg)
  }
  return data
}

export async function createOzonParcel({ customerId, apiKey, parcel }) {
  const cId = customerId || localStorage.getItem('ozon-customer-id') || import.meta.env.VITE_OZON_CUSTOMER_ID
  const key = apiKey || localStorage.getItem('ozon-api-key') || import.meta.env.VITE_OZON_API_KEY

  if (!cId || !key) {
    throw new Error('Renseignez votre ID Client et votre clé API Ozon Express')
  }

  let body
  try {
    body = await serverRequest({ action: 'add-parcel', customerId: cId, apiKey: key, parcel })
  } catch (error) {
    console.warn('Vercel API proxy route error, attempting direct client request:', error.message)
    const form = new FormData()
    Object.entries(parcel).forEach(([k, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        form.append(k, String(value))
      }
    })
    const response = await fetch(endpoint(cId, key, 'add-parcel'), { method: 'POST', body: form })
    body = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(body.message || body.error || `Ozon Express a retourné ${response.status}`)
    }
  }

  return processOzonResult(body, 'ADD-PARCEL')
}

export async function getOzonParcelInfo({ customerId, apiKey, trackingNumber }) {
  const cId = customerId || localStorage.getItem('ozon-customer-id') || import.meta.env.VITE_OZON_CUSTOMER_ID
  const key = apiKey || localStorage.getItem('ozon-api-key') || import.meta.env.VITE_OZON_API_KEY

  if (!cId || !key || !trackingNumber) {
    throw new Error('ID Client, clé API et numéro de suivi requis')
  }

  let body
  try {
    body = await serverRequest({ action: 'parcel-info', customerId: cId, apiKey: key, trackingNumber })
  } catch (error) {
    console.warn('Vercel API proxy route error, attempting direct client request:', error.message)
    const form = new FormData()
    form.append('tracking-number', trackingNumber)
    const response = await fetch(endpoint(cId, key, 'parcel-info'), { method: 'POST', body: form })
    body = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(body.message || body.error || `Ozon Express a retourné ${response.status}`)
    }
  }

  return processOzonResult(body, 'PARCEL-INFO')
}
