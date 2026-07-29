import { defineStore } from 'pinia'
import { localDb } from '../lib/db'
import { supabase } from '../lib/supabase'

// Ensure we catch ALL Dexie errors natively without tree-shaking
['products', 'sales', 'customers', 'movements', 'queue'].forEach(t => {
  const table = localDb[t]
  if (!table) return
  const op = table.put.bind(table)
  table.put = async function(i, k) {
    try { return await op(i, k) }
    catch (e) {
      console.error(`🚨 FATAL DEXIE PUT ERROR IN ${t}! Payload:`, i)
      throw new Error(`DEXIE_PUT_ERROR_${t}: ${e.message}`)
    }
  }
  const oa = table.add.bind(table)
  table.add = async function(i, k) {
    try { return await oa(i, k) }
    catch (e) {
      console.error(`🚨 FATAL DEXIE ADD ERROR IN ${t}! Payload:`, i)
      throw new Error(`DEXIE_ADD_ERROR_${t}: ${e.message}`)
    }
  }
  const od = table.delete.bind(table)
  table.delete = async function(k) {
    try { return await od(k) }
    catch (e) {
      console.error(`🚨 FATAL DEXIE DELETE ERROR IN ${t}! Key:`, k)
      throw new Error(`DEXIE_DELETE_ERROR_${t}: ${e.message}`)
    }
  }
})

let realtimeChannel = null

// Anti-tree-shaking deep clone to ensure Vue proxies are fully unwrapped
function cloneDeep(obj) { if (obj === null || typeof obj !== 'object') return obj; if (Array.isArray(obj)) return obj.map(cloneDeep); const res = {}; for (const key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { res[key] = cloneDeep(obj[key]); } } return res; }

const seed = [
  { 
    id: 'b1000000-0000-4000-8000-000000000001', 
    name: 'Chemise Ouverte Streetwear & Tank', 
    sku: 'CH-001', 
    barcode: '3000001', 
    category: 'Chemises', 
    brand: 'Alpha', 
    price: 299, 
    purchasePrice: 140, 
    image: '/hero-slider-2.jpg',
    images: [
      '/hero-slider-2.jpg',
      '/hero-slider-3.jpg',
      '/hero-slider-1.jpg'
    ],
    variants: [
      { id: 'c1000000-0000-4000-8000-000000000001', color: 'Bleu Ciel', size: 'M', stock: 12, min: 3, barcode: '30000011' },
      { id: 'c1000000-0000-4000-8000-000000000002', color: 'Bleu Ciel', size: 'L', stock: 18, min: 3, barcode: '30000012' },
      { id: 'c1000000-0000-4000-8000-000000000003', color: 'Blanc', size: 'XL', stock: 8, min: 3, barcode: '30000013' }
    ] 
  },
  { 
    id: 'b1000000-0000-4000-8000-000000000002', 
    name: 'T-Shirt Heavyweight Brown & Shorts', 
    sku: 'EN-002', 
    barcode: '3000002', 
    category: 'Ensembles', 
    brand: 'Alpha', 
    price: 399, 
    purchasePrice: 180, 
    image: '/hero-slider-1.jpg',
    images: [
      '/hero-slider-1.jpg',
      '/hero-slider-2.jpg'
    ],
    variants: [
      { id: 'c1000000-0000-4000-8000-000000000004', color: 'Marrow Brown', size: 'M', stock: 15, min: 3, barcode: '30000021' },
      { id: 'c1000000-0000-4000-8000-000000000005', color: 'Marrow Brown', size: 'L', stock: 20, min: 3, barcode: '30000022' },
      { id: 'c1000000-0000-4000-8000-000000000006', color: 'Beige', size: 'L', stock: 10, min: 3, barcode: '30000023' }
    ] 
  },
  { 
    id: 'b1000000-0000-4000-8000-000000000003', 
    name: 'Chemise Bleu Oxford & Denim Shorts', 
    sku: 'TS-003', 
    barcode: '3000003', 
    category: 'Chemises', 
    brand: 'Alpha', 
    price: 349, 
    purchasePrice: 150, 
    image: '/hero-slider-3.jpg',
    images: [
      '/hero-slider-3.jpg',
      '/hero-slider-2.jpg'
    ],
    variants: [
      { id: 'c1000000-0000-4000-8000-000000000007', color: 'Bleu Denim', size: 'S', stock: 10, min: 3, barcode: '30000031' },
      { id: 'c1000000-0000-4000-8000-000000000008', color: 'Bleu Denim', size: 'M', stock: 25, min: 3, barcode: '30000032' },
      { id: 'c1000000-0000-4000-8000-000000000009', color: 'Bleu Denim', size: 'L', stock: 14, min: 3, barcode: '30000033' }
    ] 
  },
  { 
    id: 'b1000000-0000-4000-8000-000000000004', 
    name: 'Pantalon Cargo Relaxed Fit Tactical', 
    sku: 'PC-004', 
    barcode: '3000004', 
    category: 'Pantalons & Cargos', 
    brand: 'Alpha', 
    price: 349, 
    purchasePrice: 160, 
    image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=1000&q=80'
    ],
    variants: [
      { id: 'c1000000-0000-4000-8000-000000000010', color: 'Noir Tactical', size: 'M', stock: 12, min: 3, barcode: '30000041' },
      { id: 'c1000000-0000-4000-8000-000000000011', color: 'Khaki Désert', size: 'L', stock: 16, min: 3, barcode: '30000042' }
    ] 
  },
  { 
    id: 'b1000000-0000-4000-8000-000000000005', 
    name: 'Hoodie Oversize Studio 450GSM', 
    sku: 'HD-005', 
    barcode: '3000005', 
    category: 'Jackets & Hoodies', 
    brand: 'Alpha', 
    price: 399, 
    purchasePrice: 180, 
    image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=1000&q=80'
    ],
    variants: [
      { id: 'c1000000-0000-4000-8000-000000000012', color: 'Gris Anthracite', size: 'L', stock: 14, min: 3, barcode: '30000051' },
      { id: 'c1000000-0000-4000-8000-000000000013', color: 'Noir Profond', size: 'XL', stock: 9, min: 3, barcode: '30000052' }
    ] 
  },
  { 
    id: 'b1000000-0000-4000-8000-000000000006', 
    name: 'Casquette Alpha Wolf Minimal', 
    sku: 'CP-006', 
    barcode: '3000006', 
    category: 'Accessoires', 
    brand: 'Alpha', 
    price: 129, 
    purchasePrice: 50, 
    image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=1000&q=80'
    ],
    variants: [
      { id: 'c1000000-0000-4000-8000-000000000014', color: 'Noir', size: 'Unique', stock: 20, min: 3, barcode: '30000061' }
    ] 
  }
]

