<script setup>
import { computed, onMounted, ref } from 'vue'
import { useShop } from './stores/shop'
import { LayoutDashboard, Package, ShoppingCart, Truck, Users, Factory, WalletCards, BarChart3, Settings, Search, Plus, Minus, X, ChevronRight, Wifi, WifiOff, Bell, Menu, MoreHorizontal, ArrowUpRight, AlertTriangle, Trash2, Printer, FileText, Bot, Sparkles, Lock, LogOut, KeyRound, Eye, EyeOff, MessageCircle, Send } from 'lucide-vue-next'
import { createOzonParcel, getOzonParcelInfo } from './services/ozon'
import { OZON_CITIES } from './services/ozonCities'

const citySearchOpen = ref(false)

const popularCities = [
  { id: 2165, name: 'Casablanca' },
  { id: 2282, name: 'Rabat' },
  { id: 199, name: 'Marrakech' },
  { id: 127, name: 'Fes' },
  { id: 37, name: 'Agadir' },
  { id: 2368, name: 'Tanger' },
  { id: 2140, name: 'Meknes' },
  { id: 2216, name: 'Oujda' },
  { id: 2320, name: 'Safi' },
  { id: 109, name: 'El Jadida' }
]

const citySuggestions = computed(() => {
  const query = (order.value?.customer?.city || '').trim().toLowerCase()
  if (!query) return popularCities
  return OZON_CITIES.filter(c =>
    c.name.toLowerCase().includes(query) ||
    (c.ref && c.ref.toLowerCase().includes(query))
  ).slice(0, 10)
})

function selectCity(city) {
  order.value.customer.city = city.name
  order.value.customer.cityId = city.id
  citySearchOpen.value = false
}

function onCityInput() {
  citySearchOpen.value = true
  const query = (order.value.customer.city || '').trim().toLowerCase()
  if (!query) {
    order.value.customer.cityId = ''
    return
  }
  const match = OZON_CITIES.find(c => c.name.toLowerCase() === query)
  if (match) {
    order.value.customer.cityId = match.id
  }
}

const shop = useShop()
const mobile = ref(false)
const mobileCartSheet = ref(false)
const productModal = ref(false)
const variantModal = ref(null)
const payment = ref('Espèces')
const checkoutModal = ref(false)
const submitting = ref(false)
const invoiceModal = ref(false)
const activeInvoice = ref(null)
const editSaleModal = ref(null)
const deleteSaleModal = ref(null)

function openEditSale(sale) {
  editSaleModal.value = JSON.parse(JSON.stringify(sale))
}

async function saveEditSale() {
  if (!editSaleModal.value) return
  await shop.updateSale(editSaleModal.value)
  editSaleModal.value = null
}

function confirmDeleteSale(sale) {
  deleteSaleModal.value = sale
}

async function executeDeleteSale(restoreStock) {
  if (!deleteSaleModal.value) return
  await shop.removeSale(deleteSaleModal.value.id, restoreStock)
  deleteSaleModal.value = null
}
const aiModal = ref(false)
const aiPrompt = ref('')
const aiAnalyzing = ref(false)

const authenticated = ref(localStorage.getItem('alpha-auth') === 'true')
const loginPassword = ref('')
const loginError = ref('')
const showPass = ref(false)
const masterPin = ref(localStorage.getItem('alpha-pin') || 'ALPHASHOP2026@@')

function handleLogin() {
  if (loginPassword.value.trim() === masterPin.value) {
    authenticated.value = true
    localStorage.setItem('alpha-auth', 'true')
    loginError.value = ''
    loginPassword.value = ''
    shop.notify('Connexion réussie ! Bienvenue sur Alpha Shop07')
  } else {
    loginError.value = 'Code PIN / Mot de passe incorrect !'
  }
}

function handleLogout() {
  authenticated.value = false
  localStorage.removeItem('alpha-auth')
  shop.notify('Déconnexion réussie')
}

function showInvoice(sale) {
  activeInvoice.value = sale
  invoiceModal.value = true
}

function triggerPrint() {
  window.print()
}

function formatWhatsAppPhone(phone) {
  if (!phone) return ''
  let cleaned = String(phone).replace(/\D/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = '212' + cleaned.slice(1)
  } else if (!cleaned.startsWith('212')) {
    cleaned = '212' + cleaned
  }
  return cleaned
}

