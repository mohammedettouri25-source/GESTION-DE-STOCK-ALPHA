const API = 'https://api.ozonexpress.ma'
const customerId = '89381'
const apiKey = 'db4545-4ede23-78ef27-868f4a-fa5359'

async function testWithCityId2165() {
  const form = new FormData()
  form.append('parcel-receiver', 'Mohammed Alami')
  form.append('parcel-phone', '0612345678')
  form.append('parcel-city', '2165') // 2165 is ID for Casablanca – Sidi Maarouf
  form.append('parcel-address', '123 Boulevard Zerktouni, Maarif')
  form.append('parcel-price', '150')
  form.append('parcel-declared-value', '150')
  form.append('parcel-note', 'Test order')
  form.append('parcel-nature', 'Commande Vêtements')
  form.append('parcel-stock', '0')
  form.append('parcel-open', '1')
  form.append('parcel-fragile', '0')
  form.append('parcel-replace', '0')

  const url = `${API}/customers/${encodeURIComponent(customerId)}/${encodeURIComponent(apiKey)}/add-parcel`
  const res = await fetch(url, { method: 'POST', body: form })
  const json = await res.json()
  console.log('City ID 2165 result:', JSON.stringify(json, null, 2))
}

testWithCityId2165()