export const useShop = defineStore('shop', {
  state: () => ({
    products: [],
    sales: [],
    customers: [],
    suppliers: [],
    expenses: [],
    cart: [],
    query: '',
    online: navigator.onLine,
    toast: null,
    language: localStorage.getItem('alpha-lang') || 'fr',
    active: 'dashboard'
  }),

  getters: {
    inventoryValue: s => (s.products || []).reduce((sum, p) => sum + (p.variants || []).reduce((x, v) => x + (Number(v.stock) || 0) * (Number(p.purchasePrice) || 0), 0), 0),
    lowStock: s => (s.products || []).flatMap(p => (p.variants || []).filter(v => (v.stock || 0) <= (v.min || 0)).map(v => ({ ...v, product: p.name, productId: p.id, purchasePrice: p.purchasePrice || 0 }))),
    todaySales: s => (s.sales || []).filter(x => x && !x.deleted && x.createdAt && new Date(x.createdAt).toDateString() === new Date().toDateString()).reduce((n, x) => n + (Number(x.total) || 0), 0),
    monthSales: s => (s.sales || []).filter(x => x && !x.deleted && x.createdAt && new Date(x.createdAt).getMonth() === new Date().getMonth()).reduce((n, x) => n + (Number(x.total) || 0), 0),
    totalExpenses: s => (s.expenses || []).filter(x => x && !x.deleted).reduce((sum, x) => sum + Number(x.amount || 0), 0),
    totalSales: s => (s.sales || []).filter(x => x && !x.deleted).reduce((sum, x) => sum + Number(x.total || 0), 0),
    totalCOGS: s => (s.sales || []).filter(x => x && !x.deleted).reduce((sum, sale) => sum + (sale.items || []).reduce((itemSum, i) => {
      const p = s.products.find(prod => prod.id === i.productId || prod.sku === i.sku)
      const cost = Number(i.purchasePrice || p?.purchasePrice || 0)
      return itemSum + cost * (Number(i.quantity) || 1)
    }, 0), 0),
    grossProfit: s => s.totalSales - s.totalCOGS,
    netProfit: s => s.grossProfit - s.totalExpenses,
    profitMargin: s => s.totalSales ? ((s.netProfit / s.totalSales) * 100).toFixed(1) : 0,
    cartTotal: s => (s.cart || []).reduce((n, x) => n + (Number(x.price) || 0) * (Number(x.quantity) || 0), 0),
    totalSupplierDebt: s => (s.suppliers || []).reduce((sum, sup) => {
      const purchases = Number(sup.totalPurchases) || 0
      const paid = Number(sup.totalPaid) || 0
      return sum + Math.max(0, purchases - paid)
    }, 0),
    totalCustomerDebt: s => (s.customers || []).reduce((sum, c) => {
      const purchases = Number(c.totalPurchases) || 0
      const paid = Number(c.totalPaid) || 0
      return sum + Math.max(0, purchases - paid)
    }, 0)
  },

  actions: {
    async init() {
      // Load local data first for fast startup & auto-clean any corrupted/deleted records
      this.products = await localDb.products.toArray()

      const rawSales = await localDb.sales.toArray()
      const validSales = []
      for (const s of rawSales) {
        if (!s || !s.id || s.deleted || !s.createdAt) {
          await localDb.sales.delete(s.id).catch(() => {})
        } else {
          validSales.push(s)
        }
      }
      this.sales = validSales

      this.customers = await localDb.customers.toArray()
      this.suppliers = await localDb.suppliers?.toArray().catch(() => []) || []
      this.expenses = await localDb.expenses?.toArray().catch(() => []) || []

      // Pull from Supabase BEFORE seeding — so cross-browser data takes priority
      if (navigator.onLine) {
        await this.pullFromSupabase()
      }

      // Only seed if still empty after pull
      if (!this.products.length) {
        await localDb.products.bulkAdd(seed)
        this.products = [...seed]
        for (const p of seed) {
          await this.queue('products', p)
        }
      }

      if (navigator.onLine) {
        await this.sync()
        this.subscribeRealtime()
      }

      window.addEventListener('online', async () => {
        this.online = true
        await this.pullFromSupabase()
        await this.sync()
        this.subscribeRealtime()
      })
      window.addEventListener('offline', () => {
        this.online = false
      })
    },

    notify(message) {
      this.toast = message
      setTimeout(() => { this.toast = null }, 3000)
    },

    async saveProduct(product) {
      try {
        const clean = cloneDeep(product || {})
        const autoBarcode = '3' + Math.floor(10000000 + Math.random() * 90000000)
        const namePrefix = (clean.name || '').trim().slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'PRD') || 'PRD'
        const autoSku = `${namePrefix}-${Math.floor(1000 + Math.random() * 9000)}`

        const isUuid = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str || ''))
        const targetId = isUuid(clean.id) ? clean.id : crypto.randomUUID()

        const imagesList = Array.isArray(clean.images) && clean.images.length > 0
          ? clean.images
          : (clean.image ? [clean.image] : [])

        const p = {
          ...clean,
          id: targetId,
          sku: (clean.sku && clean.sku.trim()) ? clean.sku.trim() : autoSku,
          barcode: (clean.barcode && clean.barcode.trim()) ? clean.barcode.trim() : autoBarcode,
          category: (clean.category && clean.category.trim()) ? clean.category.trim() : 'Chemises',
          image: imagesList[0] || clean.image || '',
          images: imagesList,
          hidden: Boolean(clean.hidden),
          price: Number(clean.price) || 0,
          purchasePrice: Number(clean.purchasePrice) || 0,
          variants: (clean.variants || []).flatMap((v, idx) => {
            const hasMultiSizes = v.sizes && Array.isArray(v.sizes) && v.sizes.length > 0;
            if (hasMultiSizes) {
              return v.sizes.map((sz, sIdx) => ({
                ...v,
                size: sz,
                sizes: undefined,
                id: (v.sizes.length === 1 && isUuid(v.id)) ? v.id : crypto.randomUUID(),
                barcode: (v.barcode && v.barcode.trim()) ? (v.sizes.length === 1 ? v.barcode.trim() : `${v.barcode.trim()}-${sz}`) : ((clean.barcode || autoBarcode) + `-${idx + 1}-${sz}`),
                stock: Number(v.stock) || 0,
                min: Number(v.min) || 0
              }))
            } else {
              return [{
                ...v,
                id: isUuid(v.id) ? v.id : crypto.randomUUID(),
                barcode: (v.barcode && v.barcode.trim()) ? v.barcode.trim() : ((clean.barcode || autoBarcode) + String(idx + 1)),
                stock: Number(v.stock) || 0,
                min: Number(v.min) || 0
              }]
            }
          })
        }
        const plainP = cloneDeep(p)
        await localDb.products.put(plainP)
        const i = this.products.findIndex(x => x.id === plainP.id || (clean.id && x.id === clean.id))
        if (i < 0) this.products.push(plainP)
        else this.products.splice(i, 1, plainP)
        await this.queue('products', plainP)

        // Non-blocking Supabase sync
        if (supabase && navigator.onLine) {
          try {
            supabase.from('products').upsert({
              id: plainP.id,
              name: plainP.name || '',
              sku: plainP.sku || null,
              barcode: plainP.barcode || null,
              category: plainP.category || 'Chemises',
              price: plainP.price,
              purchase_price: plainP.purchasePrice,
              description: plainP.category || ''
            }, { onConflict: 'id' }).then(() => {}).catch(() => {})
          } catch (_) {}
        }

        this.notify(product && product.id ? 'Produit mis à jour ✓' : 'Produit créé ✓')
      } catch (error) {
        console.error('saveProduct error:', error)
        this.notify(`Erreur : ${error.message}`)
      }
    },

    async removeProduct(id) {
      try {
        await localDb.products.delete(id)
        this.products = this.products.filter(p => p.id !== id)
        // Remove any cart lines for this product
        this.cart = this.cart.filter(c => c.productId !== id)
        await this.queue('products', { id, deleted: true })

        if (supabase) {
          supabase.from('products').delete().eq('id', id).then(() => {}).catch(() => {})
        }

        this.notify('Produit supprimé')
      } catch (error) {
        console.error('removeProduct error:', error)
        this.notify(`Erreur : ${error.message}`)
      }
    },

    addCart(product, variant) {
      if (!variant.stock || variant.stock <= 0) {
        this.notify('Ce produit est en rupture de stock')
        return
      }
      const found = this.cart.find(x => x.variantId === variant.id)
      if (found) {
        if (found.quantity < found.available) found.quantity++
        else this.notify('Quantité maximale disponible atteinte')
      } else {
        this.cart.push({
          productId: product.id,
          variantId: variant.id,
          sku: product.sku,
          name: product.name,
          variant: `${variant.color || ''} · ${variant.size || ''}`.trim().replace(/^·\s*/, '').replace(/\s*·$/, ''),
          price: product.price,
          quantity: 1,
          available: variant.stock
        })
      }
    },

    incrementCartLine(line) {
      if (line.quantity < line.available) line.quantity++
      else this.notify('Stock maximum atteint')
    },

    decrementCartLine(line) {
      if (line.quantity > 1) line.quantity--
    },

    removeCartLine(variantId) {
      this.cart = this.cart.filter(x => x.variantId !== variantId)
    },

    updateCartLinePrice(variantId, newPrice) {
      const line = this.cart.find(x => x.variantId === variantId)
      if (line) {
        line.price = Math.max(0, Number(newPrice) || 0)
      }
    },

    clearCart() {
      this.cart = []
    },

    async confirmSaleStatus(saleId, status = 'confirmée', notes = '') {
      const sale = this.sales.find(s => s.id === saleId)
      if (sale) {
        sale.status = status
        sale.whatsappConfirmedAt = new Date().toISOString()
        if (notes) sale.whatsappNotes = notes
        const raw = cloneDeep(sale)
        await localDb.sales.put(raw)
        if (this.online) {
          try {
            await supabase.from('sales').upsert([raw])
          } catch (_) {}
        }
        this.notify(`Commande ${sale.number || sale.id} ${status === 'confirmée' ? 'confirmée par WhatsApp ✓' : 'mise à jour'}`)
      }
    },

    async checkout(payment = 'Espèces', details = {}) {
      if (!this.cart.length) return this.notify('Ajoutez au moins un article au panier')
      if (this.cart.some(x => x.quantity > x.available)) return this.notify('Quantité indisponible en stock')

      try {
        const discount = Math.max(0, Number(details.discount) || 0)
        const shipping = Math.max(0, Number(details.shipping) || 0)

        // Bug fix: unique sale number using timestamp to avoid collisions across browsers
        const saleNum = `V-${Date.now().toString(36).toUpperCase()}-${String(this.sales.length + 1).padStart(4, '0')}`

        const saleTotal = Math.max(0, this.cartTotal - discount + shipping)
        const paidAmount = Number(details.paidAmount) || saleTotal
        const remainingBalance = Math.max(0, saleTotal - paidAmount)

        const rawSale = {
          id: crypto.randomUUID(),
          number: saleNum,
          createdAt: new Date().toISOString(),
          items: this.cart.map(({ productId, variantId, sku, name, variant, price, quantity }) => ({
            productId, variantId, sku, name, variant: variant ? cloneDeep(variant) : null, price, quantity
          })),
          subtotal: this.cartTotal,
          discount,
          shipping,
          total: saleTotal,
          paidAmount,
          remainingBalance,
          customer: details.customer ? cloneDeep(details.customer) : null,
          payment,
          source: details.source || 'pos',
          status: details.status || (details.source === 'storefront' ? 'unconfirmed' : 'completed'),
          confirmed: details.source === 'storefront' ? false : true
        }

        // Clean sale object to prevent IndexedDB DataCloneError from Vue reactive proxies
        const sale = cloneDeep(rawSale)

        // Bug fix: update stock immutably to trigger Vue reactivity
        for (const item of sale.items) {
          const pIdx = this.products.findIndex(x => x.id === item.productId)
          if (pIdx < 0) throw new Error(`Produit introuvable: ${item.name}`)
          const rawProduct = cloneDeep(this.products[pIdx])
          const vIdx = Array.isArray(rawProduct.variants) ? rawProduct.variants.findIndex(x => x.id === item.variantId) : -1
          if (vIdx < 0) throw new Error(`Variante introuvable pour: ${item.name}`)

          // Immutable update to trigger reactivity
          const updatedVariants = rawProduct.variants.map((v, i) =>
            i === vIdx ? { ...v, stock: Math.max(0, (Number(v.stock) || 0) - item.quantity) } : { ...v }
          )
          const updatedProduct = cloneDeep({ ...rawProduct, variants: updatedVariants })
          await localDb.products.put(updatedProduct)
          await this.queue('products', updatedProduct)

          this.products.splice(pIdx, 1, updatedProduct)

          await localDb.movements.add(cloneDeep({
            id: crypto.randomUUID(),
            productId: rawProduct.id,
            type: 'sale',
            quantity: -item.quantity,
            createdAt: sale.createdAt
          }))
        }

        await localDb.sales.add(sale)
        this.sales.unshift(sale)
        this.cart = []
        await this.queue('sales', sale)

        // Update customer credit/debt when there is a remaining balance
        if (remainingBalance > 0 && sale.customer && sale.customer.name) {
          await this.updateCustomerCredit(sale.customer, remainingBalance, sale.number)
        }

        this.notify(`Vente ${sale.number} finalisée ✓`)
        return sale
      } catch (error) {
        console.error('Checkout failed', error)
        this.notify(`Erreur : ${error.message}`)
        return null
      }
    },

    async attachShipment(saleId, shipment) {
      const index = this.sales.findIndex(sale => sale.id === saleId)
      if (index < 0) return
      const sale = cloneDeep(this.sales[index])
      sale.shipment = {
        tracking: String(shipment.tracking || ''),
        city: String(shipment.city || ''),
        status: String(shipment.status || ''),
        updatedAt: new Date().toISOString()
      }
      await localDb.sales.put(sale)
      this.sales.splice(index, 1, sale)
      await this.queue('sales', sale)
    },

    async removeSale(saleId, restoreStock = true) {
      console.log("HELLO I AM THE REAL REMOVESALE PLEASE FIND ME IN THE BUNDLE");
      try {
        const targetId = typeof saleId === 'object' ? (saleId.id || saleId._id) : saleId
        const index = this.sales.findIndex(s => s.id === targetId)
        if (index < 0) return

        const sale = cloneDeep(this.sales[index])

        // Restituer le stock en cas de retour / annulation
        if (restoreStock && Array.isArray(sale.items)) {
          for (const item of sale.items) {
            const pIdx = this.products.findIndex(x => x.id === item.productId || x.sku === item.sku)
            if (pIdx >= 0) {
              const rawProduct = cloneDeep(this.products[pIdx])
              const vIdx = Array.isArray(rawProduct.variants) ? rawProduct.variants.findIndex(x => x.id === item.variantId) : -1
              if (vIdx >= 0) {
                const updatedVariants = rawProduct.variants.map((v, i) =>
                  i === vIdx ? { ...v, stock: (Number(v.stock) || 0) + (Number(item.quantity) || 1) } : { ...v }
                )
                const updatedProduct = cloneDeep({ ...rawProduct, variants: updatedVariants })
                
                try {
                  await localDb.products.put(updatedProduct)
                } catch (e) {
                  console.error('FAILED AT localDb.products.put! Payload:', updatedProduct)
                  throw new Error(`localDb.products.put: ${e.message}`)
                }

                await this.queue('products', updatedProduct)

                this.products.splice(pIdx, 1, updatedProduct)

                try {
                  await localDb.movements.add(cloneDeep({
                    id: crypto.randomUUID(),
                    productId: rawProduct.id,
                    type: 'return',
                    quantity: Number(item.quantity) || 1,
                    createdAt: new Date().toISOString()
                  }))
                } catch (e) {
                  console.error('FAILED AT localDb.movements.add!')
                  throw new Error(`localDb.movements.add: ${e.message}`)
                }
              }
            }
          }
        }

        // Revert customer credit/debt when a sale is deleted
        if (sale.remainingBalance > 0 && sale.customer && sale.customer.name) {
          await this.revertCustomerCredit(sale.customer, sale.remainingBalance, sale.number)
        }

        try {
          await localDb.sales.delete(targetId)
        } catch (e) {
          throw new Error(`localDb.sales.delete: ${e.message}`)
        }
        
        this.sales.splice(index, 1)

        await this.queue('sales', { id: targetId, deleted: true })

        if (supabase) {
          supabase.from('sales').delete().eq('id', targetId).then(() => {}).catch(() => {})
        }

        this.notify(restoreStock ? 'Commande supprimée & stock réintégré ✓' : 'Commande supprimée ✓')
      } catch (error) {
        console.error('removeSale error:', error)
        this.notify(`Erreur : ${error.message || error}`)
      }
    },

    async updateSale(updatedSale) {
      try {
        if (!updatedSale || !updatedSale.id) return
        
        // Clean Vue proxies to prevent IndexedDB DataCloneError
        const raw = cloneDeep(updatedSale)
        const index = this.sales.findIndex(s => s.id === raw.id)
        if (index < 0) return

        const subtotal = (raw.items || []).reduce((n, x) => n + ((Number(x.price) || 0) * (Number(x.quantity) || 1)), 0)
        const discount = Math.max(0, Number(raw.discount) || 0)
        const shipping = Math.max(0, Number(raw.shipping) || 0)
        const total = Number(raw.total) >= 0 ? Number(raw.total) : Math.max(0, subtotal - discount + shipping)

        const saleToSave = {
          ...raw,
          subtotal,
          discount,
          shipping,
          total,
          updatedAt: new Date().toISOString()
        }

        await localDb.sales.put(saleToSave)
        this.sales.splice(index, 1, saleToSave)

        await this.queue('sales', saleToSave)

        if (supabase) {
          supabase.from('sales').upsert({
            id: saleToSave.id,
            number: saleToSave.number || '',
            total: Number(saleToSave.total) || 0,
            payment_method: saleToSave.payment || 'cash'
          }, { onConflict: 'id' }).then(() => {}).catch(() => {})
        }

        this.notify(`Commande ${saleToSave.number} mise à jour ✓`)
      } catch (error) {
        console.error('updateSale error:', error)
        this.notify(`Erreur mise à jour : ${error.message || error}`)
      }
    },

    async queue(table, payload) {
      try {
        const cleanPayload = payload ? cloneDeep(payload) : null
        await localDb.queue.add({ table, payload: cleanPayload, createdAt: new Date().toISOString() })
        if (this.online) this.sync()
      } catch (e) {
        console.error(`FAILED AT localDb.queue.add for table ${table}! Payload:`, payload)
        throw new Error(`localDb.queue.add (${table}): ${e.message}`)
      }
    },

    async sync() {
      if (!supabase) {
        console.warn('Supabase client is not initialized. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY env variables.')
        return
      }
      try {
        const jobs = await localDb.queue.toArray()
        if (!jobs.length) return
        let synced = 0
        for (const job of jobs) {
          const entityId = String(job.payload?.id || job.id)
          let syncPayload = job.payload;
          
          if (job.table === 'products' && syncPayload) {
            // Strip huge base64 images to prevent 500 Payload Too Large from Supabase
            const { images, image, ...strippedPayload } = syncPayload;
            syncPayload = strippedPayload;
          }

          const { error } = await supabase
            .from('app_sync')
            .upsert(
              { entity_type: job.table, entity_id: entityId, payload: syncPayload, updated_at: new Date().toISOString() },
              { onConflict: 'entity_type,entity_id' }
            )
          if (error) {
            if (error.code === '42P01') this.notify('Supabase : appliquez la migration SQL (0002_offline_sync.sql)')
            else this.notify(`Erreur Sync Supabase : ${error.message}`)
            console.error('Supabase sync error:', error)
            
            // If the payload is STILL too large, we shouldn't completely block the queue.
            // Wait, we'll let it block for now, but stripping images solves 99% of 500 errors.
            return
          }

          // Dual sync: Also attempt upsert into normalized products / sales tables for direct SQL viewing
          if (job.table === 'products' && job.payload) {
            if (job.payload.deleted) {
              await supabase.from('products').delete().eq('id', entityId).then(() => {}).catch(() => {})
            } else {
              await supabase.from('products').upsert({
                id: job.payload.id,
                name: job.payload.name || '',
                sku: job.payload.sku || null,
                barcode: job.payload.barcode || null,
                price: Number(job.payload.price) || 0,
                purchase_price: Number(job.payload.purchasePrice) || 0,
                description: job.payload.category || ''
              }, { onConflict: 'id' }).then(() => {}).catch(() => {})
            }
          } else if (job.table === 'sales' && job.payload) {
            await supabase.from('sales').upsert({
              id: job.payload.id,
              number: job.payload.number || '',
              total: Number(job.payload.total) || 0,
              payment_method: job.payload.paymentMethod || 'cash'
            }, { onConflict: 'id' }).then(() => {}).catch(() => {})
          }

          await localDb.queue.delete(job.id)
          synced++
        }
        if (synced > 0) this.notify(`Sync Supabase : ${synced} élément(s) ✓`)
      } catch (e) {
        console.error('Sync failed:', e)
        this.notify(`Échec Sync : ${e.message}`)
      }
    },

    async pullFromSupabase() {
      if (!supabase) return
      try {
        const { data, error } = await supabase.from('app_sync').select('*')
        if (error || !data || !data.length) return

        for (const item of data) {
          const { entity_type, entity_id, payload } = item
          if (!payload) continue

          if (entity_type === 'products') {
            if (payload.deleted) {
              await localDb.products.delete(entity_id)
              this.products = this.products.filter(x => x.id !== entity_id)
            } else if (payload.id) {
              await localDb.products.put(payload)
              const idx = this.products.findIndex(x => x.id === payload.id)
              if (idx < 0) this.products.push(payload)
              else this.products.splice(idx, 1, payload)
            }
          } else if (entity_type === 'sales') {
            if (payload.deleted || payload.deleted === true) {
              await localDb.sales.delete(entity_id)
              this.sales = this.sales.filter(x => x.id !== entity_id)
            } else if (payload.id) {
              await localDb.sales.put(payload)
              const idx = this.sales.findIndex(x => x.id === payload.id)
              if (idx < 0) this.sales.unshift(payload)
              else this.sales.splice(idx, 1, payload)
            }
          } else if (entity_type === 'customers') {
            if (payload.deleted) {
              await localDb.customers.delete(entity_id)
              this.customers = this.customers.filter(x => x.id !== entity_id)
            } else if (payload.id) {
              await localDb.customers.put(payload)
              const idx = this.customers.findIndex(x => x.id === payload.id)
              if (idx < 0) this.customers.unshift(payload)
              else this.customers.splice(idx, 1, payload)
            }
          } else if (entity_type === 'suppliers') {
            if (payload.deleted) {
              await localDb.suppliers?.delete(entity_id).catch(() => {})
              this.suppliers = this.suppliers.filter(x => x.id !== entity_id)
            } else if (payload.id) {
              await localDb.suppliers?.put(payload).catch(() => {})
              const idx = this.suppliers.findIndex(x => x.id === payload.id)
              if (idx < 0) this.suppliers.unshift(payload)
              else this.suppliers.splice(idx, 1, payload)
            }
          } else if (entity_type === 'expenses') {
            if (payload.deleted) {
              await localDb.expenses?.delete(entity_id).catch(() => {})
              this.expenses = this.expenses.filter(x => x.id !== entity_id)
            } else if (payload.id) {
              await localDb.expenses?.put(payload).catch(() => {})
              const idx = this.expenses.findIndex(x => x.id === payload.id)
              if (idx < 0) this.expenses.unshift(payload)
              else this.expenses.splice(idx, 1, payload)
            }
          }
        }

        // Re-sort sales by date (newest first)
        this.sales.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      } catch (err) {
        console.warn('pullFromSupabase failed:', err.message)
      }
    },

    subscribeRealtime() {
      if (!supabase) return
      // Bug fix: prevent duplicate subscriptions
      if (realtimeChannel) {
        try { supabase.removeChannel(realtimeChannel) } catch (_) {}
        realtimeChannel = null
      }
      try {
        realtimeChannel = supabase
          .channel('alphashop-sync')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'app_sync' }, (change) => {
            const record = change.new
            if (!record || !record.entity_type || !record.payload) return
            const { entity_type, entity_id, payload } = record

            if (entity_type === 'products') {
              if (payload.deleted) {
                localDb.products.delete(entity_id)
                this.products = this.products.filter(p => p.id !== entity_id)
              } else if (payload.id) {
                localDb.products.put(payload)
                const idx = this.products.findIndex(x => x.id === payload.id)
                if (idx < 0) this.products.push(payload)
                else this.products.splice(idx, 1, payload)
              }
            } else if (entity_type === 'sales') {
              if (payload.deleted || payload.deleted === true) {
                localDb.sales.delete(entity_id)
                this.sales = this.sales.filter(x => x.id !== entity_id)
              } else if (payload.id) {
                localDb.sales.put(payload)
                const idx = this.sales.findIndex(x => x.id === payload.id)
                if (idx < 0) this.sales.unshift(payload)
                else this.sales.splice(idx, 1, payload)
              }
            } else if (entity_type === 'customers') {
              if (payload.deleted) {
                localDb.customers.delete(entity_id)
                this.customers = this.customers.filter(x => x.id !== entity_id)
              } else if (payload.id) {
                localDb.customers.put(payload)
                const idx = this.customers.findIndex(x => x.id === payload.id)
                if (idx < 0) this.customers.unshift(payload)
                else this.customers.splice(idx, 1, payload)
              }
            } else if (entity_type === 'suppliers') {
              if (payload.deleted) {
                localDb.suppliers?.delete(entity_id).catch(() => {})
                this.suppliers = this.suppliers.filter(x => x.id !== entity_id)
              } else if (payload.id) {
                localDb.suppliers?.put(payload).catch(() => {})
                const idx = this.suppliers.findIndex(x => x.id === payload.id)
                if (idx < 0) this.suppliers.unshift(payload)
                else this.suppliers.splice(idx, 1, payload)
              }
            } else if (entity_type === 'expenses') {
              if (payload.deleted) {
                localDb.expenses?.delete(entity_id).catch(() => {})
                this.expenses = this.expenses.filter(x => x.id !== entity_id)
              } else if (payload.id) {
                localDb.expenses?.put(payload).catch(() => {})
                const idx = this.expenses.findIndex(x => x.id === payload.id)
                if (idx < 0) this.expenses.unshift(payload)
                else this.expenses.splice(idx, 1, payload)
              }
            }
          })
          .subscribe()
      } catch (e) {
        console.warn('Realtime subscription error:', e.message)
      }
    },

    async saveCustomer(customer) {
      try {
        const c = cloneDeep({
          ...customer,
          id: customer.id || crypto.randomUUID(),
          name: customer.name || '',
          phone: customer.phone || '',
          city: customer.city || '',
          address: customer.address || '',
          createdAt: customer.createdAt || new Date().toISOString()
        })
        await localDb.customers.put(c)
        const idx = this.customers.findIndex(x => x.id === c.id)
        if (idx < 0) this.customers.unshift(c)
        else this.customers.splice(idx, 1, c)
        await this.queue('customers', c)
        this.notify('Client enregistré ✓')
      } catch (err) {
        this.notify(`Erreur : ${err.message}`)
      }
    },

    async removeCustomer(id) {
      try {
        await localDb.customers.delete(id)
        this.customers = this.customers.filter(x => x.id !== id)
        await this.queue('customers', { id, deleted: true })
        this.notify('Client supprimé')
      } catch (err) {
        this.notify(`Erreur : ${err.message}`)
      }
    },

    // Update customer credit/debt when a sale has remaining balance
    async updateCustomerCredit(saleCustomer, creditAmount, saleNumber) {
      try {
        // Find or create customer by phone or name
        const phone = (saleCustomer.phone || '').trim()
        const name = (saleCustomer.name || '').trim()
        if (!name && !phone) return

        let existing = this.customers.find(c =>
          (phone && c.phone === phone) || (name && c.name === name)
        )

        if (existing) {
          // Accumulate credit on existing customer
          const updated = cloneDeep({
            ...existing,
            totalPurchases: (Number(existing.totalPurchases) || 0) + creditAmount,
            creditHistory: [
              ...(existing.creditHistory || []),
              { saleNumber, amount: creditAmount, date: new Date().toISOString() }
            ]
          })
          await localDb.customers.put(updated)
          const idx = this.customers.findIndex(x => x.id === updated.id)
          if (idx >= 0) this.customers.splice(idx, 1, updated)
          await this.queue('customers', updated)
        } else {
          // Auto-create customer with initial credit
          const newCustomer = cloneDeep({
            id: crypto.randomUUID(),
            name,
            phone,
            city: saleCustomer.city || '',
            address: saleCustomer.address || '',
            totalPurchases: creditAmount,
            totalPaid: 0,
            creditHistory: [
              { saleNumber, amount: creditAmount, date: new Date().toISOString() }
            ],
            createdAt: new Date().toISOString()
          })
          await localDb.customers.put(newCustomer)
          this.customers.unshift(newCustomer)
          await this.queue('customers', newCustomer)
        }
      } catch (err) {
        console.error('updateCustomerCredit error:', err)
      }
    },

    // Revert customer credit when a sale is deleted
    async revertCustomerCredit(saleCustomer, creditAmount, saleNumber) {
      try {
        const phone = (saleCustomer.phone || '').trim()
        const name = (saleCustomer.name || '').trim()
        if (!name && !phone) return

        let existing = this.customers.find(c =>
          (phone && c.phone === phone) || (name && c.name === name)
        )

        if (existing) {
          const updated = cloneDeep({
            ...existing,
            totalPurchases: Math.max(0, (Number(existing.totalPurchases) || 0) - creditAmount),
            creditHistory: (existing.creditHistory || []).filter(h => h.saleNumber !== saleNumber)
          })
          
          try {
            await localDb.customers.put(updated)
          } catch (e) {
            console.error('FAILED AT localDb.customers.put! Payload:', updated)
            throw new Error(`localDb.customers.put: ${e.message}`)
          }

          const idx = this.customers.findIndex(x => x.id === updated.id)
          if (idx >= 0) this.customers.splice(idx, 1, updated)
          await this.queue('customers', updated)
        }
      } catch (err) {
        console.error('revertCustomerCredit error:', err)
        throw err
      }
    },

    // Pay off some or all of a customer's credit balance
    async payCustomerCredit(customerId, paymentAmount) {
      try {
        const idx = this.customers.findIndex(x => x.id === customerId)
        if (idx < 0) return this.notify('Client introuvable')
        const customer = this.customers[idx]
        const currentDebt = Math.max(0, (Number(customer.totalPurchases) || 0) - (Number(customer.totalPaid) || 0))
        const payment = Math.min(paymentAmount, currentDebt)

        const updated = cloneDeep({
          ...customer,
          totalPaid: (Number(customer.totalPaid) || 0) + payment,
          creditHistory: [
            ...(customer.creditHistory || []),
            { saleNumber: 'PAIEMENT', amount: -payment, date: new Date().toISOString() }
          ]
        })
        await localDb.customers.put(updated)
        this.customers.splice(idx, 1, updated)
        await this.queue('customers', updated)
        this.notify(`Paiement de ${payment} MAD enregistré ✓`)
      } catch (err) {
        this.notify(`Erreur : ${err.message}`)
      }
    },


    async saveSupplier(supplier) {
      try {
        const totalPurchases = Math.max(0, Number(supplier.totalPurchases) || 0)
        const totalPaid = Math.max(0, Number(supplier.totalPaid) || 0)
        const balanceOwed = Math.max(0, totalPurchases - totalPaid)

        const s = {
          ...supplier,
          id: supplier.id || crypto.randomUUID(),
          name: supplier.name || '',
          phone: supplier.phone || '',
          company: supplier.company || '',
          email: supplier.email || '',
          totalPurchases,
          totalPaid,
          balanceOwed,
          createdAt: supplier.createdAt || new Date().toISOString()
        }
        await localDb.suppliers?.put(s).catch(() => {})
        const idx = this.suppliers.findIndex(x => x.id === s.id)
        if (idx < 0) this.suppliers.unshift(s)
        else this.suppliers.splice(idx, 1, s)
        await this.queue('suppliers', s)
        this.notify('Fournisseur enregistré ✓')
      } catch (err) {
        this.notify(`Erreur : ${err.message}`)
      }
    },

    async paySupplierDebt(supplierId, paymentAmount, createExpense = true) {
      try {
        const idx = this.suppliers.findIndex(x => x.id === supplierId)
        if (idx < 0) return
        const amount = Math.max(0, Number(paymentAmount) || 0)
        if (amount <= 0) return this.notify('Veuillez entrer un montant valide')

        const s = cloneDeep(this.suppliers[idx])
        s.totalPaid = (Number(s.totalPaid) || 0) + amount
        s.balanceOwed = Math.max(0, (Number(s.totalPurchases) || 0) - s.totalPaid)

        await localDb.suppliers?.put(s).catch(() => {})
        this.suppliers.splice(idx, 1, s)
        await this.queue('suppliers', s)

        if (createExpense) {
          await this.saveExpense({
            category: 'Achat de Stock',
            amount,
            note: `Règlement dette fournisseur: ${s.name} (${s.company || 'Direct'})`,
            date: new Date().toISOString().slice(0, 10)
          })
        }

        this.notify(`Règlement de ${amount} MAD enregistré pour ${s.name} ✓`)
      } catch (err) {
        this.notify(`Erreur : ${err.message}`)
      }
    },

    async removeSupplier(id) {
      try {
        await localDb.suppliers?.delete(id).catch(() => {})
        this.suppliers = this.suppliers.filter(x => x.id !== id)
        await this.queue('suppliers', { id, deleted: true })
        this.notify('Fournisseur supprimé')
      } catch (err) {
        this.notify(`Erreur : ${err.message}`)
      }
    },

    async saveExpense(expense) {
      try {
        const amount = Number(expense.amount) || 0
        const totalInvoice = Number(expense.totalInvoice) >= amount ? Number(expense.totalInvoice) : amount

        const e = {
          ...expense,
          id: expense.id || crypto.randomUUID(),
          category: expense.category || 'Autre',
          amount,
          totalInvoice,
          supplierId: expense.supplierId || null,
          note: expense.note || '',
          date: expense.date || new Date().toISOString().slice(0, 10),
          createdAt: expense.createdAt || new Date().toISOString()
        }
        await localDb.expenses?.put(e).catch(() => {})
        const idx = this.expenses.findIndex(x => x.id === e.id)
        if (idx < 0) this.expenses.unshift(e)
        else this.expenses.splice(idx, 1, e)
        await this.queue('expenses', e)

        // Automatically update supplier purchase & debt if supplierId is linked
        if (e.supplierId) {
          const sIdx = this.suppliers.findIndex(x => x.id === e.supplierId)
          if (sIdx >= 0) {
            const supplier = cloneDeep(this.suppliers[sIdx])
            supplier.totalPurchases = (Number(supplier.totalPurchases) || 0) + totalInvoice
            supplier.totalPaid = (Number(supplier.totalPaid) || 0) + amount
            supplier.balanceOwed = Math.max(0, supplier.totalPurchases - supplier.totalPaid)

            await localDb.suppliers?.put(supplier).catch(() => {})
            this.suppliers.splice(sIdx, 1, supplier)
            await this.queue('suppliers', supplier)
          }
        }

        this.notify('Dépense enregistrée ✓')
      } catch (err) {
        this.notify(`Erreur : ${err.message}`)
      }
    },

    async removeExpense(id) {
      try {
        await localDb.expenses?.delete(id).catch(() => {})
        this.expenses = this.expenses.filter(x => x.id !== id)
        await this.queue('expenses', { id, deleted: true })
        this.notify('Dépense supprimée')
      } catch (err) {
        this.notify(`Erreur : ${err.message}`)
      }
    },

    setLanguage(l) {
      this.language = l
      localStorage.setItem('alpha-lang', l)
    }
  }
})