function downloadInvoicePdf(sale) {
  if (!sale) return
  const win = window.open('', '_blank')
  if (!win) return shop.notify('Autorisez les fenêtres surgissantes pour l\'impression')

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Facture_${sale.number}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 28px; color: #111; max-width: 680px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 20px; }
        .logo { font-size: 24px; font-weight: 900; letter-spacing: -1px; }
        .logo span { background: #111; color: #fff; padding: 2px 8px; border-radius: 4px; margin-right: 6px; }
        .info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; background: #f9f9f8; padding: 14px; border-radius: 8px; border: 1px solid #eee; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
        th { background: #111; color: #fff; padding: 10px; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #eee; }
        .totals { width: 260px; margin-left: auto; margin-bottom: 24px; font-size: 13px; }
        .totals-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #ddd; }
        .grand { font-size: 16px; font-weight: 800; border-top: 2px solid #111; border-bottom: none; padding-top: 10px; margin-top: 4px; }
        .footer { text-align: center; font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 16px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo"><span>A</span> ALPHA SHOP<sup>07</sup></div>
          <p style="margin:4px 0 0; font-size:12px; color:#555;">Gestion de Stock & Point de Vente</p>
        </div>
        <div style="text-align:right;">
          <h2 style="margin:0; font-size:18px;">FACTURE DE VENTE</h2>
          <b>N° ${sale.number}</b><br/>
          <small>Date: ${new Date(sale.createdAt).toLocaleString('fr-MA')}</small>
        </div>
      </div>
      <div class="info">
        <div>
          <h4 style="margin:0 0 6px; font-size:11px; text-transform:uppercase; color:#666;">Émetteur</h4>
          <b>${settings.value.business || 'Alpha Shop07'}</b>
        </div>
        <div>
          <h4 style="margin:0 0 6px; font-size:11px; text-transform:uppercase; color:#666;">Client & Destination</h4>
          <b>${sale.customer?.name || 'Vente Comptoir'}</b><br/>
          ${sale.customer?.phone ? 'Tél: ' + sale.customer.phone + '<br/>' : ''}
          ${sale.customer?.city ? 'Ville: ' + sale.customer.city + '<br/>' : ''}
          ${sale.customer?.address ? 'Adresse: ' + sale.customer.address + '<br/>' : ''}
          ${sale.shipment?.tracking ? '<b style="color:#2563eb;">Suivi Ozon: ' + sale.shipment.tracking + '</b>' : ''}
        </div>
      </div>
      <table>
        <thead>
          <tr><th>Article</th><th style="text-align:center;">Qté</th><th style="text-align:right;">Prix Unitaire</th><th style="text-align:right;">Total</th></tr>
        </thead>
        <tbody>
          ${(sale.items || []).map(i => `
            <tr>
              <td><b>${i.name}</b> ${i.variant ? '(' + i.variant + ')' : ''}</td>
              <td style="text-align:center;">${i.quantity}</td>
              <td style="text-align:right;">${money(i.price)}</td>
              <td style="text-align:right;"><b>${money(i.price * i.quantity)}</b></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="totals">
        <div class="totals-row"><span>Sous-total:</span><b>${money(sale.subtotal || sale.total)}</b></div>
        ${sale.discount ? `<div class="totals-row"><span>Réduction:</span><b style="color:#dc2626;">-${money(sale.discount)}</b></div>` : ''}
        ${sale.shipping ? `<div class="totals-row"><span>Livraison:</span><b>+${money(sale.shipping)}</b></div>` : ''}
        <div class="totals-row grand"><span>TOTAL NET (MAD):</span><span>${money(sale.total)}</span></div>
      </div>
      <div class="footer">
        <p style="margin:0 0 4px; font-weight:bold;">Merci pour votre confiance !</p>
        <p style="margin:0; font-size:11px;">Alpha Shop07 — Document officiel généré automatiquement</p>
      </div>
    </body>
    </html>
  `
  win.document.open()
  win.document.write(htmlContent)
  win.document.close()
  setTimeout(() => win.print(), 250)
}

function sendWhatsAppOrderMessage(sale) {
  const c = sale?.customer || {}
  const phone = formatWhatsAppPhone(c.phone)
  if (!phone) return shop.notify('Numéro de téléphone client non spécifié')

  const total = money(sale.total)
  const trackingText = sale.shipment?.tracking ? `\n📦 *N° Suivi Ozon Express :* ${sale.shipment.tracking}` : ''
  const itemsText = (sale.items || []).map(i => `- ${i.name} (x${i.quantity})`).join('\n')

  const message = `Bonjour ${c.name || 'Cher client'},\n\nVoici le document de votre facture officielle *${sale.number}* chez *${settings.value.business || 'Alpha Shop07'}* :\n\n📋 *Articles :*\n${itemsText}\n\n💰 *Total Net :* ${total}${trackingText}\n\nMerci pour votre confiance ! 🙏`

  const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`
  window.open(url, '_blank')
}

function sendWhatsAppCustomerMessage(customer) {
  const phone = formatWhatsAppPhone(customer?.phone)
  if (!phone) return shop.notify('Numéro de téléphone non valide')

  const message = `Bonjour ${customer.name || ''},\n\nMerci d'avoir choisi *${settings.value.business || 'Alpha Shop07'}* ! N'hésitez pas à nous contacter si vous avez la moindre question.`
  const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`
  window.open(url, '_blank')
}

function parseProductFromText(promptText) {
  const text = promptText.trim()
  if (!text) return null

  const colorMap = {
    'noir': 'Noir', 'black': 'Noir', 'khal': 'Noir',
    'blanc': 'Blanc', 'white': 'Blanc', 'byad': 'Blanc',
    'rouge': 'Rouge', 'red': 'Rouge', 'hamar': 'Rouge',
    'bleu': 'Bleu', 'blue': 'Bleu', 'zraq': 'Bleu',
    'vert': 'Vert', 'green': 'Vert', 'khdar': 'Vert',
    'jaune': 'Jaune', 'yellow': 'Jaune', 'sfar': 'Jaune',
    'gris': 'Gris', 'grey': 'Gris',
    'marron': 'Marron', 'brown': 'Marron', 'qahwi': 'Marron',
    'rose': 'Rose', 'pink': 'Rose',
    'orange': 'Orange',
    'violet': 'Violet', 'purple': 'Violet',
    'beige': 'Beige',
    'bordeaux': 'Bordeaux',
    'marine': 'Bleu Marine',
    'kaki': 'Kaki'
  }
  const words = text.toLowerCase().split(/[\s,;.+]+/)
  const foundColors = new Set()
  words.forEach(w => {
    if (colorMap[w]) foundColors.add(colorMap[w])
  })
  const colors = foundColors.size > 0 ? Array.from(foundColors) : ['Noir']

  const knownSizes = ['3xl', '2xl', 'xxl', 'xl', 'l', 'm', 's', 'xs', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46']
  const foundSizes = new Set()
  words.forEach(w => {
    if (knownSizes.includes(w)) {
      foundSizes.add(w.toUpperCase())
    }
  })
  const sizes = foundSizes.size > 0 ? Array.from(foundSizes) : ['M', 'L']

  let defaultStock = 10
  const stockMatch = text.match(/(?:stock|qte|quantite|unites?|pieces?)\s*[:=]?\s*(\d+)/i) || text.match(/(\d+)\s*(?:f\s*kull|cada|chacun|unites?|pieces?)/i)
  if (stockMatch) {
    defaultStock = parseInt(stockMatch[1], 10) || 10
  }

  let price = 149
  let purchasePrice = 65

  const purchaseMatch = text.match(/(?:achat|prix\s*d['’]?achat|cost|chri)\s*[:=]?\s*(\d+)/i) || text.match(/(\d+)\s*(?:dh|mad)?\s*(?:d['’]?achat|achat)/i)
  if (purchaseMatch) {
    purchasePrice = parseInt(purchaseMatch[1], 10) || 65
  }

  const priceMatch = text.match(/(?:prix|vente|price|b3t|bi3)\s*[:=]?\s*(\d+)/i) || text.match(/(\d+)\s*(?:dh|mad)/i)
  if (priceMatch) {
    price = parseInt(priceMatch[1], 10) || 149
  }

  let name = text
    .replace(/(?:stock|qte|quantite|unites?|pieces?|prix|vente|achat|cost|chri|dh|mad)\s*[:=]?\s*\d+/gi, '')
    .replace(/\b(\d+)\b/g, '')
    .trim()
  if (!name || name.length < 3) name = 'Nouveau Produit AI'

  const skuPrefix = name.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'PRD')
  const randomNum = Math.floor(100 + Math.random() * 900)
  const sku = `${skuPrefix}-${randomNum}`

  const variants = []
  colors.forEach(c => {
    sizes.forEach(sz => {
      variants.push({
        color: c,
        size: sz,
        stock: defaultStock,
        min: 2,
        barcode: '3' + Math.floor(1000000 + Math.random() * 9000000)
      })
    })
  })

  return {
    name,
    sku,
    barcode: '3' + Math.floor(1000000 + Math.random() * 9000000),
    category: 'Général',
    brand: 'Alpha',
    price,
    purchasePrice,
    variants
  }
}

function processAiAgentProduct() {
  if (!aiPrompt.value.trim()) return shop.notify('Entrez une description pour l\'agent AI')
  aiAnalyzing.value = true
  setTimeout(() => {
    const generated = parseProductFromText(aiPrompt.value)
    if (generated) {
      draft.value = generated
      aiModal.value = false
      aiPrompt.value = ''
      productModal.value = true
      shop.notify(`🤖 Agent AI : ${generated.variants.length} variante(s) générée(s) !`)
    } else {
      shop.notify('Impossible de détecter le produit')
    }
    aiAnalyzing.value = false
  }, 400)
}


const blank = () => ({ name: '', sku: '', barcode: '', category: 'Général', brand: '', price: 0, purchasePrice: 0, variants: [{ color: 'Noir', size: 'Unique', stock: 0, min: 2, barcode: '' }] })
const draft = ref(blank())

async function removeCurrentProduct() {
  if (!draft.value.id) return
  if (confirm(`Voulez-vous vraiment supprimer le produit "${draft.value.name}" ?`)) {
    await shop.removeProduct(draft.value.id)
    productModal.value = false
  }
}
const order = ref({ discount: 0, shipping: 0, customer: { name: '', phone: '', cityId: '', city: '', address: '', note: '' }, sendOzon: true, ozon: { customerId: localStorage.getItem('ozon-customer-id') || import.meta.env.VITE_OZON_CUSTOMER_ID || '89381', apiKey: localStorage.getItem('ozon-api-key') || import.meta.env.VITE_OZON_API_KEY || 'db4545-4ede23-78ef27-868f4a-fa5359', declaredValue: '', open: '1', fragile: '0', replace: '0' } })
const nav = [['dashboard', `Vue d'ensemble`, LayoutDashboard], ['products', 'Produits', Package], ['pos', 'Point de vente', ShoppingCart], ['orders', 'Commandes', Truck], ['customers', 'Clients', Users], ['suppliers', 'Fournisseurs', Factory], ['finance', 'Finance', WalletCards], ['reports', 'Rapports', BarChart3], ['settings', 'Réglages', Settings]]
const loadList = (key, initial = []) => ref(JSON.parse(localStorage.getItem(key) || JSON.stringify(initial)))
const customerList = loadList('alpha-customers', [])
const supplierList = loadList('alpha-suppliers', [])
const expenseList = loadList('alpha-expenses', [])
const entryModal = ref('')
const entry = ref({})
const settings = ref({ business: localStorage.getItem('alpha-business') || 'Alpha Shop', currency: 'MAD', ozonId: localStorage.getItem('ozon-customer-id') || import.meta.env.VITE_OZON_CUSTOMER_ID || '', ozonKey: localStorage.getItem('ozon-api-key') || import.meta.env.VITE_OZON_API_KEY || '', pin: localStorage.getItem('alpha-pin') || 'ALPHASHOP2026@@' })
const labels = { fr: { title: `Aujourd'hui`, sales: 'Ventes du jour', month: 'Ventes du mois', stock: 'Stock à surveiller', profit: 'Bénéfice estimé' }, ar: { title: 'اليوم', sales: 'مبيعات اليوم', month: 'مبيعات الشهر', stock: 'مخزون منخفض', profit: 'الربح المقدر' } }
const t = computed(() => labels[shop.language])
const filtered = computed(() => shop.products.filter(p => `${p.name} ${p.sku} ${p.barcode} ${p.category}`.toLowerCase().includes(shop.query.toLowerCase())))

// Bug fix: reset query when switching views so search doesn't bleed across sections
function navigate(id) { shop.query = ''; shop.active = id; mobile.value = false }

function edit(p) {
  try {
    draft.value = p ? JSON.parse(JSON.stringify(p)) : blank()
  } catch (_) {
    draft.value = blank()
  }
  productModal.value = true
}
async function save() { if (!draft.value.name) return shop.notify('Le nom du produit est requis'); await shop.saveProduct(draft.value); productModal.value = false }
function selectVariant(p) { if (p.variants.length === 1) shop.addCart(p, p.variants[0]); else variantModal.value = p }
function money(n) { return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(n) }
const EXPENSE_CATEGORIES = ['Loyer (Rent)', 'Salaires', 'Lumière & Eau (Électricité/Eau)', 'Marketing / Pub (Facebook/TikTok)', 'Livraison & Transport', 'Emballage & Fournitures', 'Achat de Stock', 'Autre']

function addEntry(type) {
  entryModal.value = type
  entry.value = type === 'customer'
    ? { name: '', phone: '', city: '', address: '' }
    : type === 'supplier'
      ? { name: '', phone: '', company: '', email: '' }
      : { category: 'Loyer (Rent)', amount: 0, note: '', date: new Date().toISOString().slice(0, 10) }
}

async function saveEntry() {
  if (entryModal.value === 'customer') {
    if (!entry.value.name) return shop.notify('Nom du client requis')
    await shop.saveCustomer(entry.value)
  } else if (entryModal.value === 'supplier') {
    if (!entry.value.name) return shop.notify('Nom du fournisseur requis')
    await shop.saveSupplier(entry.value)
  } else if (entryModal.value === 'expense') {
    if (!entry.value.amount || entry.value.amount <= 0) return shop.notify('Montant invalide')
    await shop.saveExpense(entry.value)
  }
  entryModal.value = ''
}

async function deleteEntry(type, id) {
  if (confirm('Voulez-vous vraiment supprimer cet élément ?')) {
    if (type === 'customer') await shop.removeCustomer(id)
    else if (type === 'supplier') await shop.removeSupplier(id)
    else if (type === 'expense') await shop.removeExpense(id)
  }
}
function saveSettings() {
  localStorage.setItem('alpha-business', settings.value.business)
  localStorage.setItem('ozon-customer-id', settings.value.ozonId)
  localStorage.setItem('ozon-api-key', settings.value.ozonKey)
  if (settings.value.pin) {
    localStorage.setItem('alpha-pin', settings.value.pin)
    masterPin.value = settings.value.pin
  }
  shop.notify('Réglages et Code PIN enregistrés')
}
function exportSales() { const rows = ['Numéro;Date;Total;Paiement;Client', ...shop.sales.map(s => `${s.number};${new Date(s.createdAt).toLocaleDateString('fr-MA')};${s.total};${s.payment};${s.customer?.name||'Comptoir'}`)]; const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })); const a = document.createElement('a'); a.href = url; a.download = `rapport-ventes-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url) }
function openCheckout() { if (!shop.cart.length) return shop.notify('Ajoutez au moins un article au panier'); mobileCartSheet.value = false; checkoutModal.value = true }
const orderTotal = computed(() => Math.max(0, shop.cartTotal - (Number(order.value.discount) || 0) + (Number(order.value.shipping) || 0)))

// Bug fix: submitOrder now uses finally to always unblock the button, and resets order after success
async function submitOrder() {
  const c = order.value.customer, o = order.value.ozon
  if (order.value.sendOzon && (!c.name || !c.phone || (!c.cityId && !c.city) || !c.address)) {
    return shop.notify('Veuillez renseigner le nom, téléphone, ville et adresse du client')
  }
  submitting.value = true
  try {
    const sale = await shop.checkout(payment.value, { discount: order.value.discount, shipping: order.value.shipping, customer: c })
    if (sale && order.value.sendOzon) {
      localStorage.setItem('ozon-customer-id', o.customerId)
      localStorage.setItem('ozon-api-key', o.apiKey)
      try {
        let cityIdParam = String(c.cityId || '').trim()
        const query = String(c.city || '').trim().toLowerCase()

        // Match against official Ozon cities database
        if (query) {
          const match = OZON_CITIES.find(city => city.name.toLowerCase() === query || city.name.toLowerCase().includes(query))
          if (match) cityIdParam = String(match.id)
        }
        if (!cityIdParam || cityIdParam === '1' || cityIdParam === '0') {
          cityIdParam = '2165' // Default Casablanca ID (2165)
        }

        const validId = (o.customerId && /^\d+$/.test(String(o.customerId).trim())) ? String(o.customerId).trim() : (import.meta.env.VITE_OZON_CUSTOMER_ID || '89381')
        const validKey = (o.apiKey && String(o.apiKey).trim().length > 5) ? String(o.apiKey).trim() : (import.meta.env.VITE_OZON_API_KEY || 'db4545-4ede23-78ef27-868f4a-fa5359')

        const response = await createOzonParcel({
          customerId: validId,
          apiKey: validKey,
          parcel: {
            'parcel-receiver': c.name,
            'parcel-phone': c.phone,
            'parcel-city': cityIdParam,
            'parcel-address': c.address,
            'parcel-note': c.note || 'Appeler avant livraison',
            'parcel-price': sale.total,
            'parcel-declared-value': o.declaredValue || Math.max(50, sale.total),
            'parcel-nature': 'Commande ' + sale.number,
            'parcel-stock': 0,
            'parcel-open': o.open || '1',
            'parcel-fragile': o.fragile || '0',
            'parcel-replace': o.replace || '0'
          }
        })
        const tracking = response['TRACKING-NUMBER'] || response.tracking || response['NEW-PARCEL']?.['TRACKING-NUMBER'] || 'Ozon Express'
        await shop.attachShipment(sale.id, { tracking, city: response.CITY_NAME || c.city || 'Casablanca', status: 'created', response })
        shop.notify(`Colis créé Ozon Express avec succès ! Tracking : ${tracking}`)
      } catch (error) {
        console.error('Ozon creation error:', error)
        shop.notify(`Vente enregistrée — Attention Ozon : ${error.message}`)
      }
    }
    if (sale) {
      checkoutModal.value = false
      // Reset order form after successful checkout
      order.value = { discount: 0, shipping: 0, customer: { name: '', phone: '', cityId: '', city: '', address: '', note: '' }, sendOzon: true, ozon: order.value.ozon }
      showInvoice(sale)
    }
  } finally {
    submitting.value = false
  }
}
async function verifyShipment(sale) { try { const result = await getOzonParcelInfo({ customerId: settings.value.ozonId, apiKey: settings.value.ozonKey, trackingNumber: sale.shipment?.tracking }); await shop.attachShipment(sale.id, { tracking: result['TRACKING-NUMBER'] || sale.shipment.tracking, city: result.CITY_NAME, status: result.STATUS || 'verified', response: result }); shop.notify(`Colis vérifié : ${result['TRACKING-NUMBER'] || sale.shipment.tracking}`) } catch (error) { shop.notify(`Vérification Ozon impossible : ${error.message}`) } }
onMounted(async () => {
  await shop.init()
  const params = new URLSearchParams(window.location.search)
  const invNum = params.get('invoice')
  if (invNum) {
    const sale = shop.sales.find(s => String(s.number).toLowerCase() === String(invNum).toLowerCase())
    if (sale) {
      activeInvoice.value = sale
      invoiceModal.value = true
      authenticated.value = true
    }
  }
})
</script>

<template>
  <!-- Modern Login Screen Overlay -->
  <div v-if="!authenticated" class="login-screen-bg">
    <div class="login-card">
      <div class="login-brand">
        <span class="mark">A</span>
        <span>ALPHASHOP<sup>07</sup></span>
      </div>
      <p class="login-subtitle">Gestion de Stock & Point de Vente Sécurisé</p>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="input-field">
          <label>Code PIN / Mot de passe</label>
          <div class="input-wrapper">
            <KeyRound :size="18" class="input-icon"/>
            <input
              v-model="loginPassword"
              :type="showPass ? 'text' : 'password'"
              placeholder="Entrez votre mot de passe"
              required
              autofocus
            />
            <button type="button" class="toggle-pass" @click="showPass = !showPass">
              <Eye v-if="!showPass" :size="18"/>
              <EyeOff v-else :size="18"/>
            </button>
          </div>
        </div>

        <div v-if="loginError" class="login-error">
          <AlertTriangle :size="16"/> {{ loginError }}
        </div>

        <button type="submit" class="login-btn">
          <Lock :size="18"/> Se Connecter à Alpha Shop 🔒
        </button>
      </form>
    </div>
  </div>

  <div v-else class="shell" :class="{arabic:shop.language==='ar'}">
    <!-- Mobile Sidebar Drawer Backdrop -->
    <div v-if="mobile" class="sidebar-backdrop" @click="mobile = false"></div>

    <aside :class="{open:mobile}">
      <div class="brand">
        <span class="mark">A</span>
        <span>ALPHASHOP<sup>07</sup></span>
        <button class="icon mobile-close-btn" @click="mobile = false"><X :size="18"/></button>
      </div>
      <div class="workspace">
        <span>ESPACE PRINCIPAL</span>
        <b>Alpha Shop</b>
        <ChevronRight :size="15"/>
      </div>
      <nav>
        <button v-for="[id,label,icon] in nav" :key="id" :class="{active:shop.active===id}" @click="navigate(id)">
          <component :is="icon" :size="18"/>{{label}}
          <span v-if="id==='products'&&shop.lowStock.length" class="badge">{{shop.lowStock.length}}</span>
        </button>
      </nav>
      <div class="side-bottom">
        <div class="sync">
          <Wifi v-if="shop.online" :size="15"/>
          <WifiOff v-else :size="15"/>
          {{shop.online?'Synchronisé':'Mode hors ligne'}}
        </div>
        <div class="avatar" @click="handleLogout" style="cursor:pointer;" title="Se déconnecter">
          <b>MA</b>
          <span>Mohamed A.<small>Déconnexion 🚪</small></span>
          <LogOut :size="16"/>
        </div>
      </div>
    </aside>

    <main>
      <header>
        <button class="icon mobile-only" @click="mobile=!mobile"><Menu/></button>
        <div class="crumb">
          <span>ALPHASHOP07</span><b>/</b><strong>{{nav.find(n=>n[0]===shop.active)?.[1]}}</strong>
        </div>
        <div class="header-actions">
          <button v-if="shop.active==='pos'" class="icon mobile-only" @click="mobileCartSheet = true">
            <ShoppingCart :size="19"/>
            <span v-if="shop.cart.length" class="cart-count-badge">{{shop.cart.length}}</span>
          </button>
          <button class="lang" @click="shop.setLanguage(shop.language==='fr'?'ar':'fr')">
            {{shop.language==='fr'?'ع':'FR'}}
          </button>
          <button class="icon" @click="shop.active='settings'"><Settings :size="19"/></button>
          <button class="icon" style="color:#dc2626;" title="Se déconnecter" @click="handleLogout"><LogOut :size="19"/></button>
        </div>
      </header>

      <!-- Dashboard View -->
      <section v-if="shop.active==='dashboard'" class="page">
        <div class="page-head">
          <div>
            <p class="eyebrow">{{t.title}} · {{new Date().toLocaleDateString('fr-MA',{weekday:'long',day:'numeric',month:'long'})}}</p>
            <h1>Bonjour, Mohamed.</h1>
          </div>
          <button class="primary" @click="shop.active='pos'"><Plus :size="17"/> Nouvelle vente</button>
        </div>
        <div class="metrics">
          <article><small>{{t.sales}}</small><strong>{{money(shop.todaySales||2840)}}</strong><em><ArrowUpRight :size="14"/> 12,5 %</em></article>
          <article><small>{{t.month}}</small><strong>{{money(shop.monthSales||48720)}}</strong><em><ArrowUpRight :size="14"/> 8,2 %</em></article>
          <article><small>{{t.profit}}</small><strong>{{money((shop.monthSales||48720)*.36)}}</strong><em><ArrowUpRight :size="14"/> 4,1 %</em></article>
          <article><small>{{t.stock}}</small><strong>{{shop.lowStock.length}}</strong><em class="warning"><AlertTriangle :size="14"/> À traiter</em></article>
        </div>
        <div class="dashboard-grid">
          <article class="panel chart">
            <div class="panel-title">
              <div><h2>Performance des ventes</h2><p>7 derniers jours</p></div>
              <button class="quiet">Cette semaine</button>
            </div>
            <div class="bars">
              <i v-for="(h,i) in [45,71,54,83,62,91,76]" :key="i" :style="{height:h+'%'}">
                <span>{{['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'][i]}}</span>
              </i>
            </div>
          </article>
          <article class="panel">
            <div class="panel-title">
              <div><h2>Stock faible</h2><p>Action recommandée</p></div>
              <button class="text-btn" @click="shop.active='products'">Voir tout</button>
            </div>
            <div v-if="shop.lowStock.length" class="list">
              <div v-for="v in shop.lowStock" :key="v.id" class="row">
                <div class="square"></div>
                <span><b>{{v.product}}</b><small>{{v.color}} · {{v.size}}</small></span>
                <strong>{{v.stock}} unités</strong>
              </div>
            </div>
            <div v-else class="empty">Tout est sous contrôle.</div>
          </article>
          <article class="panel recent">
            <div class="panel-title">
              <div><h2>Dernières ventes</h2><p>Transactions récentes</p></div>
              <button class="text-btn" @click="shop.active='orders'">Historique</button>
            </div>
            <div v-if="shop.sales.length" class="table">
              <div v-for="s in shop.sales.slice(0,5)" :key="s.id">
                <span><b>{{s.number}}</b><small>{{new Date(s.createdAt).toLocaleString('fr-MA')}}</small></span>
                <span>{{s.items.length}} article(s)</span>
                <strong>{{money(s.total)}}</strong>
                <em>Payée</em>
              </div>
            </div>
            <div v-else class="empty">Vos prochaines ventes apparaitront ici.</div>
          </article>
        </div>
      </section>

      <!-- Products Catalog View -->
      <section v-else-if="shop.active==='products'" class="page">
        <div class="page-head">
          <div><p class="eyebrow">CATALOGUE</p><h1>Produits</h1></div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button class="primary" style="background: linear-gradient(135deg, #4f46e5, #7c3aed); border: none;" @click="aiModal = true">
              <Bot :size="17"/> 🤖 Agent AI (Ajout Auto)
            </button>
            <button class="primary" @click="edit()"><Plus :size="17"/> Ajouter un produit</button>
          </div>
        </div>
        <div class="toolbar">
          <div class="search">
            <Search :size="18"/>
            <input v-model="shop.query" placeholder="Rechercher par nom, SKU ou code-barres"/>
          </div>
          <button class="quiet">Filtres</button>
          <button class="quiet">Exporter</button>
        </div>
        <div class="panel products-table">
          <div class="table-head">
            <span>Produit</span>
            <span>Catégorie</span>
            <span>Prix</span>
            <span>Stock</span>
            <span></span>
          </div>
          <div v-for="p in filtered" :key="p.id" class="product-row" @click="edit(p)">
            <div>
              <div class="product-thumb">{{p.name[0]}}</div>
              <span><b>{{p.name}}</b><small>{{p.sku}} · {{p.brand||'Sans marque'}}</small></span>
            </div>
            <span>{{p.category}}</span>
            <strong>{{money(p.price)}}</strong>
            <span :class="{danger:p.variants.reduce((n,v)=>n+v.stock,0)<=p.variants.reduce((n,v)=>n+v.min,0)}">
              {{p.variants.reduce((n,v)=>n+v.stock,0)}} en stock
            </span>
            <button class="icon" @click.stop="edit(p)"><MoreHorizontal :size="18"/></button>
          </div>
        </div>
      </section>

      <!-- Point of Sale (POS) View -->
      <section v-else-if="shop.active==='pos'" class="pos page">
        <div class="pos-top">
          <div><p class="eyebrow">VENTE RAPIDE</p><h1>Point de vente</h1></div>
          <div class="search">
            <Search :size="18"/>
            <input v-model="shop.query" placeholder="Scanner ou rechercher…"/>
          </div>
        </div>
        <div class="pos-layout">
          <div class="catalog">
            <button v-for="p in filtered" :key="p.id" class="pos-product" @click="selectVariant(p)">
              <div class="pos-art">{{p.name[0]}}</div>
              <b>{{p.name}}</b>
              <small>{{p.variants.reduce((n,v)=>n+v.stock,0)}} disponibles</small>
              <strong>{{money(p.price)}}</strong>
            </button>
          </div>

          <!-- Cart Sidebar -->
          <aside class="cart">
            <div class="cart-title"><h2>Panier</h2><span>{{shop.cart.length}} articles</span></div>
            <div class="cart-lines">
              <div v-for="line in shop.cart" :key="line.variantId">
                <span><b>{{line.name}}</b><small>{{line.variant}} · {{money(line.price)}}</small></span>
                <div class="quantity">
                  <button type="button" @click="shop.decrementCartLine(line)"><Minus :size="13"/></button>
                  <b>{{line.quantity}}</b>
                  <button type="button" @click="shop.incrementCartLine(line)"><Plus :size="13"/></button>
                  <button type="button" class="icon" style="color:#999;width:22px;height:22px" @click="shop.removeCartLine(line.variantId)"><X :size="12"/></button>
                </div>
              </div>
              <div v-if="!shop.cart.length" class="empty">Ajoutez un article depuis le catalogue.</div>
            </div>
            <div class="total"><span>Total</span><strong>{{money(shop.cartTotal)}}</strong></div>
            <div class="payments">
              <button v-for="p in ['Espèces','Carte','Virement']" :key="p" :class="{chosen:payment===p}" @click="payment=p">{{p}}</button>
            </div>
            <button class="primary checkout" :disabled="!shop.cart.length" @click="openCheckout">
              Finaliser la vente <ArrowUpRight :size="17"/>
            </button>
          </aside>
        </div>

        <!-- Sticky Floating Cart Bar for Mobile POS -->
        <div v-if="shop.cart.length" class="mobile-cart-float" @click="mobileCartSheet = true">
          <span>🛒 Panier ({{shop.cart.length}})</span>
          <strong>{{money(shop.cartTotal)}} →</strong>
        </div>
      </section>

      <!-- Orders View -->
      <section v-else-if="shop.active==='orders'" class="page">
        <div class="page-head">
          <div><p class="eyebrow">SUIVI DES VENTES</p><h1>Commandes</h1></div>
          <button class="primary" @click="shop.active='pos'"><Plus :size="17"/> Nouvelle commande</button>
        </div>
        <div class="panel orders-list">
          <div v-if="shop.sales.length" class="table">
            <div v-for="sale in shop.sales" :key="sale.id">
              <span><b>{{sale.number}}</b><small>{{new Date(sale.createdAt).toLocaleString('fr-MA')}}</small></span>
              <span><b>{{sale.customer?.name||'Vente comptoir'}}</b><small v-if="sale.shipment?.tracking">Ozon : {{sale.shipment.tracking}}</small></span>
              <strong>{{money(sale.total)}}</strong>
              <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                <button v-if="sale.customer?.phone" class="quiet" style="color:#16a34a; display:flex; gap:4px; align-items:center;" title="Envoyer le récapitulatif sur WhatsApp" @click="sendWhatsAppOrderMessage(sale)">
                  <MessageCircle :size="14"/> WhatsApp
                </button>
                <button class="quiet" @click="showInvoice(sale)" title="Voir et imprimer la facture">
                  <FileText :size="15"/> Facture
                </button>
                <button class="quiet" style="color:#3b82f6;" @click="openEditSale(sale)" title="Modifier la commande / Changement de prix">
                  ✏️ Modifier / Prix
                </button>
                <button class="quiet danger" style="color:#ef4444; display:flex; gap:4px; align-items:center;" @click="confirmDeleteSale(sale)" title="Supprimer la commande (Retour produit)">
                  <Trash2 :size="14"/> Supprimer
                </button>
                <button v-if="sale.shipment?.tracking" class="quiet" @click="verifyShipment(sale)">Vérifier Ozon</button>
              </div>
            </div>
          </div>
          <div v-else class="empty">Aucune commande. Créez votre première vente depuis le point de vente.</div>
        </div>
      </section>

      <!-- Customers & Suppliers View -->
      <section v-else-if="shop.active==='customers'||shop.active==='suppliers'" class="page">
        <div class="page-head">
          <div><p class="eyebrow">RÉPERTOIRE</p><h1>{{shop.active==='customers'?'Clients':'Fournisseurs'}}</h1></div>
          <button class="primary" @click="addEntry(shop.active==='customers'?'customer':'supplier')"><Plus :size="17"/> Ajouter {{shop.active==='customers'?'un client':'un fournisseur'}}</button>
        </div>
        <div class="panel directory">
          <div v-if="(shop.active==='customers' ? (shop.customers || []) : (shop.suppliers || [])).length" class="table">
            <div v-for="person in (shop.active==='customers' ? (shop.customers || []) : (shop.suppliers || []))" :key="person.id || person.name">
              <span><b>{{person.name}}</b><small>{{person.phone||person.email||'Aucun contact'}}</small></span>
              <span>{{person.city||person.company||'—'}}</span>
              <strong>{{person.address||person.email||'—'}}</strong>
              <div style="display:flex; gap:6px; align-items:center;">
                <button v-if="person.phone" class="icon" style="color:#16a34a;" title="Contacter sur WhatsApp" @click.stop="sendWhatsAppCustomerMessage(person)">
                  <MessageCircle :size="16"/>
                </button>
                <button class="icon" style="color:#dc2626" @click.stop="deleteEntry(shop.active==='customers'?'customer':'supplier', person.id)"><Trash2 :size="15"/></button>
              </div>
            </div>
          </div>
          <div v-else class="empty">Aucun {{shop.active==='customers'?'client':'fournisseur'}} enregistré pour le moment.</div>
        </div>
      </section>

      <!-- Finance View -->
      <section v-else-if="shop.active==='finance'" class="page">
        <div class="page-head">
          <div><p class="eyebrow">TRÉSORERIE & DÉPENSES</p><h1>Finance</h1></div>
          <button class="primary" @click="addEntry('expense')"><Plus :size="17"/> Ajouter une dépense</button>
        </div>
        <div class="metrics finance-metrics">
          <article><small>Ventes Totales (Encaissements)</small><strong>{{money(shop.totalSales)}}</strong></article>
          <article><small>Total Dépenses</small><strong style="color: #dc2626;">{{money(shop.totalExpenses)}}</strong></article>
          <article><small>Solde Net (Profit)</small><strong :style="{ color: shop.netProfit >= 0 ? '#16a34a' : '#dc2626' }">{{money(shop.netProfit)}}</strong></article>
          <article><small>Valeur du Stock</small><strong>{{money(shop.inventoryValue)}}</strong></article>
        </div>
        <div class="panel">
          <div class="panel-title">
            <div><h2>Journal des Dépenses</h2><p>Loyer, salaires, électricité, publicité, livraison...</p></div>
          </div>
          <div v-if="(shop.expenses || []).length" class="table">
            <div v-for="expense in (shop.expenses || [])" :key="expense.id || expense.category">
              <span><b>{{expense.category}}</b><small>{{expense.date}}</small></span>
              <span>{{expense.note||'—'}}</span>
              <strong style="color: #dc2626;">-{{money(expense.amount)}}</strong>
              <button class="icon" style="color:#dc2626" @click.stop="deleteEntry('expense', expense.id)"><Trash2 :size="15"/></button>
            </div>
          </div>
          <div v-else class="empty">Aucune dépense enregistrée. Cliquez sur "Ajouter une dépense".</div>
        </div>
      </section>

      <!-- Reports View -->
      <section v-else-if="shop.active==='reports'" class="page">
        <div class="page-head">
          <div><p class="eyebrow">ANALYSE & RAPPORTS</p><h1>Rapports & Statistiques</h1></div>
          <button class="primary" @click="exportSales">Exporter le rapport CSV</button>
        </div>
        <div class="metrics">
          <article><small>Ventes Totales</small><strong>{{money(shop.totalSales)}}</strong></article>
          <article><small>Commandes Effectuées</small><strong>{{shop.sales.length}}</strong></article>
          <article><small>Panier Moyen</small><strong>{{money(shop.sales.length ? shop.totalSales / shop.sales.length : 0)}}</strong></article>
          <article><small>Stock en Alerte</small><strong :class="{ danger: shop.lowStock.length > 0 }">{{shop.lowStock.length}} produits</strong></article>
        </div>
        <div class="panel module">
          <h2>Synthèse d'activité</h2>
          <p>Les indicateurs sont calculés en temps réel depuis votre base de données. Vous pouvez exporter un fichier CSV pour Excel ou Google Sheets.</p>
        </div>
      </section>

      <!-- Settings View -->
      <section v-else-if="shop.active==='settings'" class="page">
        <div class="page-head">
          <div><p class="eyebrow">CONFIGURATION</p><h1>Réglages</h1></div>
        </div>
        <form class="panel settings-form" @submit.prevent="saveSettings">
          <div>
            <h2>Entreprise</h2>
            <label>Nom de l’entreprise<input v-model="settings.business"/></label>
            <label>Devise
              <select v-model="settings.currency">
                <option>MAD</option>
                <option>EUR</option>
                <option>USD</option>
              </select>
            </label>
          </div>
          <div>
            <h2>Ozon Express</h2>
            <label>ID Client<input v-model="settings.ozonId"/></label>
            <label>Clé API<input v-model="settings.ozonKey" type="password"/></label>
          </div>
          <div>
            <h2>Sécurité & Accès</h2>
            <label>Code PIN / Mot de passe du Dashboard
              <input v-model="settings.pin" type="text" placeholder="Ex: ALPHASHOP2026@@"/>
            </label>
          </div>
          <div class="modal-actions">
            <button class="primary">Enregistrer les réglages</button>
          </div>
        </form>
      </section>
    </main>

    <!-- Notifications Toast -->
    <Transition name="fade">
      <div v-if="shop.toast" class="toast">✓ {{shop.toast}}</div>
    </Transition>

    <!-- Mobile POS Cart Modal/Sheet -->
    <div v-if="mobileCartSheet" class="overlay" @click.self="mobileCartSheet = false">
      <div class="modal cart">
        <div class="cart-title">
          <h2>Panier ({{shop.cart.length}})</h2>
          <button class="icon" @click="mobileCartSheet = false"><X/></button>
        </div>
        <div class="cart-lines">
          <div v-for="line in shop.cart" :key="line.variantId">
            <span><b>{{line.name}}</b><small>{{line.variant}} · {{money(line.price)}}</small></span>
            <div class="quantity">
              <button type="button" @click="shop.decrementCartLine(line)"><Minus :size="13"/></button>
              <b>{{line.quantity}}</b>
              <button type="button" @click="shop.incrementCartLine(line)"><Plus :size="13"/></button>
              <button type="button" class="icon" style="color:#999;width:22px;height:22px" @click="shop.removeCartLine(line.variantId)"><X :size="12"/></button>
            </div>
          </div>
          <div v-if="!shop.cart.length" class="empty">Ajoutez un article depuis le catalogue.</div>
        </div>
        <div class="total"><span>Total</span><strong>{{money(shop.cartTotal)}}</strong></div>
        <div class="payments">
          <button v-for="p in ['Espèces','Carte','Virement']" :key="p" :class="{chosen:payment===p}" @click="payment=p">{{p}}</button>
        </div>
        <button class="primary checkout" :disabled="!shop.cart.length" @click="openCheckout">
          Finaliser la vente <ArrowUpRight :size="17"/>
        </button>
      </div>
    </div>

    <!-- Product Edit/Create Modal -->
    <div v-if="productModal" class="overlay" @click.self="productModal=false">
      <form class="modal product-form" @submit.prevent="save">
        <div class="modal-head">
          <div>
            <p class="eyebrow">CATALOGUE</p>
            <h2>{{draft.id?'Modifier le produit':'Nouveau produit'}}</h2>
          </div>
          <button type="button" class="icon" @click="productModal=false"><X/></button>
        </div>
        <label>Nom du produit<input v-model="draft.name" autofocus required/></label>
        <div class="two">
          <label>SKU<input v-model="draft.sku"/></label>
          <label>Code-barres<input v-model="draft.barcode"/></label>
        </div>
        <div class="two">
          <label>Catégorie<input v-model="draft.category"/></label>
          <label>Marque<input v-model="draft.brand"/></label>
        </div>
        <div class="two">
          <label>Prix de vente (MAD)<input v-model.number="draft.price" type="number" min="0" required/></label>
          <label>Prix d’achat (MAD)<input v-model.number="draft.purchasePrice" type="number" min="0"/></label>
        </div>
        <div class="variants">
          <div class="section-line">
            <b>Variantes & stock</b>
            <button type="button" class="text-btn" @click="draft.variants.push({color:'',size:'',stock:0,min:2,barcode:''})">
              <Plus :size="14"/> Ajouter
            </button>
          </div>
          <div v-for="(v,i) in draft.variants" :key="i" class="variant-fields">
            <input v-model="v.color" placeholder="Couleur"/>
            <input v-model="v.size" placeholder="Taille"/>
            <input v-model.number="v.stock" type="number" placeholder="Stock"/>
            <button type="button" class="icon" @click="draft.variants.splice(i,1)" :disabled="draft.variants.length===1"><X :size="15"/></button>
          </div>
        </div>
        <div class="modal-actions">
          <button v-if="draft.id" type="button" class="quiet danger-btn" @click="removeCurrentProduct" style="margin-right: auto; color: #dc2626; border-color: #fca5a5;">
            <Trash2 :size="15"/> Supprimer
          </button>
          <button type="button" class="quiet" @click="productModal=false">Annuler</button>
          <button class="primary">Enregistrer</button>
        </div>
      </form>
    </div>

    <!-- Variant Picker Modal -->
    <div v-if="variantModal" class="overlay" @click.self="variantModal=null">
      <div class="modal">
        <div class="modal-head">
          <div><p class="eyebrow">CHOISIR UNE VARIANTE</p><h2>{{variantModal.name}}</h2></div>
          <button class="icon" @click="variantModal=null"><X/></button>
        </div>
        <button v-for="v in variantModal.variants" :key="v.id" class="variant-pick" :disabled="!v.stock" @click="shop.addCart(variantModal,v);variantModal=null">
          <span><b>{{v.color}} · {{v.size}}</b><small>{{v.stock}} unités disponibles</small></span>
          <strong>{{money(variantModal.price)}}</strong>
        </button>
      </div>
    </div>

    <!-- Checkout / Ozon Order Modal -->
    <div v-if="checkoutModal" class="overlay checkout-overlay" @click.self="checkoutModal=false">
      <form class="modal order-form" @submit.prevent="submitOrder">
        <div class="modal-head">
          <div><p class="eyebrow">FINALISER LA COMMANDE</p><h2>Livraison & paiement</h2></div>
          <button type="button" class="icon" @click="checkoutModal=false"><X/></button>
        </div>
        <div class="checkout-summary">
          <span>Sous-total <b>{{money(shop.cartTotal)}}</b></span>
          <span>Total à payer <strong>{{money(orderTotal)}}</strong></span>
        </div>
        <div class="two">
          <label>Réduction (MAD)<input v-model.number="order.discount" type="number" min="0"/></label>
          <label>Prix de livraison (MAD)<input v-model.number="order.shipping" type="number" min="0"/></label>
        </div>
        <div class="section-line customer-title">
          <b>Informations du client</b>
          <label class="switch"><input v-model="order.sendOzon" type="checkbox"/> Créer un colis Ozon Express</label>
        </div>
        <div class="two">
          <label>Nom complet<input v-model="order.customer.name" placeholder="Mohammed Alami" :required="order.sendOzon"/></label>
          <label>Téléphone<input v-model="order.customer.phone" placeholder="0612345678" :required="order.sendOzon"/></label>
        </div>
        <div class="two">
          <div class="city-picker-container">
            <label>Ville de livraison (Ozon Express)
              <input
                v-model="order.customer.city"
                placeholder="Tapez votre ville (Ex: Casablanca, Rabat...)"
                @input="onCityInput"
                @focus="citySearchOpen = true"
                @blur="setTimeout(() => { citySearchOpen = false }, 250)"
                :required="order.sendOzon"
                autocomplete="off"
              />
            </label>
            <div
              v-if="citySearchOpen && citySuggestions.length"
              class="city-dropdown"
            >
              <div
                v-for="c in citySuggestions"
                :key="c.id"
                class="city-option"
                @mousedown.prevent="selectCity(c)"
              >
                <span><b>{{ c.name }}</b></span>
                <span class="city-badge">ID: {{ c.id }}</span>
              </div>
            </div>
          </div>
          <label>Adresse complète<input v-model="order.customer.address" placeholder="123 Rue Hassan II, Quartier Maarif" :required="order.sendOzon"/></label>
        </div>
        <label>Note de livraison<input v-model="order.customer.note" placeholder="Appeler avant livraison"/></label>
        <div v-if="order.sendOzon" class="ozon-settings">
          <p class="eyebrow">OZON EXPRESS</p>
          <div class="two">
            <label>ID Client Ozon<input v-model="order.ozon.customerId" required/></label>
            <label>Clé API Ozon<input v-model="order.ozon.apiKey" type="password" required/></label>
          </div>
          <div class="two">
            <label>Valeur déclarée (MAD)<input v-model.number="order.ozon.declaredValue" type="number" min="50" placeholder="Si prix 0 ou > 5000"/></label>
            <label>Ouverture du colis
              <select v-model="order.ozon.open">
                <option value="1">Autoriser</option>
                <option value="2">Ne pas autoriser</option>
              </select>
            </label>
          </div>
          <div class="two">
            <label>Fragile
              <select v-model="order.ozon.fragile">
                <option value="0">Non</option>
                <option value="1">Oui</option>
              </select>
            </label>
            <label>Échange
              <select v-model="order.ozon.replace">
                <option value="0">Non</option>
                <option value="1">Oui</option>
              </select>
            </label>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="quiet" @click="checkoutModal=false">Retour</button>
          <button class="primary" :disabled="submitting">{{submitting?'Enregistrement…':order.sendOzon?'Créer la vente et le colis':'Finaliser la vente'}}</button>
        </div>
      </form>
    </div>

    <!-- Customers, Suppliers, Expense Entry Modal -->
    <div v-if="entryModal" class="overlay" @click.self="entryModal=''">
      <form class="modal" @submit.prevent="saveEntry">
        <div class="modal-head">
          <h2>{{entryModal==='customer'?'Nouveau client':entryModal==='supplier'?'Nouveau fournisseur':'Nouvelle dépense'}}</h2>
          <button type="button" class="icon" @click="entryModal=''"><X/></button>
        </div>
        <template v-if="entryModal==='customer'">
          <label>Nom complet<input v-model="entry.name" required/></label>
          <div class="two">
            <label>Téléphone<input v-model="entry.phone"/></label>
            <label>Ville<input v-model="entry.city"/></label>
          </div>
          <label>Adresse<input v-model="entry.address"/></label>
        </template>
        <template v-else-if="entryModal==='supplier'">
          <label>Nom<input v-model="entry.name" required/></label>
          <div class="two">
            <label>Téléphone<input v-model="entry.phone"/></label>
            <label>Société<input v-model="entry.company"/></label>
          </div>
          <label>Email<input v-model="entry.email" type="email"/></label>
        </template>
        <template v-else>
          <div class="two">
            <label>Catégorie de Dépense
              <select v-model="entry.category" required>
                <option v-for="cat in EXPENSE_CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </label>
            <label>Montant (MAD)<input v-model.number="entry.amount" type="number" min="0" required/></label>
          </div>
          <label>Date<input v-model="entry.date" type="date"/></label>
          <label>Note / Description<input v-model="entry.note" placeholder="Ex: Loyer du mois, Pub Facebook, etc."/></label>
        </template>
        <div class="modal-actions">
          <button type="button" class="quiet" @click="entryModal=''">Annuler</button>
          <button class="primary">Enregistrer</button>
        </div>
      </form>
    </div>

    <!-- Printable Invoice Modal (Alpha Shop) -->
    <div v-if="invoiceModal && activeInvoice" class="overlay" @click.self="invoiceModal=false">
      <div class="modal invoice-modal-container" style="max-width:720px; width:100%; padding: 20px; max-height:90vh; overflow-y:auto;">
        <div class="no-print" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h3 style="margin:0; font-size:16px;">DOCUMENT DE FACTURE</h3>
          <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
            <button v-if="activeInvoice.customer?.phone" type="button" class="primary" style="background:#16a34a; border:none; display:flex; gap:6px; align-items:center;" @click="sendWhatsAppOrderMessage(activeInvoice)">
              <MessageCircle :size="16"/> WhatsApp Direct 💬
            </button>
            <button type="button" class="primary" style="background:#4f46e5; border:none; display:flex; gap:6px; align-items:center;" @click="downloadInvoicePdf(activeInvoice)">
              <Printer :size="16"/> Télécharger PDF / Imprimer 🖨️
            </button>
            <button type="button" class="quiet icon" @click="invoiceModal=false"><X :size="16"/></button>
          </div>
        </div>

        <!-- Printable Document Component -->
        <div class="invoice-paper">
          <div class="invoice-header">
            <div>
              <div class="invoice-logo"><span>A</span> ALPHA SHOP<sup>07</sup></div>
              <p style="margin:4px 0 0; font-size:12px; color:#555;">Gestion de Stock & Point de Vente</p>
            </div>
            <div style="text-align:right;">
              <h2 style="margin:0; font-size:18px; color:#111;">FACTURE DE VENTE</h2>
              <b style="font-size:14px; color:#444;">N° {{activeInvoice.number}}</b>
              <p style="margin:4px 0 0; font-size:12px; color:#777;">Date : {{new Date(activeInvoice.createdAt).toLocaleString('fr-MA')}}</p>
            </div>
          </div>

          <div class="invoice-info-grid">
            <div class="invoice-box">
              <h4>Émetteur / Boutique</h4>
              <b>{{settings.business || 'Alpha Shop'}}</b><br/>
              <span>Vente Directe & Livraison</span>
            </div>
            <div class="invoice-box">
              <h4>Client & Destination</h4>
              <b>{{activeInvoice.customer?.name || 'Vente Comptoir'}}</b><br/>
              <span v-if="activeInvoice.customer?.phone">Tél : {{activeInvoice.customer.phone}}<br/></span>
              <span v-if="activeInvoice.customer?.city">Ville : {{activeInvoice.customer.city}}<br/></span>
              <span v-if="activeInvoice.customer?.address">Adresse : {{activeInvoice.customer.address}}<br/></span>
              <span v-if="activeInvoice.shipment?.tracking" style="font-weight:700; color:#2563eb;">Suivi Ozon : {{activeInvoice.shipment.tracking}}</span>
            </div>
          </div>

          <table class="invoice-table">
            <thead>
              <tr>
                <th>Article</th>
                <th style="text-align:center;">Qté</th>
                <th style="text-align:right;">Prix Unitaire</th>
                <th style="text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in activeInvoice.items" :key="item.variantId || item.productId">
                <td><b>{{item.name}}</b> <small v-if="item.variant">({{item.variant}})</small></td>
                <td style="text-align:center;">{{item.quantity}}</td>
                <td style="text-align:right;">{{money(item.price)}}</td>
                <td style="text-align:right;"><b>{{money(item.price * item.quantity)}}</b></td>
              </tr>
            </tbody>
          </table>

          <div class="invoice-totals">
            <div class="invoice-totals-row">
              <span>Sous-total</span>
              <b>{{money(activeInvoice.subtotal || activeInvoice.total)}}</b>
            </div>
            <div v-if="activeInvoice.discount" class="invoice-totals-row">
              <span>Réduction</span>
              <b style="color:#dc2626;">-{{money(activeInvoice.discount)}}</b>
            </div>
            <div v-if="activeInvoice.shipping" class="invoice-totals-row">
              <span>Livraison</span>
              <b>+{{money(activeInvoice.shipping)}}</b>
            </div>
            <div class="invoice-totals-row grand">
              <span>TOTAL NET (MAD)</span>
              <span>{{money(activeInvoice.total)}}</span>
            </div>
            <div style="font-size:11px; text-align:right; color:#666; margin-top:6px;">
              Paiement : <b>{{activeInvoice.payment || 'Espèces'}}</b>
            </div>
          </div>

          <div class="invoice-footer">
            <p style="margin:0 0 4px; font-weight:700;">Merci pour votre confiance !</p>
            <p style="margin:0; font-size:11px;">Alpha Shop07 — Document généré automatiquement</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Agent AI Smart Product Modal -->
    <div v-if="aiModal" class="overlay" @click.self="aiModal=false">
      <div class="modal" style="max-width:540px; width:100%; padding:24px;">
        <div class="modal-head" style="margin-bottom:12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width:36px; height:36px; border-radius:10px; background:linear-gradient(135deg,#4f46e5,#7c3aed); color:#fff; display:grid; place-items:center;">
              <Bot :size="20"/>
            </div>
            <div>
              <h2 style="margin:0; font-size:17px;">Agent AI — Ajout Auto de Produit</h2>
              <p style="margin:2px 0 0; font-size:12px; color:#666;">Écrivez votre produit en texte brut (Darija / Français)</p>
            </div>
          </div>
          <button type="button" class="icon" @click="aiModal=false"><X/></button>
        </div>

        <form @submit.prevent="processAiAgentProduct">
          <label style="display:block; margin-bottom:12px;">
            <span style="font-weight:600; font-size:13px; margin-bottom:6px; display:block;">Description du produit</span>
            <textarea
              v-model="aiPrompt"
              rows="4"
              style="width:100%; border:1px solid #ddd; border-radius:8px; padding:10px; font-family:inherit; font-size:13px;"
              placeholder="Exemple : T-Shirt Nike S M L XL noir blanc prix 180dh achat 80dh stock 15 f kull taille"
              required
            ></textarea>
          </label>

          <div style="background:#f4f4f6; border-radius:8px; padding:12px; margin-bottom:16px; font-size:12px; color:#444;">
            <b>💡 Conseils pour l'Agent :</b>
            <ul style="margin:6px 0 0 16px; padding:0; line-height:1.5;">
              <li>Mentionnez les <b>Couleurs</b> : <i>noir, blanc, bleu, rouge, gris, marron...</i></li>
              <li>Mentionnez les <b>Tailles</b> : <i>S, M, L, XL, XXL, 38, 39, 40, 41, 42...</i></li>
              <li>Mentionnez le <b>Prix</b> : <i>150dh vente, 70dh achat, stock 10</i></li>
            </ul>
          </div>

          <div class="modal-actions">
            <button type="button" class="quiet" @click="aiModal=false">Annuler</button>
            <button class="primary" style="background:linear-gradient(135deg,#4f46e5,#7c3aed); border:none;" :disabled="aiAnalyzing">
              <Sparkles :size="16"/> {{aiAnalyzing ? 'Analyse par l\'Agent…' : 'Générer le Produit 🚀'}}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Order / Price Change Modal -->
    <div v-if="editSaleModal" class="overlay" @click.self="editSaleModal = null">
      <div class="modal card" style="max-width: 500px; width: 100%; padding: 24px; background: #fff; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
        <div class="modal-head" style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
          <h2 style="margin: 0; font-size: 18px;">Modifier la Vente {{ editSaleModal.number }}</h2>
          <button type="button" class="icon" @click="editSaleModal = null"><X :size="18"/></button>
        </div>
        <form @submit.prevent="saveEditSale">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
            <label style="display: block;">
              <span style="font-weight: 600; font-size: 13px; margin-bottom: 4px; display: block;">Mode de paiement</span>
              <select v-model="editSaleModal.payment" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ddd;">
                <option value="Espèces">Espèces</option>
                <option value="Carte">Carte</option>
                <option value="Virement">Virement</option>
              </select>
            </label>
            <label style="display: block;">
              <span style="font-weight: 600; font-size: 13px; margin-bottom: 4px; display: block;">Statut de la commande</span>
              <select v-model="editSaleModal.status" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ddd;">
                <option value="completed">Complétée</option>
                <option value="pending">En attente</option>
                <option value="returned">Retourné (Retour)</option>
              </select>
            </label>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
            <label style="display: block;">
              <span style="font-weight: 600; font-size: 13px; margin-bottom: 4px; display: block;">Réduction (MAD)</span>
              <input v-model.number="editSaleModal.discount" type="number" min="0" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ddd;"/>
            </label>
            <label style="display: block;">
              <span style="font-weight: 600; font-size: 13px; margin-bottom: 4px; display: block;">Frais de livraison (MAD)</span>
              <input v-model.number="editSaleModal.shipping" type="number" min="0" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ddd;"/>
            </label>
          </div>
          <label style="display: block; margin-bottom: 12px;">
            <span style="font-weight: 600; font-size: 13px; margin-bottom: 4px; display: block;">Prix Total Final (MAD)</span>
            <input v-model.number="editSaleModal.total" type="number" min="0" required style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ddd; font-weight: 700; font-size: 15px;"/>
          </label>
          <div v-if="editSaleModal.customer" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <label style="display: block;">
              <span style="font-weight: 600; font-size: 13px; margin-bottom: 4px; display: block;">Nom du client</span>
              <input v-model="editSaleModal.customer.name" placeholder="Nom du client" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ddd;"/>
            </label>
            <label style="display: block;">
              <span style="font-weight: 600; font-size: 13px; margin-bottom: 4px; display: block;">Téléphone</span>
              <input v-model="editSaleModal.customer.phone" placeholder="Téléphone" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ddd;"/>
            </label>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
            <button type="button" class="quiet" @click="editSaleModal = null">Annuler</button>
            <button type="submit" class="primary">Enregistrer les modifications ✓</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete / Return Order Confirmation Modal -->
    <div v-if="deleteSaleModal" class="overlay" @click.self="deleteSaleModal = null">
      <div class="modal card" style="max-width: 460px; width: 100%; padding: 24px; background: #fff; border-radius: 12px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: #fee2e2; color: #ef4444; display: grid; place-items: center; margin: 0 auto 12px;">
          <AlertTriangle :size="24"/>
        </div>
        <h2 style="margin: 0 0 8px; font-size: 18px; color: #18181b;">Supprimer la commande {{ deleteSaleModal.number }}</h2>
        <p style="font-size: 13px; color: #71717a; margin-bottom: 20px; line-height: 1.5;">
          En cas de retour produit (Retour), vous pouvez restituer automatiquement les articles au stock de votre magasin.
        </p>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button type="button" class="primary" style="background: #16a34a; border-color: #16a34a; font-weight: 600;" @click="executeDeleteSale(true)">
            🔄 Supprimer ET Réintégrer les articles au stock (Retour)
          </button>
          <button type="button" class="quiet danger" style="color: #ef4444; border: 1px solid #fee2e2; font-weight: 600;" @click="executeDeleteSale(false)">
            🗑️ Supprimer la commande sans toucher au stock
          </button>
          <button type="button" class="quiet" style="margin-top: 4px;" @click="deleteSaleModal = null">
            Annuler
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
