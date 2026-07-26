<script setup>
import { computed, onMounted, ref } from 'vue'
import { useShop } from './stores/shop'
import { LayoutDashboard, Package, ShoppingCart, Truck, Users, Factory, WalletCards, BarChart3, Settings, Search, Plus, Minus, X, ChevronRight, Wifi, WifiOff, Bell, Menu, MoreHorizontal, ArrowUpRight, AlertTriangle, Trash2, Printer, FileText, Bot, Sparkles, Lock, LogOut, KeyRound, Eye, EyeOff, MessageCircle, Send, TrendingUp, Calendar, Download, ChevronDown } from 'lucide-vue-next'
import { createOzonParcel, getOzonParcelInfo } from './services/ozon'
import { OZON_CITIES } from './services/ozonCities'

// Order state (declared first so city helpers can safely reference order.value)
const order = ref({
  type: 'online', // 'online' | 'offline'
  discount: 0,
  shipping: 0,
  paidAmount: null,
  customer: { name: '', phone: '', cityId: '', city: '', address: '', note: '' },
  sendOzon: true,
  ozon: {
    customerId: localStorage.getItem('ozon-customer-id') || import.meta.env.VITE_OZON_CUSTOMER_ID || '89381',
    apiKey: localStorage.getItem('ozon-api-key') || import.meta.env.VITE_OZON_API_KEY || 'db4545-4ede23-78ef27-868f4a-fa5359',
    declaredValue: '',
    open: '1',
    fragile: '0',
    replace: '0'
  }
})

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

const SESSION_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes
const authenticated = ref(false)
const loginPassword = ref('')
const loginError = ref('')
const showPass = ref(false)
const masterPin = ref(localStorage.getItem('alpha-pin') || 'ALPHASHOP2026@@')

function checkAuthSession() {
  const auth = localStorage.getItem('alpha-auth') === 'true'
  const authTimeStr = localStorage.getItem('alpha-auth-time')
  const authTime = authTimeStr ? parseInt(authTimeStr, 10) : 0
  const now = Date.now()

  if (auth) {
    if (!authTime || (now - authTime) >= SESSION_TIMEOUT_MS) {
      authenticated.value = false
      localStorage.removeItem('alpha-auth')
      localStorage.removeItem('alpha-auth-time')
      loginError.value = 'Session expirée (10 min). Veuillez vous reconnecter.'
      if (authTime) {
        shop.notify('Session expirée après 10 minutes. Reconnexion requise.')
      }
      return false
    }
    authenticated.value = true
    return true
  }
  authenticated.value = false
  return false
}

// Initial evaluation
authenticated.value = checkAuthSession()

