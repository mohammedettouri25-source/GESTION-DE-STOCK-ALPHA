<script setup>
import { computed, onMounted, ref } from 'vue'
import { useShop } from './stores/shop'
import { LayoutDashboard, Package, ShoppingCart, Truck, Users, Factory, WalletCards, BarChart3, Settings, Search, Plus, Minus, X, ChevronRight, Wifi, WifiOff, Bell, Menu, MoreHorizontal, ArrowUpRight, AlertTriangle, Trash2 } from 'lucide-vue-next'
import { createOzonParcel, getOzonParcelInfo } from './services/ozon'
import { OZON_CITIES } from './services/ozonCities'

function onCitySelect() {
  const match = OZON_CITIES.find(c => String(c.id) === String(order.value.customer.cityId))
  if (match) {
    order.value.customer.city = match.name
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
const settings = ref({ business: localStorage.getItem('alpha-business') || 'Alpha Shop', currency: 'MAD', ozonId: localStorage.getItem('ozon-customer-id') || import.meta.env.VITE_OZON_CUSTOMER_ID || '', ozonKey: localStorage.getItem('ozon-api-key') || import.meta.env.VITE_OZON_API_KEY || '' })
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
function saveSettings() { localStorage.setItem('alpha-business', settings.value.business); localStorage.setItem('ozon-customer-id', settings.value.ozonId); localStorage.setItem('ozon-api-key', settings.value.ozonKey); shop.notify('Réglages enregistrés') }
function exportSales() { const rows = ['Numéro;Date;Total;Paiement;Client', ...shop.sales.map(s => `${s.number};${new Date(s.createdAt).toLocaleDateString('fr-MA')};${s.total};${s.payment};${s.customer?.name||'Comptoir'}`)]; const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })); const a = document.createElement('a'); a.href = url; a.download = `rapport-ventes-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url) }
function openCheckout() { if (!shop.cart.length) return shop.notify('Ajoutez au moins un article au panier'); mobileCartSheet.value = false; checkoutModal.value = true }
const orderTotal = computed(() => Math.max(0, shop.cartTotal - (Number(order.value.discount) || 0) + (Number(order.value.shipping) || 0)))

// Bug fix: submitOrder now uses finally to always unblock the button, and resets order after success
async function submitOrder() {
  const c = order.value.customer, o = order.value.ozon
  if (order.value.sendOzon && (!c.name || !c.phone || !c.cityId || !c.address)) return shop.notify('Complétez le client et son adresse')
  submitting.value = true
  try {
    const sale = await shop.checkout(payment.value, { discount: order.value.discount, shipping: order.value.shipping, customer: c })
    if (sale && order.value.sendOzon) {
      localStorage.setItem('ozon-customer-id', o.customerId)
      localStorage.setItem('ozon-api-key', o.apiKey)
      try {
        const cityParam = c.city || c.cityId || 'Casablanca'
        const validId = (o.customerId && /^\d+$/.test(o.customerId.trim())) ? o.customerId.trim() : (import.meta.env.VITE_OZON_CUSTOMER_ID || '89381')
        const validKey = (o.apiKey && o.apiKey.length > 5 && !o.apiKey.includes(' ')) ? o.apiKey.trim() : (import.meta.env.VITE_OZON_API_KEY || 'db4545-4ede23-78ef27-868f4a-fa5359')
        const response = await createOzonParcel({
          customerId: validId,
          apiKey: validKey,
          parcel: {
            'parcel-receiver': c.name,
            'parcel-phone': c.phone,
            'parcel-city': cityParam,
            'parcel-address': c.address,
            'parcel-note': c.note || 'Commande POS',
            'parcel-price': sale.total,
            'parcel-declared-value': o.declaredValue || sale.total,
            'parcel-nature': 'Commande ' + sale.number,
            'parcel-stock': 0,
            'parcel-open': o.open || '1',
            'parcel-fragile': o.fragile || '0',
            'parcel-replace': o.replace || '0',
            products: JSON.stringify(sale.items.map(i => ({ ref: i.sku || i.productId, qnty: i.quantity })))
          }
        })
        const tracking = response['TRACKING-NUMBER'] || response.tracking || 'Ozon Express'
        await shop.attachShipment(sale.id, { tracking, city: response.CITY_NAME || cityParam, status: 'created', response })
        shop.notify(`Colis créé Ozon Express : ${tracking}`)
      } catch (error) {
        console.error('Ozon creation error:', error)
        shop.notify(`Vente créée — Erreur Ozon : ${error.message}`)
      }
    }
    if (sale) {
      checkoutModal.value = false
      // Reset order form after successful checkout
      order.value = { discount: 0, shipping: 0, customer: { name: '', phone: '', cityId: '', city: '', address: '', note: '' }, sendOzon: true, ozon: order.value.ozon }
    }
  } finally {
    submitting.value = false
  }
}
async function verifyShipment(sale) { try { const result = await getOzonParcelInfo({ customerId: settings.value.ozonId, apiKey: settings.value.ozonKey, trackingNumber: sale.shipment?.tracking }); await shop.attachShipment(sale.id, { tracking: result['TRACKING-NUMBER'] || sale.shipment.tracking, city: result.CITY_NAME, status: result.STATUS || 'verified', response: result }); shop.notify(`Colis vérifié : ${result['TRACKING-NUMBER'] || sale.shipment.tracking}`) } catch (error) { shop.notify(`Vérification Ozon impossible : ${error.message}`) } }
onMounted(() => shop.init())
</script>

<template>
  <div class="shell" :class="{arabic:shop.language==='ar'}">
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
        <div class="avatar">
          <b>MA</b>
          <span>Mohamed A.<small>Propriétaire</small></span>
          <MoreHorizontal :size="17"/>
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
          <button class="icon"><Bell :size="19"/></button>
          <button class="icon" @click="shop.active='settings'"><Settings :size="19"/></button>
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
          <button class="primary" @click="edit()"><Plus :size="17"/> Ajouter un produit</button>
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
              <button v-if="sale.shipment?.tracking" class="quiet" @click="verifyShipment(sale)">Vérifier Ozon</button>
              <em v-else>Confirmée</em>
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
          <div v-if="(shop.active==='customers'?shop.customers:shop.suppliers).length" class="table">
            <div v-for="person in (shop.active==='customers'?shop.customers:shop.suppliers)" :key="person.id">
              <span><b>{{person.name}}</b><small>{{person.phone||person.email||'Aucun contact'}}</small></span>
              <span>{{person.city||person.company||'—'}}</span>
              <strong>{{person.address||person.email||'—'}}</strong>
              <button class="icon" style="color:#dc2626" @click.stop="deleteEntry(shop.active==='customers'?'customer':'supplier', person.id)"><Trash2 :size="15"/></button>
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
          <div v-if="shop.expenses.length" class="table">
            <div v-for="expense in shop.expenses" :key="expense.id">
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
          <label>Ville Ozon Express
            <select v-model="order.customer.cityId" @change="onCitySelect" :required="order.sendOzon">
              <option value="">-- Choisir une ville Ozon --</option>
              <option v-for="c in OZON_CITIES" :key="c.id" :value="c.id">
                {{ c.name }} (ID: {{ c.id }})
              </option>
            </select>
          </label>
          <label>Ville (Confirmation)<input v-model="order.customer.city" placeholder="Casablanca"/></label>
        </div>
        <label>Adresse complète<input v-model="order.customer.address" placeholder="123 Rue Hassan II, Quartier Maarif" :required="order.sendOzon"/></label>
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
  </div>
</template>
