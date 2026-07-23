import { defineStore } from 'pinia'
import { localDb } from '../lib/db'
import { supabase } from '../lib/supabase'

let realtimeChannel = null

const seed = [
  { id:'p1', name:'T-shirt Essential', sku:'TS-001', barcode:'3000001', category:'Textile', brand:'Alpha', price:149, purchasePrice:72, variants:[{id:'v1',color:'Noir',size:'S',stock:10,min:3,barcode:'30000011'},{id:'v2',color:'Noir',size:'M',stock:15,min:3,barcode:'30000012'},{id:'v3',color:'Blanc',size:'M',stock:6,min:3,barcode:'30000013'}] },
  { id:'p2', name:'Casquette Logo', sku:'CP-002', barcode:'3000002', category:'Accessoires', brand:'Alpha', price:99, purchasePrice:40, variants:[{id:'v4',color:'Noir',size:'Unique',stock:4,min:3,barcode:'30000021'}] },
  { id:'p3', name:'Hoodie Studio', sku:'HD-003', barcode:'3000003', category:'Textile', brand:'Alpha', price:349, purchasePrice:165, variants:[{id:'v5',color:'Gris',size:'L',stock:12,min:3,barcode:'30000031'}] }
]

export const useShop = defineStore('shop', {
  state: () => ({
    products: [],
    sales: [],
    customers: [],
    cart: [],
    query: '',
    online: navigator.onLine,
    toast: null,
    language: localStorage.getItem('alpha-lang') || 'fr',
    active: 'dashboard'
  }),

  getters: {
    inventoryValue: s => s.products.reduce((sum, p) => sum + p.variants.reduce((x, v) => x + v.stock * p.purchasePrice, 0), 0),
    lowStock: s => s.products.flatMap(p => p.variants.filter(v => v.stock <= v.min).map(v => ({ ...v, product: p.name }))),
    todaySales: s => s.sales.filter(x => new Date(x.createdAt).toDateString() === new Date().toDateString()).reduce((n, x) => n + x.total, 0),
    monthSales: s => s.sales.filter(x => new Date(x.createdAt).getMonth() === new Date().getMonth()).reduce((n, x) => n + x.total, 0),
    cartTotal: s => s.cart.reduce((n, x) => n + x.price * x.quantity, 0)
  },

  actions: {
    async init() {
      // Load local data first for fast startup
      this.products = await localDb.products.toArray()
      this.sales = await localDb.sales.toArray()
      this.customers = await localDb.customers.toArray()

      // Pull from Supabase BEFORE seeding — so cross-browser data takes priority
      if (navigator.onLine) {
        await this.pullFromSupabase()
      }

      // Only seed if still empty after pull
      if (!this.products.length) {
        await localDb.products.bulkAdd(seed)
        this.products = [...seed]
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
        const p = {
          ...product,
          id: product.id || crypto.randomUUID(),
          price: Number(product.price) || 0,
          purchasePrice: Number(product.purchasePrice) || 0,
          variants: (product.variants || []).map(v => ({
            ...v,
            id: v.id || crypto.randomUUID(),
            stock: Number(v.stock) || 0,
            min: Number(v.min) || 0
          }))
        }
        await localDb.products.put(p)
        const i = this.products.findIndex(x => x.id === p.id)
        if (i < 0) this.products.push(p)
        else this.products.splice(i, 1, p)
        await this.queue('products', p)

        // Direct push to Supabase products table
        if (supabase) {
          supabase.from('products').upsert({
            id: p.id,
            name: p.name || '',
            sku: p.sku || null,
            barcode: p.barcode || null,
            price: p.price,
            purchase_price: p.purchasePrice,
            description: p.category || ''
          }, { onConflict: 'id' }).then(() => {}).catch(() => {})
        }

        this.notify(product.id ? 'Produit mis à jour ✓' : 'Produit créé ✓')
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

    clearCart() {
      this.cart = []
    },

    async checkout(payment = 'Espèces', details = {}) {
      if (!this.cart.length) return this.notify('Ajoutez au moins un article au panier')
      if (this.cart.some(x => x.quantity > x.available)) return this.notify('Quantité indisponible en stock')

      try {
        const discount = Math.max(0, Number(details.discount) || 0)
        const shipping = Math.max(0, Number(details.shipping) || 0)

        // Bug fix: unique sale number using timestamp to avoid collisions across browsers
        const saleNum = `V-${Date.now().toString(36).toUpperCase()}-${String(this.sales.length + 1).padStart(4, '0')}`

        const sale = {
          id: crypto.randomUUID(),
          number: saleNum,
          createdAt: new Date().toISOString(),
          items: this.cart.map(({ productId, variantId, sku, name, variant, price, quantity }) => ({
            productId, variantId, sku, name, variant, price, quantity
          })),
          subtotal: this.cartTotal,
          discount,
          shipping,
          total: Math.max(0, this.cartTotal - discount + shipping),
          customer: details.customer ? { ...details.customer } : null,
          payment,
          status: 'completed'
        }

        // Bug fix: update stock immutably to trigger Vue reactivity
        for (const item of sale.items) {
          const pIdx = this.products.findIndex(x => x.id === item.productId)
          if (pIdx < 0) throw new Error(`Produit introuvable: ${item.name}`)
          const p = this.products[pIdx]
          const vIdx = p.variants.findIndex(x => x.id === item.variantId)
          if (vIdx < 0) throw new Error(`Variante introuvable pour: ${item.name}`)

          // Immutable update to trigger reactivity
          const updatedVariants = p.variants.map((v, i) =>
            i === vIdx ? { ...v, stock: v.stock - item.quantity } : { ...v }
          )
          const updatedProduct = { ...p, variants: updatedVariants }
          this.products.splice(pIdx, 1, updatedProduct)

          await localDb.products.put(updatedProduct)
          await localDb.movements.add({
            id: crypto.randomUUID(),
            productId: p.id,
            type: 'sale',
            quantity: -item.quantity,
            createdAt: sale.createdAt
          })
        }

        await localDb.sales.add(sale)
        this.sales.unshift(sale)
        this.cart = []
        await this.queue('sales', sale)
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
      const sale = JSON.parse(JSON.stringify(this.sales[index]))
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

    async queue(table, payload) {
      await localDb.queue.add({ table, payload, createdAt: new Date().toISOString() })
      if (this.online) this.sync()
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
          const { error } = await supabase
            .from('app_sync')
            .upsert(
              { entity_type: job.table, entity_id: entityId, payload: job.payload, updated_at: new Date().toISOString() },
              { onConflict: 'entity_type,entity_id' }
            )
          if (error) {
            if (error.code === '42P01') this.notify('Supabase : appliquez la migration SQL (0002_offline_sync.sql)')
            else this.notify(`Erreur Sync Supabase : ${error.message}`)
            console.error('Supabase sync error:', error)
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
          } else if (entity_type === 'sales' && payload.id) {
            await localDb.sales.put(payload)
            // Bug fix: dedup guard — only add if not already in list
            const idx = this.sales.findIndex(x => x.id === payload.id)
            if (idx < 0) this.sales.unshift(payload)
            else this.sales.splice(idx, 1, payload)
          } else if (entity_type === 'customers' && payload.id) {
            await localDb.customers.put(payload)
            const idx = this.customers.findIndex(x => x.id === payload.id)
            if (idx < 0) this.customers.unshift(payload)
            else this.customers.splice(idx, 1, payload)
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
            } else if (entity_type === 'sales' && payload.id) {
              localDb.sales.put(payload)
              const idx = this.sales.findIndex(x => x.id === payload.id)
              if (idx < 0) this.sales.unshift(payload)
              else this.sales.splice(idx, 1, payload)
            }
          })
          .subscribe()
      } catch (e) {
        console.warn('Realtime subscription error:', e.message)
      }
    },

    setLanguage(l) {
      this.language = l
      localStorage.setItem('alpha-lang', l)
    }
  }
})