function handleLogin() {
  if (loginPassword.value.trim() === masterPin.value) {
    authenticated.value = true
    localStorage.setItem('alpha-auth', 'true')
    localStorage.setItem('alpha-auth-time', Date.now().toString())
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
  localStorage.removeItem('alpha-auth-time')
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


function generateAutoBarcode() {
  return '3' + Math.floor(10000000 + Math.random() * 90000000)
}

function generateAutoSku(name = '') {
  const prefix = name.trim().length >= 2
    ? name.trim().slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'PRD')
    : 'PRD'
  const randomNum = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}-${randomNum}`
}

function detectAutoCategory(name = '') {
  const text = name.toLowerCase()
  if (/t-?shirt|polo|hoodie|sweat|pantalon|jean|veste|chemise|robe|jupe|clt|textile/i.test(text)) return 'Textile'
  if (/casquette|chapeau|sac|portefeuille|ceinture|lunette|montre|bijou|accessoire/i.test(text)) return 'Accessoires'
  if (/chaussure|basket|sneaker|botte|claquette/i.test(text)) return 'Chaussures'
  if (/creme|parfum|savon|shampoing|beaute/i.test(text)) return 'Beauté & Cosmétique'
  if (/phone|tel|ecouteur|chargeur|coque|cable|tech|pc/i.test(text)) return 'Électronique'
  return 'Général'
}

const blank = () => {
  const autoBarcode = generateAutoBarcode()
  const autoSku = generateAutoSku()
  return {
    name: '',
    sku: autoSku,
    barcode: autoBarcode,
    category: 'Général',
    brand: 'Alpha',
    price: 0,
    purchasePrice: 0,
    variants: [{ color: 'Noir', size: 'Unique', stock: 0, min: 2, barcode: autoBarcode + '1' }]
  }
}
const draft = ref(blank())

function onProductNameInput() {
  if (!draft.value.id) { // Only auto-generate when creating a new product
    draft.value.category = detectAutoCategory(draft.value.name)
    const newSkuPrefix = draft.value.name.trim().length >= 2
      ? draft.value.name.trim().slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'PRD')
      : 'PRD'
    const numPart = (draft.value.sku && draft.value.sku.includes('-'))
      ? draft.value.sku.split('-')[1]
      : Math.floor(1000 + Math.random() * 9000)
    draft.value.sku = `${newSkuPrefix}-${numPart}`
  }
}

async function removeCurrentProduct() {
  if (!draft.value.id) return
  if (confirm(`Voulez-vous vraiment supprimer le produit "${draft.value.name}" ?`)) {
    await shop.removeProduct(draft.value.id)
    productModal.value = false
  }
}

function setSaleType(type) {
  order.value.type = type
  if (type === 'offline') {
    order.value.sendOzon = false
    order.value.shipping = 0
  } else {
    order.value.sendOzon = true
  }
}

const actualPaidAmount = computed(() => {
  if (order.value.paidAmount === null || order.value.paidAmount === undefined || order.value.paidAmount === '') {
    return orderTotal.value
  }
  return Number(order.value.paidAmount) || 0
})

const remainingBalance = computed(() => {
  return Math.max(0, orderTotal.value - actualPaidAmount.value)
})
const navItems = {
  fr: [
    ['dashboard', "Vue d'ensemble", LayoutDashboard],
    ['products', 'Produits', Package],
    ['pos', 'Point de vente', ShoppingCart],
    ['orders', 'Commandes', Truck],
    ['customers', 'Clients', Users],
    ['suppliers', 'Fournisseurs', Factory],
    ['finance', 'Finance & Trésorerie', WalletCards],
    ['profits', 'Rapport Profits 📈', TrendingUp],
    ['reports', 'Rapports', BarChart3],
    ['settings', 'Réglages', Settings]
  ],
  ar: [
    ['dashboard', 'لوحة التحكم', LayoutDashboard],
    ['products', 'المنتجات', Package],
    ['pos', 'نقطة البيع', ShoppingCart],
    ['orders', 'الطلبيات', Truck],
    ['customers', 'الزبناء', Users],
    ['suppliers', 'الموردين', Factory],
    ['finance', 'المالية والمصاريف', WalletCards],
    ['profits', 'تقرير الأرباح 📈', TrendingUp],
    ['reports', 'التقارير', BarChart3],
    ['settings', 'الإعدادات', Settings]
  ]
}

const nav = computed(() => navItems[shop.language] || navItems.fr)

// --- Real Dynamic Dashboard Sales Performance Chart ---
const chartPeriod = ref('7days') // '7days' | 'month'

const salesPerformanceChart = computed(() => {
  const result = []
  const today = new Date()
  const lang = shop.language || 'fr'

  const frDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  const arDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  const dayNames = lang === 'ar' ? arDays : frDays

  const numDays = chartPeriod.value === 'month' ? 30 : 7
  const validSales = (shop.sales || []).filter(s => s && !s.deleted && s.createdAt)

  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)

    const salesOnDay = validSales.filter(s => {
      const sDate = new Date(s.createdAt).toISOString().slice(0, 10)
      return sDate === dateStr
    })

    const totalRev = salesOnDay.reduce((sum, s) => sum + (Number(s.total) || 0), 0)
    const count = salesOnDay.length

    result.push({
      date: dateStr,
      isToday: dateStr === today.toISOString().slice(0, 10),
      label: chartPeriod.value === 'month' ? `${d.getDate()}/${d.getMonth()+1}` : dayNames[d.getDay()],
      fullDate: d.toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-MA', { weekday: 'short', day: '2-digit', month: '2-digit' }),
      revenue: totalRev,
      salesCount: count
    })
  }

  const maxRev = Math.max(...result.map(r => r.revenue), 100)

  return result.map(r => ({
    ...r,
    heightPct: Math.max(10, Math.round((r.revenue / maxRev) * 100))
  }))
})

// --- Daily Profit Reports State & Calculations ---
const profitPreset = ref('month')
const todayStr = new Date().toISOString().slice(0, 10)
const firstDayOfMonthStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

const profitStartDate = ref(firstDayOfMonthStr)
const profitEndDate = ref(todayStr)
const expandedProfitDate = ref(null)

function setProfitPreset(preset) {
  profitPreset.value = preset
  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  if (preset === 'today') {
    profitStartDate.value = today
    profitEndDate.value = today
  } else if (preset === 'yesterday') {
    const y = new Date(now)
    y.setDate(y.getDate() - 1)
    const yStr = y.toISOString().slice(0, 10)
    profitStartDate.value = yStr
    profitEndDate.value = yStr
  } else if (preset === '7days') {
    const d7 = new Date(now)
    d7.setDate(d7.getDate() - 6)
    profitStartDate.value = d7.toISOString().slice(0, 10)
    profitEndDate.value = today
  } else if (preset === 'month') {
    profitStartDate.value = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    profitEndDate.value = today
  } else if (preset === 'all') {
    profitStartDate.value = ''
    profitEndDate.value = ''
  }
}

function toggleExpandProfitDate(dateStr) {
  if (expandedProfitDate.value === dateStr) {
    expandedProfitDate.value = null
  } else {
    expandedProfitDate.value = dateStr
  }
}

const dailyProfitsReport = computed(() => {
  const map = new Map()

  const validSales = (shop.sales || []).filter(s => s && !s.deleted && s.createdAt)
  validSales.forEach(sale => {
    const dateKey = new Date(sale.createdAt).toISOString().slice(0, 10)

    if (profitStartDate.value && dateKey < profitStartDate.value) return
    if (profitEndDate.value && dateKey > profitEndDate.value) return

    if (!map.has(dateKey)) {
      map.set(dateKey, {
        date: dateKey,
        salesCount: 0,
        itemsCount: 0,
        revenue: 0,
        cogs: 0,
        expenses: 0,
        itemsMap: new Map()
      })
    }

    const dayData = map.get(dateKey)
    dayData.salesCount += 1
    dayData.revenue += Number(sale.total) || 0

    ;(sale.items || []).forEach(item => {
      const q = Number(item.quantity) || 1
      dayData.itemsCount += q

      const product = shop.products.find(p => p.id === item.productId || p.sku === item.sku)
      const costPerUnit = Number(item.purchasePrice || product?.purchasePrice || 0)
      const totalCost = costPerUnit * q
      const pricePerUnit = Number(item.price || 0)
      const totalRev = pricePerUnit * q
      const itemProfit = totalRev - totalCost

      dayData.cogs += totalCost

      const itemKey = `${item.name} (${item.variant || 'Standard'})`
      if (!dayData.itemsMap.has(itemKey)) {
        dayData.itemsMap.set(itemKey, {
          name: item.name,
          variant: item.variant || '',
          qty: 0,
          unitPrice: pricePerUnit,
          unitCost: costPerUnit,
          totalRev: 0,
          totalCost: 0,
          profit: 0
        })
      }
      const prodItem = dayData.itemsMap.get(itemKey)
      prodItem.qty += q
      prodItem.totalRev += totalRev
      prodItem.totalCost += totalCost
      prodItem.profit += itemProfit
    })
  })

  const validExpenses = (shop.expenses || []).filter(e => e && !e.deleted && (e.date || e.createdAt))
  validExpenses.forEach(exp => {
    const dateKey = (exp.date || exp.createdAt).slice(0, 10)

    if (profitStartDate.value && dateKey < profitStartDate.value) return
    if (profitEndDate.value && dateKey > profitEndDate.value) return

    if (!map.has(dateKey)) {
      map.set(dateKey, {
        date: dateKey,
        salesCount: 0,
        itemsCount: 0,
        revenue: 0,
        cogs: 0,
        expenses: 0,
        itemsMap: new Map()
      })
    }

    const dayData = map.get(dateKey)
    dayData.expenses += Number(exp.amount) || 0
  })

  const report = Array.from(map.values()).map(d => {
    const grossProfit = d.revenue - d.cogs
    const netProfit = grossProfit - d.expenses
    const margin = d.revenue > 0 ? ((netProfit / d.revenue) * 100).toFixed(1) : 0
    return {
      ...d,
      grossProfit,
      netProfit,
      margin,
      itemsList: Array.from(d.itemsMap.values())
    }
  })

  return report.sort((a, b) => b.date.localeCompare(a.date))
})

const profitSummary = computed(() => {
  let revenue = 0
  let cogs = 0
  let expenses = 0
  let salesCount = 0
  let itemsCount = 0

  dailyProfitsReport.value.forEach(d => {
    revenue += d.revenue
    cogs += d.cogs
    expenses += d.expenses
    salesCount += d.salesCount
    itemsCount += d.itemsCount
  })

  const grossProfit = revenue - cogs
  const netProfit = grossProfit - expenses
  const margin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : 0

  return { revenue, cogs, expenses, grossProfit, netProfit, margin, salesCount, itemsCount }
})

const topProfitableProducts = computed(() => {
  const prodMap = new Map()

  const validSales = (shop.sales || []).filter(s => s && !s.deleted && s.createdAt)
  validSales.forEach(sale => {
    const dateKey = new Date(sale.createdAt).toISOString().slice(0, 10)
    if (profitStartDate.value && dateKey < profitStartDate.value) return
    if (profitEndDate.value && dateKey > profitEndDate.value) return

    ;(sale.items || []).forEach(item => {
      const q = Number(item.quantity) || 1
      const product = shop.products.find(p => p.id === item.productId || p.sku === item.sku)
      const cost = Number(item.purchasePrice || product?.purchasePrice || 0) * q
      const rev = Number(item.price || 0) * q
      const profit = rev - cost

      const key = item.productId || item.name
      if (!prodMap.has(key)) {
        prodMap.set(key, {
          id: key,
          name: item.name,
          category: product?.category || 'Général',
          qty: 0,
          revenue: 0,
          cost: 0,
          profit: 0
        })
      }
      const entry = prodMap.get(key)
      entry.qty += q
      entry.revenue += rev
      entry.cost += cost
      entry.profit += profit
    })
  })

  return Array.from(prodMap.values())
    .map(p => ({
      ...p,
      margin: p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : 0
    }))
    .sort((a, b) => b.profit - a.profit)
})

function exportProfitsCsv() {
  const rows = [
    'Date;Ventes;Articles;Chiffre d\'Affaires (MAD);Coût d\'Achat (COGS MAD);Dépenses (MAD);Bénéfice Net (MAD);Marge (%)',
    ...dailyProfitsReport.value.map(d =>
      `${d.date};${d.salesCount};${d.itemsCount};${d.revenue};${d.cogs};${d.expenses};${d.netProfit};${d.margin}%`
    )
  ]
  const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `rapport-benefices-${profitStartDate.value || 'debut'}_au_${profitEndDate.value || 'fin'}.csv`
  a.click()
  URL.revokeObjectURL(url)
  shop.notify('Rapport des bénéfices exporté en CSV ✓')
}
const loadList = (key, initial = []) => ref(JSON.parse(localStorage.getItem(key) || JSON.stringify(initial)))
const customerList = loadList('alpha-customers', [])
const supplierList = loadList('alpha-suppliers', [])
const expenseList = loadList('alpha-expenses', [])
const entryModal = ref('')
const entry = ref({})
const settings = ref({ business: localStorage.getItem('alpha-business') || 'Alpha Shop', currency: 'MAD', ozonId: localStorage.getItem('ozon-customer-id') || import.meta.env.VITE_OZON_CUSTOMER_ID || '', ozonKey: localStorage.getItem('ozon-api-key') || import.meta.env.VITE_OZON_API_KEY || '', pin: localStorage.getItem('alpha-pin') || 'ALPHASHOP2026@@' })
const labels = {
  fr: {
    title: `Aujourd'hui`,
    sales: 'Ventes du jour',
    month: 'Ventes du mois',
    stock: 'Stock à surveiller',
    profit: 'Bénéfice estimé',
    profitsTitle: 'Rapport de Profits Journaliers',
    supplierDebtTitle: 'Total Dettes Fournisseurs',
    detteLabel: 'Dette',
    creditLabel: 'Crédit'
  },
  ar: {
    title: 'اليوم',
    sales: 'مبيعات اليوم',
    month: 'مبيعات الشهر',
    stock: 'مخزون منخفض',
    profit: 'الربح المقدر',
    profitsTitle: 'تقرير الأرباح اليومية',
    supplierDebtTitle: 'مجموع ديون الموردين',
    detteLabel: 'دين (كايسالونا)',
    creditLabel: 'سلف (كاندسالوه)'
  }
}
const t = computed(() => labels[shop.language] || labels.fr)
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
function money(n) {
  const num = Number(n)
  if (isNaN(num) || n === null || n === undefined) return '0 MAD'
  return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(num)
}
const EXPENSE_CATEGORIES = ['Loyer (Rent)', 'Salaires', 'Lumière & Eau (Électricité/Eau)', 'Marketing / Pub (Facebook/TikTok)', 'Livraison & Transport', 'Emballage & Fournitures', 'Achat de Stock', 'Autre']

function addEntry(type) {
  entryModal.value = type
  entry.value = type === 'customer'
    ? { name: '', phone: '', city: '', address: '' }
    : type === 'supplier'
      ? { name: '', phone: '', company: '', email: '', totalPurchases: 0, totalPaid: 0 }
      : { category: 'Achat de Stock', supplierId: '', totalInvoice: 0, amount: 0, note: '', date: new Date().toISOString().slice(0, 10) }
}

function editEntry(type, item) {
  entryModal.value = type
  entry.value = JSON.parse(JSON.stringify(item))
}

// Finance Date Range Filter State
const financePreset = ref('month')
const financeStartDate = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10))
const financeEndDate = ref(new Date().toISOString().slice(0, 10))

function setFinancePreset(preset) {
  financePreset.value = preset
  const today = new Date()
  if (preset === 'today') {
    financeStartDate.value = today.toISOString().slice(0, 10)
    financeEndDate.value = today.toISOString().slice(0, 10)
  } else if (preset === 'week') {
    const past = new Date()
    past.setDate(past.getDate() - 7)
    financeStartDate.value = past.toISOString().slice(0, 10)
    financeEndDate.value = today.toISOString().slice(0, 10)
  } else if (preset === 'month') {
    financeStartDate.value = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
    financeEndDate.value = today.toISOString().slice(0, 10)
  } else if (preset === 'all') {
    financeStartDate.value = ''
    financeEndDate.value = ''
  }
}

const filteredFinanceSales = computed(() => {
  return (shop.sales || []).filter(sale => {
    if (!sale || sale.deleted || !sale.createdAt) return false
    const d = new Date(sale.createdAt).toISOString().slice(0, 10)
    if (financeStartDate.value && d < financeStartDate.value) return false
    if (financeEndDate.value && d > financeEndDate.value) return false
    return true
  })
})

const filteredFinanceExpenses = computed(() => {
  return (shop.expenses || []).filter(e => {
    if (!e || e.deleted) return false
    const d = e.date || (e.createdAt ? new Date(e.createdAt).toISOString().slice(0, 10) : '')
    if (financeStartDate.value && d < financeStartDate.value) return false
    if (financeEndDate.value && d > financeEndDate.value) return false
    return true
  }).sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
})

const filteredFinanceSalesTotal = computed(() => {
  return filteredFinanceSales.value.reduce((sum, s) => sum + (Number(s.total) || 0), 0)
})

const filteredFinanceExpensesTotal = computed(() => {
  return filteredFinanceExpenses.value.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
})

const filteredFinanceNet = computed(() => {
  return filteredFinanceSalesTotal.value - filteredFinanceExpensesTotal.value
})

// Supplier Debt Settlement Modal State & Methods
const paySupplierModal = ref(null)
const paySupplierAmount = ref(0)
const paySupplierAddExpense = ref(true)

function openPaySupplierDebt(supplier) {
  paySupplierModal.value = supplier
  const owed = Math.max(0, (Number(supplier.totalPurchases) || 0) - (Number(supplier.totalPaid) || 0))
  paySupplierAmount.value = owed
  paySupplierAddExpense.value = true
}

async function executePaySupplierDebt() {
  if (!paySupplierModal.value) return
  await shop.paySupplierDebt(paySupplierModal.value.id, paySupplierAmount.value, paySupplierAddExpense.value)
  paySupplierModal.value = null
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

async function submitOrder() {
  const c = order.value.customer, o = order.value.ozon
  if (order.value.sendOzon && order.value.type === 'online' && (!c.name || !c.phone || (!c.cityId && !c.city) || !c.address)) {
    return shop.notify('Veuillez renseigner le nom, téléphone, ville et adresse du client')
  }
  submitting.value = true
  try {
    const sale = await shop.checkout(payment.value, {
      discount: order.value.discount,
      shipping: order.value.shipping,
      paidAmount: actualPaidAmount.value,
      remainingBalance: remainingBalance.value,
      saleType: order.value.type,
      customer: {
        ...c,
        name: c.name || (order.value.type === 'offline' ? 'Vente Comptoir' : '')
      }
    })
    if (sale && order.value.sendOzon && order.value.type === 'online') {
      localStorage.setItem('ozon-customer-id', o.customerId)
      localStorage.setItem('ozon-api-key', o.apiKey)
      try {
        let cityIdParam = String(c.cityId || '').trim()
        const query = String(c.city || '').trim().toLowerCase()

        if (query) {
          const match = OZON_CITIES.find(city => city.name.toLowerCase() === query || city.name.toLowerCase().includes(query))
          if (match) cityIdParam = String(match.id)
        }
        if (!cityIdParam || cityIdParam === '1' || cityIdParam === '0') {
          cityIdParam = '2165'
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
      order.value = {
        type: 'online',
        discount: 0,
        shipping: 0,
        paidAmount: null,
        customer: { name: '', phone: '', cityId: '', city: '', address: '', note: '' },
        sendOzon: true,
        ozon: order.value.ozon
      }
      showInvoice(sale)
    }
  } finally {
    submitting.value = false
  }
}
async function verifyShipment(sale) { try { const result = await getOzonParcelInfo({ customerId: settings.value.ozonId, apiKey: settings.value.ozonKey, trackingNumber: sale.shipment?.tracking }); await shop.attachShipment(sale.id, { tracking: result['TRACKING-NUMBER'] || sale.shipment.tracking, city: result.CITY_NAME, status: result.STATUS || 'verified', response: result }); shop.notify(`Colis vérifié : ${result['TRACKING-NUMBER'] || sale.shipment.tracking}`) } catch (error) { shop.notify(`Vérification Ozon impossible : ${error.message}`) } }
onMounted(async () => {
  checkAuthSession()
  setInterval(() => {
    if (authenticated.value) {
      checkAuthSession()
    }
  }, 10000)

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
          <article>
            <small>{{t.sales}}</small>
            <strong>{{money(shop.todaySales)}}</strong>
            <em><ArrowUpRight :size="14"/> {{ shop.language === 'ar' ? 'تحديث حي' : 'En direct' }}</em>
          </article>
          <article>
            <small>{{t.month}}</small>
            <strong>{{money(shop.monthSales)}}</strong>
            <em><ArrowUpRight :size="14"/> {{ shop.language === 'ar' ? 'هذا الشهر' : 'Ce mois-ci' }}</em>
          </article>
          <article>
            <small>{{t.profit}}</small>
            <strong :style="{ color: shop.netProfit >= 0 ? '#16a34a' : '#dc2626' }">{{money(shop.netProfit)}}</strong>
            <em><ArrowUpRight :size="14"/> {{ shop.language === 'ar' ? 'الصافي الحقيقي' : 'Profit Net Réel' }}</em>
          </article>
          <article style="cursor:pointer;" @click="shop.active='products'">
            <small>{{t.stock}}</small>
            <strong>{{shop.lowStock.length}}</strong>
            <em class="warning"><AlertTriangle :size="14"/> {{ shop.language === 'ar' ? 'منتج يتطلب التزود' : 'À réapprovisionner' }}</em>
          </article>
        </div>
        <div class="dashboard-grid">
          <article class="panel chart">
            <div class="panel-title">
              <div>
                <h2>{{ shop.language === 'ar' ? 'أداء المبيعات الحقيقي' : 'Performance des ventes' }}</h2>
                <p>{{ chartPeriod === 'month' ? (shop.language === 'ar' ? 'آخر 30 يوم' : '30 derniers jours') : (shop.language === 'ar' ? 'آخر 7 أيام' : '7 derniers jours') }}</p>
              </div>
              <div style="display:flex; gap:6px;">
                <button
                  type="button"
                  class="quiet"
                  :style="chartPeriod === '7days' ? 'background:#09090b; color:#fff; border-color:#09090b;' : ''"
                  @click="chartPeriod = '7days'"
                >
                  {{ shop.language === 'ar' ? '7 أيام' : '7 jours' }}
                </button>
                <button
                  type="button"
                  class="quiet"
                  :style="chartPeriod === 'month' ? 'background:#09090b; color:#fff; border-color:#09090b;' : ''"
                  @click="chartPeriod = 'month'"
                >
                  {{ shop.language === 'ar' ? '30 يوم' : '30 jours' }}
                </button>
              </div>
            </div>
            <div class="bars">
              <i
                v-for="item in salesPerformanceChart"
                :key="item.date"
                :style="{ height: item.heightPct + '%' }"
                :class="{ active: item.isToday, 'has-sales': item.revenue > 0 }"
              >
                <!-- Tooltip on Hover -->
                <div class="bar-tooltip">
                  <b>{{ item.fullDate }}</b>
                  <span>{{ money(item.revenue) }}</span>
                  <small>{{ item.salesCount }} {{ shop.language === 'ar' ? 'مبيعة' : 'vente(s)' }}</small>
                </div>
                <span>{{ item.label }}</span>
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
              <div v-for="line in shop.cart" :key="line.variantId" class="cart-line-item">
                <div class="cart-line-info">
                  <b>{{line.name}}</b>
                  <small v-if="line.variant" style="display:block; color:#71717a;">{{line.variant}}</small>
                  <div class="cart-line-price-edit">
                    <span>Prix unitaire:</span>
                    <input
                      type="number"
                      min="0"
                      v-model.number="line.price"
                      class="inline-price-input"
                      title="Modifier le prix de vente de cet article"
                    /> MAD
                  </div>
                </div>
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
              <span><b>{{sale.number || '—'}}</b><small>{{sale.createdAt ? new Date(sale.createdAt).toLocaleString('fr-MA') : '—'}}</small></span>
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

        <!-- Header Debt Metric Card for Suppliers -->
        <div v-if="shop.active === 'suppliers'" class="metrics" style="margin-bottom: 20px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));">
          <article class="profit-card highlight">
            <small>Total Dettes Fournisseurs (ديون الموردين / شحال كايسالونا)</small>
            <strong class="text-orange" style="font-size: 22px;">{{ money(shop.totalSupplierDebt) }}</strong>
            <em>Montant total restant à régler aux fournisseurs de stock</em>
          </article>
        </div>

        <div class="panel directory">
          <div v-if="(shop.active==='customers' ? (shop.customers || []) : (shop.suppliers || [])).length" class="table">
            <div v-for="person in (shop.active==='customers' ? (shop.customers || []) : (shop.suppliers || []))" :key="person.id || person.name">
              <span>
                <b>{{person.name}}</b>
                <small>{{person.phone || person.email || 'Aucun contact'}}</small>
              </span>
              <span>{{person.company || person.city || '—'}}</span>
              
              <template v-if="shop.active === 'suppliers'">
                <div style="display:flex; flex-direction:column; gap:2px; font-size:12px;">
                  <span>Achats Stock: <b>{{money(person.totalPurchases || 0)}}</b></span>
                  <span style="color:#16a34a;">Montant Payé: {{money(person.totalPaid || 0)}}</span>
                </div>
                <div>
                  <span
                    v-if="(Number(person.totalPurchases || 0) - Number(person.totalPaid || 0)) > 0"
                    class="credit-warning-badge danger"
                    style="display:inline-block; font-size:11px; padding:4px 8px;"
                  >
                    🔴 Dette: {{ money(Number(person.totalPurchases || 0) - Number(person.totalPaid || 0)) }} (كايسالونا)
                  </span>
                  <span
                    v-else
                    class="credit-warning-badge success"
                    style="display:inline-block; font-size:11px; padding:4px 8px;"
                  >
                    🟢 Solde Réglé (100%)
                  </span>
                </div>
              </template>
              <template v-else>
                <strong>{{person.address || person.email || '—'}}</strong>
              </template>

              <div style="display:flex; gap:6px; align-items:center;">
                <button v-if="shop.active === 'suppliers' && (Number(person.totalPurchases || 0) - Number(person.totalPaid || 0)) > 0" class="quiet" style="color:#d97706; font-weight:600; font-size:12px; border:1px solid #fef08a; background:#fefce8; padding:4px 8px; border-radius:6px;" @click.stop="openPaySupplierDebt(person)" title="Régler la dette fournisseur">
                  💰 Régler
                </button>
                <button v-if="person.phone" class="icon" style="color:#16a34a;" title="Contacter sur WhatsApp" @click.stop="sendWhatsAppCustomerMessage(person)">
                  <MessageCircle :size="16"/>
                </button>
                <button class="icon" style="color:#2563eb" title="Modifier" @click.stop="editEntry(shop.active==='customers'?'customer':'supplier', person)"><MoreHorizontal :size="15"/></button>
                <button class="icon" style="color:#dc2626" title="Supprimer" @click.stop="deleteEntry(shop.active==='customers'?'customer':'supplier', person.id)"><Trash2 :size="15"/></button>
              </div>
            </div>
          </div>
          <div v-else class="empty">Aucun {{shop.active==='customers'?'client':'fournisseur'}} enregistré pour le moment.</div>
        </div>
      </section>

      <!-- Finance View -->
      <section v-else-if="shop.active==='finance'" class="page">
        <div class="page-head">
          <div><p class="eyebrow">TRÉSORERIE & DÉPENSES</p><h1>Finance & Trésorerie</h1></div>
          <button class="primary" @click="addEntry('expense')"><Plus :size="17"/> Ajouter une dépense</button>
        </div>

        <!-- Date Range Filter Toolbar for Finance -->
        <div class="panel profit-filter-toolbar" style="margin-bottom: 20px;">
          <div class="preset-buttons">
            <span class="eyebrow" style="margin-right: 8px;">PÉRIODE :</span>
            <button type="button" class="preset-btn" :class="{ active: financePreset === 'today' }" @click="setFinancePreset('today')">Aujourd'hui</button>
            <button type="button" class="preset-btn" :class="{ active: financePreset === 'week' }" @click="setFinancePreset('week')">7 Derniers Jours</button>
            <button type="button" class="preset-btn" :class="{ active: financePreset === 'month' }" @click="setFinancePreset('month')">Ce Mois-ci</button>
            <button type="button" class="preset-btn" :class="{ active: financePreset === 'all' }" @click="setFinancePreset('all')">Tout</button>
          </div>
          <div class="date-pickers">
            <label>
              <span>Date Début:</span>
              <input type="date" v-model="financeStartDate" @change="financePreset = 'custom'" />
            </label>
            <label>
              <span>Date Fin:</span>
              <input type="date" v-model="financeEndDate" @change="financePreset = 'custom'" />
            </label>
          </div>
        </div>

        <div class="metrics finance-metrics">
          <article><small>Ventes Totales (Encaissements)</small><strong class="text-blue">{{money(filteredFinanceSalesTotal)}}</strong><em>{{filteredFinanceSales.length}} vente(s) sur la période</em></article>
          <article><small>Total Dépenses</small><strong style="color: #dc2626;">{{money(filteredFinanceExpensesTotal)}}</strong><em>{{filteredFinanceExpenses.length}} dépense(s) enregistrée(s)</em></article>
          <article><small>Solde Net (Cashflow Net)</small><strong :style="{ color: filteredFinanceNet >= 0 ? '#16a34a' : '#dc2626' }">{{money(filteredFinanceNet)}}</strong><em>Recettes - Dépenses du filtre</em></article>
          <article style="cursor:pointer;" @click="shop.active='suppliers'"><small>Dettes Fournisseurs (كايسالونا)</small><strong style="color: #ea580c;">{{money(shop.totalSupplierDebt)}}</strong><em style="color:#2563eb; text-decoration:underline;">Voir le détail des fournisseurs →</em></article>
        </div>

        <div class="panel">
          <div class="panel-title">
            <div><h2>Journal des Dépenses</h2><p>Loyer, salaires, électricité, publicité, livraison, achats stock...</p></div>
          </div>
          <div v-if="filteredFinanceExpenses.length" class="table">
            <div v-for="expense in filteredFinanceExpenses" :key="expense.id || expense.category">
              <span>
                <b>{{expense.category}}</b>
                <small v-if="expense.supplierId && shop.suppliers.find(s => s.id === expense.supplierId)" style="display:block; color:#2563eb;">
                  Fournisseur : {{ shop.suppliers.find(s => s.id === expense.supplierId).name }}
                </small>
                <small>{{expense.date}}</small>
              </span>
              <span>
                {{expense.note||'—'}}
                <small v-if="expense.totalInvoice && expense.totalInvoice > expense.amount" style="display:block; color:#dc2626; font-size:11px;">
                  Facture: {{money(expense.totalInvoice)}} · Reste Dû: {{money(expense.totalInvoice - expense.amount)}}
                </small>
              </span>
              <strong style="color: #dc2626;">-{{money(expense.amount)}}</strong>
              <button class="icon" style="color:#dc2626" @click.stop="deleteEntry('expense', expense.id)"><Trash2 :size="15"/></button>
            </div>
          </div>
          <div v-else class="empty">Aucune dépense trouvée pour cette période.</div>
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

      <!-- Daily Profits & Margin Report View -->
      <section v-else-if="shop.active==='profits'" class="page">
        <div class="page-head">
          <div>
            <p class="eyebrow">ADMIN · SUIVI FINANCIER DÉTAILLÉ</p>
            <h1>Rapport de Profits Journaliers (أرباح المبيعات اليومية)</h1>
          </div>
          <button class="primary" @click="exportProfitsCsv">
            <Download :size="17"/> Exporter le rapport CSV
          </button>
        </div>

        <!-- Filter Bar -->
        <div class="profit-filter-card">
          <div class="filter-header">
            <div class="filter-title">
              <Calendar :size="18"/>
              <b>Filtrer par période</b>
            </div>
            <div class="preset-buttons">
              <button
                type="button"
                class="preset-btn"
                :class="{ active: profitPreset === 'today' }"
                @click="setProfitPreset('today')"
              >Aujourd'hui</button>
              <button
                type="button"
                class="preset-btn"
                :class="{ active: profitPreset === 'yesterday' }"
                @click="setProfitPreset('yesterday')"
              >Hier</button>
              <button
                type="button"
                class="preset-btn"
                :class="{ active: profitPreset === '7days' }"
                @click="setProfitPreset('7days')"
              >7 Derniers Jours</button>
              <button
                type="button"
                class="preset-btn"
                :class="{ active: profitPreset === 'month' }"
                @click="setProfitPreset('month')"
              >Ce Mois-ci</button>
              <button
                type="button"
                class="preset-btn"
                :class="{ active: profitPreset === 'all' }"
                @click="setProfitPreset('all')"
              >Tout</button>
            </div>
          </div>
          <div class="date-pickers">
            <label>
              <span>Date Début :</span>
              <input type="date" v-model="profitStartDate" @change="profitPreset = 'custom'" />
            </label>
            <label>
              <span>Date Fin :</span>
              <input type="date" v-model="profitEndDate" @change="profitPreset = 'custom'" />
            </label>
          </div>
        </div>

        <!-- Summary KPI Cards -->
        <div class="metrics profit-metrics">
          <article class="profit-card">
            <small>Chiffre d'Affaires (المبيعات)</small>
            <strong class="text-blue">{{ money(profitSummary.revenue) }}</strong>
            <em>{{ profitSummary.salesCount }} vente(s) · {{ profitSummary.itemsCount }} article(s)</em>
          </article>
          <article class="profit-card">
            <small>Coût d'Achat COGS (التكلفة)</small>
            <strong class="text-orange">{{ money(profitSummary.cogs) }}</strong>
            <em>Prix d'achat des produits vendus</em>
          </article>
          <article class="profit-card">
            <small>Dépenses Totales (المصاريف)</small>
            <strong class="text-gray">{{ money(profitSummary.expenses) }}</strong>
            <em>Dépenses enregistrées sur la période</em>
          </article>
          <article class="profit-card highlight">
            <small>Bénéfice Net Total (الربح الصافي)</small>
            <strong :class="profitSummary.netProfit >= 0 ? 'text-green' : 'text-danger'">
              {{ money(profitSummary.netProfit) }}
            </strong>
            <em class="badge-profit">Marge Nette : {{ profitSummary.margin }} %</em>
          </article>
        </div>

        <!-- Daily Profits Breakdown Table -->
        <div class="panel profit-table-panel">
          <div class="panel-title">
            <div>
              <h2>Rapport Journalier des Profits</h2>
              <p>Détail jour par jour du chiffre d'affaires, des coûts, des dépenses et du bénéfice net</p>
            </div>
          </div>

          <div v-if="dailyProfitsReport.length" class="profit-table">
            <div class="profit-table-head">
              <span>Date</span>
              <span>Ventes</span>
              <span>Articles</span>
              <span>Ventes (MAD)</span>
              <span>Coût Achat (COGS)</span>
              <span>Dépenses (MAD)</span>
              <span>Bénéfice Net (MAD)</span>
              <span>Marge %</span>
              <span>Détails</span>
            </div>

            <template v-for="d in dailyProfitsReport" :key="d.date">
              <div
                class="profit-table-row"
                :class="{ expanded: expandedProfitDate === d.date }"
                @click="toggleExpandProfitDate(d.date)"
              >
                <span class="date-cell">
                  <Calendar :size="15"/>
                  <b>{{ new Date(d.date).toLocaleDateString('fr-MA', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) }}</b>
                </span>
                <span><b>{{ d.salesCount }}</b> vente(s)</span>
                <span>{{ d.itemsCount }} unité(s)</span>
                <span class="font-bold">{{ money(d.revenue) }}</span>
                <span class="text-muted">{{ money(d.cogs) }}</span>
                <span class="text-muted">{{ money(d.expenses) }}</span>
                <span>
                  <strong :class="d.netProfit >= 0 ? 'profit-pill-success' : 'profit-pill-danger'">
                    {{ d.netProfit >= 0 ? '+' : '' }}{{ money(d.netProfit) }}
                  </strong>
                </span>
                <span><b>{{ d.margin }} %</b></span>
                <button class="icon quiet">
                  <ChevronDown :size="16" :class="{ rotate180: expandedProfitDate === d.date }" />
                </button>
              </div>

              <!-- Expanded Itemized Products Breakdown -->
              <div v-if="expandedProfitDate === d.date" class="profit-detail-drawer">
                <div class="detail-drawer-head">
                  <b>📦 Produits vendus le {{ new Date(d.date).toLocaleDateString('fr-MA') }}</b>
                </div>
                <table class="detail-products-table">
                  <thead>
                    <tr>
                      <th>Produit & Variante</th>
                      <th>Quantité</th>
                      <th>Prix Vente Unitaire</th>
                      <th>Coût Achat Unitaire</th>
                      <th>Chiffre d'Affaires</th>
                      <th>Coût Total</th>
                      <th>Bénéfice Produit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in d.itemsList" :key="item.name + item.variant">
                      <td><b>{{ item.name }}</b> <small class="text-muted" v-if="item.variant">({{ item.variant }})</small></td>
                      <td><b>{{ item.qty }}</b></td>
                      <td>{{ money(item.unitPrice) }}</td>
                      <td class="text-muted">{{ money(item.unitCost) }}</td>
                      <td>{{ money(item.totalRev) }}</td>
                      <td class="text-muted">{{ money(item.totalCost) }}</td>
                      <td>
                        <b :class="item.profit >= 0 ? 'text-green' : 'text-danger'">
                          {{ item.profit >= 0 ? '+' : '' }}{{ money(item.profit) }}
                        </b>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
          </div>
          <div v-else class="empty">Aucune vente ou donnée trouvée pour cette période.</div>
        </div>

        <!-- Top Profitable Products Ranking -->
        <div class="panel top-products-panel">
          <div class="panel-title">
            <div>
              <h2>Top 10 Produits les Plus Rentables</h2>
              <p>Classement des articles ayant généré le plus de bénéfice net sur la période sélectionnée</p>
            </div>
          </div>
          <div v-if="topProfitableProducts.length" class="table top-products-table">
            <div class="table-head">
              <span>Rang & Produit</span>
              <span>Catégorie</span>
              <span>Quantité Vendue</span>
              <span>Chiffre d'Affaires</span>
              <span>Coût d'Achat</span>
              <span>Bénéfice Généré</span>
              <span>Marge %</span>
            </div>
            <div v-for="(p, index) in topProfitableProducts.slice(0, 10)" :key="p.id" class="top-product-row">
              <span class="rank-cell">
                <b class="rank-badge">#{{ index + 1 }}</b>
                <b>{{ p.name }}</b>
              </span>
              <span>{{ p.category }}</span>
              <span><b>{{ p.qty }}</b> unités</span>
              <span>{{ money(p.revenue) }}</span>
              <span class="text-muted">{{ money(p.cost) }}</span>
              <span>
                <strong class="profit-pill-success">+{{ money(p.profit) }}</strong>
              </span>
              <span><b>{{ p.margin }} %</b></span>
            </div>
          </div>
          <div v-else class="empty">Aucun produit vendu sur cette période.</div>
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
          <div v-for="line in shop.cart" :key="line.variantId" class="cart-line-item">
            <div class="cart-line-info">
              <b>{{line.name}}</b>
              <small v-if="line.variant" style="display:block; color:#71717a;">{{line.variant}}</small>
              <div class="cart-line-price-edit">
                <span>Prix unitaire:</span>
                <input
                  type="number"
                  min="0"
                  v-model.number="line.price"
                  class="inline-price-input"
                  title="Modifier le prix de vente de cet article"
                /> MAD
              </div>
            </div>
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
        <label>Nom du produit<input v-model="draft.name" @input="onProductNameInput" autofocus required placeholder="Ex: T-Shirt Premium Cotton"/></label>
        <div class="two">
          <label>SKU (Auto-généré)
            <div style="display:flex; gap:6px;">
              <input v-model="draft.sku" placeholder="Ex: TSH-8492"/>
              <button type="button" class="quiet" style="padding:4px 8px; font-size:11px; white-space:nowrap;" @click="draft.sku = generateAutoSku(draft.name)" title="Regénérer SKU">⚡ Auto</button>
            </div>
          </label>
          <label>Code-barres (Auto-généré)
            <div style="display:flex; gap:6px;">
              <input v-model="draft.barcode" placeholder="Ex: 30000001"/>
              <button type="button" class="quiet" style="padding:4px 8px; font-size:11px; white-space:nowrap;" @click="draft.barcode = generateAutoBarcode()" title="Regénérer Code-barres">⚡ Auto</button>
            </div>
          </label>
        </div>
        <div class="two">
          <label>Catégorie (Auto-détectée)
            <input v-model="draft.category" list="category-suggestions" placeholder="Ex: Textile"/>
            <datalist id="category-suggestions">
              <option v-for="cat in Array.from(new Set(['Textile', 'Accessoires', 'Chaussures', 'Beauté & Cosmétique', 'Électronique', 'Général', ...shop.products.map(p => p.category)]))" :key="cat" :value="cat" />
            </datalist>
          </label>
          <label>Marque<input v-model="draft.brand" placeholder="Ex: Alpha"/></label>
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
          <div><p class="eyebrow">FINALISER LA COMMANDE</p><h2>Paiement & type de vente</h2></div>
          <button type="button" class="icon" @click="checkoutModal=false"><X/></button>
        </div>

        <!-- Mode de Vente: Online vs Sur Place / Offline -->
        <div class="sale-type-selector">
          <label class="eyebrow" style="margin-bottom:8px; display:block;">TYPE DE VENTE</label>
          <div class="sale-type-buttons">
            <button
              type="button"
              class="sale-type-btn"
              :class="{ active: order.type === 'online' }"
              @click="setSaleType('online')"
            >
              🌐 Vente en Ligne (Ozon Express / Livraison)
            </button>
            <button
              type="button"
              class="sale-type-btn"
              :class="{ active: order.type === 'offline' }"
              @click="setSaleType('offline')"
            >
              🏪 Client au Magasin (Sur Place / Direct)
            </button>
          </div>
        </div>

        <div class="checkout-summary">
          <span>Sous-total <b>{{money(shop.cartTotal)}}</b></span>
          <span>Total à payer <strong>{{money(orderTotal)}}</strong></span>
        </div>

        <!-- Articles au Panier & Prix Vente Modifiable -->
        <div class="checkout-items-preview">
          <label class="eyebrow" style="margin-bottom:8px; display:block;">PRIX DE VENTE PAR ARTICLE (NÉGOCIABLE / MODIFIABLE)</label>
          <div v-for="line in shop.cart" :key="line.variantId" class="checkout-item-row">
            <span>
              <b>{{line.name}}</b> <small v-if="line.variant">({{line.variant}})</small>
              <small style="display:block; color:#6b7280;">Qté: {{line.quantity}} · Total: <b>{{money(line.price * line.quantity)}}</b></small>
            </span>
            <div class="inline-price-box">
              <span style="font-size:11px; color:#6b7280;">Prix unitaire:</span>
              <input
                type="number"
                v-model.number="line.price"
                min="0"
                class="inline-price-input"
                title="Modifier le prix de vente pour cet article"
              /> MAD
            </div>
          </div>
        </div>

        <div class="two">
          <label>Réduction (MAD)<input v-model.number="order.discount" type="number" min="0"/></label>
          <label v-if="order.type === 'online'">Prix de livraison (MAD)<input v-model.number="order.shipping" type="number" min="0"/></label>
        </div>

        <!-- Section Règlement & Crédit Client -->
        <div class="payment-credit-card">
          <div class="two">
            <label>Montant Payé par le Client (MAD)
              <input
                type="number"
                v-model.number="order.paidAmount"
                :placeholder="orderTotal.toString()"
                min="0"
              />
            </label>
            <label>Reste à payer / Crédit (MAD)
              <input
                type="number"
                :value="remainingBalance"
                readonly
                style="background: #f4f4f5; font-weight: 700;"
                :style="{ color: remainingBalance > 0 ? '#dc2626' : '#16a34a' }"
              />
            </label>
          </div>
          <div v-if="remainingBalance > 0" class="credit-warning-badge danger">
            ⚠️ Attention : Le client aura un reste à payer de <b>{{ money(remainingBalance) }}</b> (Crédit / كاندسالوه)
          </div>
          <div v-else class="credit-warning-badge success">
            ✓ Payé en totalité (0 MAD restant)
          </div>
        </div>

        <!-- Customer Information Section -->
        <div class="section-line customer-title">
          <b>Informations du client {{ order.type === 'offline' ? '(Magasin / Sur Place)' : '(Livraison)' }}</b>
          <label v-if="order.type === 'online'" class="switch">
            <input v-model="order.sendOzon" type="checkbox"/> Créer un colis Ozon Express
          </label>
        </div>

        <div class="two">
          <label>Nom complet<input v-model="order.customer.name" :placeholder="order.type==='offline' ? 'Client Comptoir (Optionnel)' : 'Mohammed Alami'" :required="order.sendOzon && order.type === 'online'"/></label>
          <label>Téléphone<input v-model="order.customer.phone" placeholder="0612345678" :required="order.sendOzon && order.type === 'online'"/></label>
        </div>

        <div v-if="order.type === 'online'" class="two">
          <div class="city-picker-container">
            <label>Ville de livraison (Ozon Express)
              <input
                v-model="order.customer.city"
                placeholder="Tapez votre ville (Ex: Casablanca, Rabat...)"
                @input="onCityInput"
                @focus="citySearchOpen = true"
                @blur="setTimeout(() => { citySearchOpen = false }, 250)"
                :required="order.sendOzon && order.type === 'online'"
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
          <label>Adresse complète<input v-model="order.customer.address" placeholder="123 Rue Hassan II, Quartier Maarif" :required="order.sendOzon && order.type === 'online'"/></label>
        </div>
        <label v-if="order.type === 'online'">Note de livraison<input v-model="order.customer.note" placeholder="Appeler avant livraison"/></label>

        <div v-if="order.sendOzon && order.type === 'online'" class="ozon-settings">
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
          <button class="primary" :disabled="submitting">{{submitting?'Enregistrement…':(order.sendOzon && order.type==='online')?'Créer la vente et le colis':'Finaliser la vente'}}</button>
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
          <label>Nom du fournisseur<input v-model="entry.name" required placeholder="Ex: Grossiste Hassan"/></label>
          <div class="two">
            <label>Téléphone<input v-model="entry.phone" placeholder="0612345678"/></label>
            <label>Société / Entreprise<input v-model="entry.company" placeholder="Ex: SARL Import Express"/></label>
          </div>
          <label>Email<input v-model="entry.email" type="email" placeholder="contact@fournisseur.com"/></label>
          <div class="two" style="margin-top:10px;">
            <label>Montant Total des Achats / Stock (MAD)
              <input v-model.number="entry.totalPurchases" type="number" min="0" placeholder="Ex: 5000"/>
            </label>
            <label>Montant Réglé / Payé (MAD)
              <input v-model.number="entry.totalPaid" type="number" min="0" placeholder="Ex: 3000"/>
            </label>
          </div>
          <div v-if="(Number(entry.totalPurchases || 0) - Number(entry.totalPaid || 0)) > 0" class="credit-warning-badge danger" style="margin-top:8px;">
            ⚠️ Reste Dû / Dette à payer : <b>{{ money(Number(entry.totalPurchases || 0) - Number(entry.totalPaid || 0)) }}</b> (كايسالونا)
          </div>
        </template>
        <template v-else>
          <div class="two">
            <label>Catégorie de Dépense
              <select v-model="entry.category" required>
                <option v-for="cat in EXPENSE_CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </label>
            <label>Montant Payé / Réglé (MAD)
              <input v-model.number="entry.amount" type="number" min="0" required placeholder="Ex: 2000"/>
            </label>
          </div>

          <!-- Section Spéciale : Achat de Stock chez Fournisseur -->
          <div v-if="entry.category === 'Achat de Stock'" class="payment-credit-card" style="margin: 12px 0 16px; background:#fafafa; border:1px solid #e4e4e7; padding:12px; border-radius:8px;">
            <p class="eyebrow" style="color:#2563eb; margin-bottom:8px;">DÉTAILS ACHAT STOCK & FOURNISSEUR</p>
            <label style="display:block; margin-bottom:10px;">
              <span style="font-weight:600; font-size:12px; margin-bottom:4px; display:block;">Sélectionner le Fournisseur (المورد)</span>
              <select v-model="entry.supplierId" style="width:100%; padding:8px; border-radius:6px; border:1px solid #cbd5e1;">
                <option value="">-- Fournisseur Occasionnel / Sans Fiche --</option>
                <option v-for="s in shop.suppliers" :key="s.id" :value="s.id">
                  {{ s.name }} {{ s.company ? '(' + s.company + ')' : '' }} — Dette Actuelle: {{ money(Number(s.totalPurchases || 0) - Number(s.totalPaid || 0)) }}
                </option>
              </select>
            </label>

            <div class="two">
              <label>Montant Total Facture Stock (MAD)
                <input
                  v-model.number="entry.totalInvoice"
                  type="number"
                  min="0"
                  :placeholder="(entry.amount || 0).toString()"
                />
              </label>
              <label>Reste Dû / Dette Générée (MAD)
                <input
                  type="text"
                  readonly
                  :value="money(Math.max(0, (Number(entry.totalInvoice || entry.amount || 0)) - (Number(entry.amount) || 0)))"
                  style="background:#f1f5f9; font-weight:700; color:#dc2626;"
                />
              </label>
            </div>

            <div
              v-if="entry.supplierId"
              class="credit-warning-badge"
              :class="(Number(entry.totalInvoice || entry.amount || 0) - Number(entry.amount || 0)) > 0 ? 'danger' : 'success'"
              style="margin-top:8px;"
            >
              <span v-if="(Number(entry.totalInvoice || entry.amount || 0) - Number(entry.amount || 0)) > 0">
                🔴 Le fournisseur aura un reste à payer de <b>{{ money((Number(entry.totalInvoice || entry.amount || 0)) - (Number(entry.amount) || 0)) }}</b> (كايسالونا)
              </span>
              <span v-else>
                🟢 Facture réglée à 100% (0 MAD كايسالنا)
              </span>
            </div>
          </div>

          <div class="two">
            <label>Date<input v-model="entry.date" type="date"/></label>
            <label>Note / Description<input v-model="entry.note" placeholder="Ex: Loyer du mois, Pub Facebook, etc."/></label>
          </div>
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
        </div>
      </div>
    </div>

    <!-- Pay Supplier Debt Modal -->
    <div v-if="paySupplierModal" class="overlay" @click.self="paySupplierModal = null">
      <div class="modal card" style="max-width: 480px; width: 100%; padding: 24px; background: #fff; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
        <div class="modal-head" style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <p class="eyebrow" style="color:#d97706;">RÈGLEMENT DE DETTE (تأدية الدين)</p>
            <h2 style="margin: 0; font-size: 18px;">Fournisseur: {{ paySupplierModal.name }}</h2>
          </div>
          <button type="button" class="icon" @click="paySupplierModal = null"><X :size="18"/></button>
        </div>
        <form @submit.prevent="executePaySupplierDebt">
          <div style="background:#fefce8; border:1px solid #fef08a; border-radius:8px; padding:12px; margin-bottom:16px; font-size:13px; color:#854d0e;">
            Dette actuelle : <b>{{ money(Number(paySupplierModal.totalPurchases || 0) - Number(paySupplierModal.totalPaid || 0)) }}</b> (كايسالونا)
          </div>
          <label style="display:block; margin-bottom:12px;">
            <span style="font-weight: 600; font-size: 13px; margin-bottom: 6px; display: block;">Montant à verser / régler (MAD)</span>
            <input v-model.number="paySupplierAmount" type="number" min="1" required style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #ddd; font-weight: 700; font-size: 16px; color:#16a34a;"/>
          </label>
          <label class="switch" style="display:flex; align-items:center; gap:8px; margin-bottom:16px; font-size:13px; cursor:pointer;">
            <input v-model="paySupplierAddExpense" type="checkbox" />
            <span>Enregistrer ce règlement comme dépense f-Finance (Achat Stock)</span>
          </label>
          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
            <button type="button" class="quiet" @click="paySupplierModal = null">Annuler</button>
            <button type="submit" class="primary" style="background:#16a34a; border-color:#16a34a;">Confirmer le règlement ✓</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
