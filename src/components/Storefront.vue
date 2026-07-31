<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useShop } from '../stores/shop'
import { OZON_CITIES } from '../services/ozonCities'
import { 
  ShoppingBag, Search, X, CheckCircle2, Truck, ShieldCheck, Sparkles, 
  ChevronRight, ChevronLeft, Filter, Phone, MapPin, SlidersHorizontal, ArrowLeft, 
  Lock, Trash2, Plus, Minus, Eye, Check, Tag, Star, PackageCheck, User,
  ChevronDown, ArrowUpRight, Share2, RefreshCw, MessageCircle
} from 'lucide-vue-next'

const emit = defineEmits(['openAdmin'])

const shop = useShop()

// Language State
const currentLang = ref('fr')

function toggleLang() {
  currentLang.value = currentLang.value === 'ar' ? 'fr' : 'ar'
}

// Hero Auto-Scroll Carousel State (Inspired by Pinterest aesthetics)
const heroSlides = computed(() => {
  const latestProducts = [...shop.products]
    .filter(p => !p.hidden && (p.image || (p.images && p.images.length > 0)))
    .reverse()
    .slice(0, 3)

  if (latestProducts.length > 0) {
    return latestProducts.map(p => ({
      eyebrow: currentLang.value === 'ar' ? 'جديد المتجر' : 'Nouveauté',
      title: p.name,
      subtitle: p.category,
      image: p.image || (p.images && p.images[0]) || '',
      category: p.category
    }))
  }

  // Fallback if no products exist yet
  if (currentLang.value === 'ar') {
    return [
      {
        eyebrow: 'تشكيلة المتجر العصرية',
        title: 'أهلاً بك في المتجر',
        subtitle: 'سيتم عرض أحدث المنتجات هنا فور إضافتها.',
        image: '/hero-slider-3.jpg',
        category: 'Accueil'
      }
    ]
  }
  return [
    {
      eyebrow: 'Nouvelle Collection',
      title: 'Bienvenue sur la boutique',
      subtitle: 'Vos produits les plus récents s\'afficheront ici.',
      image: '/hero-slider-3.jpg',
      category: 'Accueil'
    }
  ]
})

const currentHeroIndex = ref(0)
let heroTimer = null

function startHeroAutoScroll() {
  stopHeroAutoScroll()
  heroTimer = setInterval(() => {
    currentHeroIndex.value = (currentHeroIndex.value + 1) % heroSlides.value.length
  }, 4000)
}

function stopHeroAutoScroll() {
  if (heroTimer) clearInterval(heroTimer)
}

function nextHeroSlide() {
  currentHeroIndex.value = (currentHeroIndex.value + 1) % heroSlides.value.length
  startHeroAutoScroll()
}

function prevHeroSlide() {
  currentHeroIndex.value = (currentHeroIndex.value - 1 + heroSlides.value.length) % heroSlides.value.length
  startHeroAutoScroll()
}

function setHeroSlide(idx) {
  currentHeroIndex.value = idx
  startHeroAutoScroll()
}

onMounted(() => {
  startHeroAutoScroll()
})

// View / Navigation State
const currentPage = ref('home') // 'home' | 'product'
const selectedProductId = ref(null)
const activeProduct = ref(null)
const selectedVariant = ref(null)
const activeImageIndex = ref(0)

// Filters State
const searchQuery = ref('')
const selectedCategory = ref('Tous')
const selectedSize = ref('Tous')
const maxPriceLimit = ref(1000)

// Cart & Order State
const cartOpen = ref(false)

const undoToast = ref(null)
let undoTimer = null

function openUndoToast(product, variant, addedIndex) {
  if (undoTimer) clearInterval(undoTimer)
  
  undoToast.value = {
    product,
    variant,
    index: addedIndex,
    timeLeft: 5
  }
  
  undoTimer = setInterval(() => {
    if (undoToast.value) {
      undoToast.value.timeLeft--
      if (undoToast.value.timeLeft <= 0) {
        clearInterval(undoTimer)
        undoToast.value = null
      }
    } else {
      clearInterval(undoTimer)
    }
  }, 1000)
}

function executeUndo() {
  if (!undoToast.value) return
  const { product, variant, index } = undoToast.value
  
  if (index > -1 && shop.cart[index]) {
    if (shop.cart[index].quantity > 1) {
      shop.cart[index].quantity--
    } else {
      shop.cart.splice(index, 1)
    }
    shop.notify(currentLang.value === 'ar' ? 'تم التراجع عن الإضافة' : 'Ajout annulé')
  }
  
  clearInterval(undoTimer)
  undoToast.value = null
}
const checkoutOpen = ref(false)
const orderSuccess = ref(null)
const isSubmitting = ref(false)

const promoCode = ref('')
const discountPercent = ref(0)
const citySearchQuery = ref('')
const showCityDropdown = ref(false)

// Customer Form
const orderForm = ref({
  name: '',
  phone: '',
  city: 'Casablanca',
  cityId: 2165,
  address: '',
  note: ''
})

// Categories List
const categories = computed(() => {
  if (currentLang.value === 'ar') {
    return [
      { id: 'Tous', name: 'جميع المنتجات', icon: '🔥' },
      { id: 'Chemises', name: 'قمصان', icon: '👔' },
      { id: 'Ensembles', name: 'أطقم ملابس', icon: '👕' },
      { id: 'T-Shirts & Polos', name: 'تيشيرتات وبولو', icon: '👕' },
      { id: 'Shorts', name: 'شورتات وبرمودا', icon: '🩳' },
      { id: 'Pantalons & Cargos', name: 'سراويل وكارغو', icon: '👖' },
      { id: 'Jackets & Hoodies', name: 'جاكيتات وهوديز', icon: '🧥' },
      { id: 'Accessoires', name: 'إكسسوارات', icon: '🧢' }
    ]
  }
  return [
    { id: 'Tous', name: 'Tous les produits', icon: '🔥' },
    { id: 'Chemises', name: 'Chemises', icon: '👔' },
    { id: 'Ensembles', name: 'Ensembles', icon: '👕' },
    { id: 'T-Shirts & Polos', name: 'T-Shirts & Polos', icon: '👕' },
    { id: 'Shorts', name: 'Shorts & Bermudas', icon: '🩳' },
    { id: 'Pantalons & Cargos', name: 'Pantalons & Cargos', icon: '👖' },
    { id: 'Jackets & Hoodies', name: 'Jackets & Hoodies', icon: '🧥' },
    { id: 'Accessoires', name: 'Accessoires', icon: '🧢' }
  ]
})

const availableSizes = ['Tous', 'S', 'M', 'L', 'XL', 'XXL']

const popularCities = [
  { id: 2165, name: 'Casablanca' },
  { id: 2282, name: 'Rabat' },
  { id: 199, name: 'Marrakech' },
  { id: 127, name: 'Fes' },
  { id: 37, name: 'Agadir' },
  { id: 2368, name: 'Tanger' },
  { id: 2140, name: 'Meknes' },
  { id: 2216, name: 'Oujda' }
]

const filteredCities = computed(() => {
  const q = citySearchQuery.value.trim().toLowerCase()
  if (!q) return popularCities
  return OZON_CITIES.filter(c => c.name.toLowerCase().includes(q)).slice(0, 10)
})

function selectCity(city) {
  orderForm.value.city = city.name
  orderForm.value.cityId = city.id
  citySearchQuery.value = city.name
  showCityDropdown.value = false
}

const filteredProducts = computed(() => {
  return (shop.products || []).filter(p => {
    // Hide check (Maybanch fe store ila kan hidden)
    if (p.hidden) return false

    // Category match
    const matchCat = selectedCategory.value === 'Tous' || 
                     (p.category || '').toLowerCase() === selectedCategory.value.toLowerCase() ||
                     (selectedCategory.value === 'T-Shirts & Polos' && (p.category === 'Textile' || p.category.includes('T-Shirt')))
    
    // Search match
    const q = searchQuery.value.trim().toLowerCase()
    const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q)
    
    // Size match
    const matchSize = selectedSize.value === 'Tous' || 
                      (p.variants || []).some(v => v.size === selectedSize.value && v.stock > 0)

    // Price match
    const matchPrice = Number(p.price || 0) <= maxPriceLimit.value

    return matchCat && matchSearch && matchSize && matchPrice
  })
})

// Single Product Page Helpers
const selectedColor = ref('')

const activeProductImages = computed(() => {
  if (!activeProduct.value) return []
  if (selectedVariant.value && selectedVariant.value.images && selectedVariant.value.images.length > 0) {
    return selectedVariant.value.images
  }
  if (selectedVariant.value && selectedVariant.value.image) {
    return [selectedVariant.value.image]
  }
  return getProductImagesList(activeProduct.value)
})

const currentDisplayImage = computed(() => {
  if (!activeProduct.value) return ''
  return activeProductImages.value[activeImageIndex.value] || activeProductImages.value[0] || getProductImage(activeProduct.value)
})

const availableColors = computed(() => {
  if (!activeProduct.value || !Array.isArray(activeProduct.value.variants)) return []
  return activeProduct.value.variants
    .map(v => v.color)
    .filter((c, idx, self) => c && self.indexOf(c) === idx)
})

const filteredVariantsByColor = computed(() => {
  if (!activeProduct.value || !Array.isArray(activeProduct.value.variants)) return []
  if (selectedColor.value && availableColors.value.length > 0) {
    const matched = activeProduct.value.variants.filter(
      v => (v.color || '').trim().toLowerCase() === selectedColor.value.trim().toLowerCase()
    )
    if (matched.length > 0) return matched
  }
  return activeProduct.value.variants
})

function getColorHex(colorName) {
  if (!colorName) return '#cbd5e1'
  const c = colorName.toLowerCase()
  if (c.includes('noir') || c.includes('black') || c.includes('khal')) return '#1d1d1f'
  if (c.includes('blanc') || c.includes('white')) return '#ffffff'
  if (c.includes('bleu ciel') || c.includes('sky')) return '#93c5fd'
  if (c.includes('bleu marine') || c.includes('navy')) return '#1e3a8a'
  if (c.includes('bleu') || c.includes('blue')) return '#2563eb'
  if (c.includes('beige') || c.includes('sable')) return '#e5d3b3'
  if (c.includes('marron') || c.includes('brown')) return '#78350f'
  if (c.includes('vert') || c.includes('green') || c.includes('olive')) return '#4d7c0f'
  if (c.includes('gris') || c.includes('grey')) return '#9ca3af'
  if (c.includes('rouge') || c.includes('red') || c.includes('bordeaux')) return '#dc2626'
  return '#64748b'
}

function formatColorName(colorName) {
  if (!colorName) return ''
  if (currentLang.value !== 'ar') return colorName
  const c = colorName.toLowerCase().trim()
  if (c.includes('noir') || c.includes('black') || c.includes('khal')) return 'أسود'
  if (c.includes('blanc') || c.includes('white')) return 'أبيض'
  if (c.includes('bleu ciel') || c.includes('sky')) return 'أزرق سماوي'
  if (c.includes('bleu marine') || c.includes('navy')) return 'أزرق داكن'
  if (c.includes('bleu') || c.includes('blue')) return 'أزرق'
  if (c.includes('beige') || c.includes('sable')) return 'بيج'
  if (c.includes('marron') || c.includes('brown')) return 'بني'
  if (c.includes('vert olive') || c.includes('olive')) return 'أخضر زيتي'
  if (c.includes('vert') || c.includes('green')) return 'أخضر'
  if (c.includes('gris') || c.includes('grey')) return 'رمادي'
  if (c.includes('rouge') || c.includes('red') || c.includes('bordeaux')) return 'أحمر'
  return colorName
}

const linkCopied = ref(false)

function copyProductLink() {
  if (!activeProduct.value) return
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://alphashop07.com'
  const fullUrl = `${origin}/?product=${activeProduct.value.id}`
  if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(fullUrl).then(() => {
      linkCopied.value = true
      shop.notify(currentLang.value === 'ar' ? 'تم نسخ رابط المنتج! 📋' : 'Lien produit copié ! 📋')
      setTimeout(() => { linkCopied.value = false }, 3000)
    }).catch(() => { shop.notify(fullUrl) })
  } else {
    shop.notify(fullUrl)
  }
}

let autoScrollTimer = null

function startAutoScroll() {
  stopAutoScroll()
  autoScrollTimer = setInterval(() => {
    if (activeProductImages.value && activeProductImages.value.length > 1) {
      activeImageIndex.value = (activeImageIndex.value + 1) % activeProductImages.value.length
    }
  }, 3000) // Scroll every 3 seconds
}

function stopAutoScroll() {
  if (autoScrollTimer) {
    clearInterval(autoScrollTimer)
    autoScrollTimer = null
  }
}

function openProductDetail(product, pushHistory = true) {
  if (!product) return
  activeProduct.value = product
  selectedProductId.value = product.id
  selectedVariant.value = (product.variants && product.variants.find(v => v.stock > 0)) || product.variants?.[0] || null
  selectedColor.value = selectedVariant.value?.color || (product.variants?.[0]?.color || '')
  activeImageIndex.value = 0
  currentPage.value = 'product'
  if (pushHistory && typeof window !== 'undefined') {
    const url = new URL(window.location.href)
    url.searchParams.set('product', product.id)
    window.history.pushState({ productId: product.id }, '', url.pathname + url.search)
  }
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  startAutoScroll()
}

function onColorSelect(color) {
  selectedColor.value = color
  if (activeProduct.value && Array.isArray(activeProduct.value.variants)) {
    const matched = activeProduct.value.variants.find(v => v.color === color && v.stock > 0) ||
                    activeProduct.value.variants.find(v => v.color === color)
    if (matched) {
      selectedVariant.value = matched
      activeImageIndex.value = 0
      startAutoScroll()
    }
  }
}

function backToHome(pushHistory = true) {
  stopAutoScroll()
  currentPage.value = 'home'
  activeProduct.value = null
  selectedProductId.value = null
  if (pushHistory && typeof window !== 'undefined') {
    const url = new URL(window.location.href)
    url.searchParams.delete('product')
    window.history.pushState({}, '', url.pathname + (url.search || ''))
  }
}

function _openProductFromUrl() {
  if (typeof window === 'undefined') return
  const searchParams = new URLSearchParams(window.location.search)
  const pId = searchParams.get('product') || searchParams.get('p') || window.location.hash.replace(/^#product-/, '').replace(/^#/, '')
  if (pId && Array.isArray(shop.products) && shop.products.length) {
    const m = shop.products.find(p => String(p.id) === String(pId))
    if (m) openProductDetail(m, false)
  }
}

watch(() => shop.products, (prods) => {
  if (Array.isArray(prods) && prods.length > 0 && currentPage.value !== 'product') {
    _openProductFromUrl()
  }
}, { immediate: true, deep: true })

onMounted(() => {
  _openProductFromUrl()
  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', () => {
      const searchParams = new URLSearchParams(window.location.search)
      const pId = searchParams.get('product') || searchParams.get('p') || window.location.hash.replace(/^#product-/, '').replace(/^#/, '')
      if (pId && Array.isArray(shop.products)) {
        const m = shop.products.find(p => String(p.id) === String(pId))
        if (m) { openProductDetail(m, false); return }
      }
      backToHome(false)
    })
  }
})
const relatedProducts = computed(() => {
  if (!activeProduct.value) return []
  return (shop.products || [])
    .filter(p => !p.hidden && p.id !== activeProduct.value.id && p.category === activeProduct.value.category)
    .slice(0, 4)
})

// Cart Computations
const cartItemCount = computed(() => {
  return (shop.cart || []).reduce((sum, item) => sum + item.quantity, 0)
})

const cartSubtotal = computed(() => {
  return (shop.cart || []).reduce((sum, item) => sum + (item.price * item.quantity), 0)
})

const shippingCost = computed(() => {
  if (cartSubtotal.value === 0) return 0
  return 35
})

const discountAmount = computed(() => {
  return Math.round((cartSubtotal.value * discountPercent.value) / 100)
})

const cartTotal = computed(() => {
  return Math.max(0, cartSubtotal.value - discountAmount.value + shippingCost.value)
})

// Add to cart helper
function addToCart(product, variant = null, buyNow = false) {
  const targetVariant = variant || (product.variants && product.variants.find(v => v.stock > 0)) || product.variants?.[0]
  if (!targetVariant || targetVariant.stock <= 0) {
    shop.notify('Désolé, cet article est en rupture de stock')
    return
  }

  const existingIndex = shop.cart.findIndex(i => i.productId === product.id && i.variantId === targetVariant.id)
  let addedIndex = -1

  if (existingIndex > -1) {
    if (shop.cart[existingIndex].quantity < targetVariant.stock) {
      shop.cart[existingIndex].quantity++
      addedIndex = existingIndex
    } else {
      shop.notify('Stock maximum atteint pour cet article')
    }
  } else {
    shop.cart.push({
      productId: product.id,
      variantId: targetVariant.id,
      name: product.name,
      category: product.category,
      price: product.price,
      image: getProductImage(product),
      size: targetVariant.size || 'Unique',
      color: targetVariant.color || 'Standard',
      quantity: 1,
      available: targetVariant.stock
    })
    addedIndex = shop.cart.length - 1
  }

  if (buyNow) {
    checkoutOpen.value = true
  } else if (addedIndex > -1) {
    openUndoToast(product, targetVariant, addedIndex)
  }
}

// Complete Order
async function submitOrder() {
  if (!orderForm.value.name.trim()) return shop.notify('Veuillez entrer votre nom complet')
  if (!/^(06|07|05)[0-9]{8}$/.test(orderForm.value.phone.trim())) return shop.notify('Veuillez entrer un numéro de téléphone marocain valide (10 chiffres, ex: 0612345678)')
  if (!orderForm.value.city) return shop.notify('Veuillez choisir votre ville')
  if (!orderForm.value.address.trim()) return shop.notify('Veuillez entrer votre adresse de livraison')
  if (!shop.cart.length) return shop.notify('Votre panier est vide')

  isSubmitting.value = true

  try {
    const trackingId = `ALP-${Date.now().toString(36).toUpperCase()}`
    
    const details = {
      customer: {
        name: orderForm.value.name.trim(),
        phone: orderForm.value.phone.trim(),
        city: orderForm.value.city,
        cityId: orderForm.value.cityId,
        address: orderForm.value.address.trim(),
        note: orderForm.value.note.trim()
      },
      shipping: shippingCost.value,
      discount: discountAmount.value,
      paidAmount: 0,
      source: 'storefront',
      status: 'unconfirmed'
    }

    const cartSnapshot = JSON.parse(JSON.stringify(shop.cart))
    const totalAmount = cartTotal.value
    await shop.checkout('Paiement à la livraison (COD)', details)

    orderSuccess.value = {
      trackingId,
      name: orderForm.value.name,
      phone: orderForm.value.phone,
      city: orderForm.value.city,
      address: orderForm.value.address,
      total: totalAmount,
      items: cartSnapshot
    }

    shop.clearCart()
    checkoutOpen.value = false
    cartOpen.value = false
    
  } catch (err) {
    console.error(err)
    shop.notify('Erreur lors de la validation. Veuillez réessayer.')
  } finally {
    isSubmitting.value = false
  }
}

function getWhatsAppOrderLink(order) {
  const phone = '212641432859'
  const msg = `Salam ALPHA SHOP! N9ad nttaba3 l-commande dyali:\n📦 N° Commande: ${order.trackingId}\n👤 Nom: ${order.name}\n📍 Ville: ${order.city}\n💰 Total: ${order.total} DH`
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
}

function getProductImage(product) {
  if (Array.isArray(product.images) && product.images.length > 0 && product.images[0]) return product.images[0]
  if (product.image) return product.image
  
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    const v = product.variants.find(v => v.image || (Array.isArray(v.images) && v.images.length > 0))
    if (v) {
      if (Array.isArray(v.images) && v.images.length > 0) return v.images[0]
      if (v.image) return v.image
    }
  }

  const cat = (product.category || '').toLowerCase()
  if (cat.includes('chemise')) return 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=80'
  if (cat.includes('ensemble')) return 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80'
  if (cat.includes('t-shirt') || cat.includes('polo')) return 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80'
  if (cat.includes('pantalon') || cat.includes('cargo')) return 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1000&q=80'
  if (cat.includes('hoodie') || cat.includes('jacket')) return 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1000&q=80'
  return 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=1000&q=80'
}

function getProductImagesList(product) {
  if (Array.isArray(product.images) && product.images.length > 0) return product.images
  if (product.image) return [product.image]
  return [getProductImage(product)]
}
</script>

<template>
  <div :class="['storefront-root', currentLang === 'ar' ? 'rtl-mode' : '']" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'">
    
    <!-- Top Announcement Bar -->
    <div class="top-announcement">
      <span>{{ currentLang === 'ar' ? '✨ توصيل سريع 24/48 ساعة لجميع المدن المغربية' : '✨ Livraison 24/48H partout au Maroc' }}</span>
      <span class="sep">|</span>
      <span>{{ currentLang === 'ar' ? '📦 الدفع عند الاستلام (COD)' : '📦 Paiement à la livraison (COD)' }}</span>
    </div>

    <!-- Apple-Style Glassmorphic Navbar -->
    <header class="store-nav">
      <div class="nav-container">
        
        <!-- Left: Logo & Back navigation -->
        <div class="nav-brand-group">
          <button 
            v-if="currentPage === 'product'" 
            @click="backToHome"
            class="back-btn"
            :title="currentLang === 'ar' ? 'الرجوع للمتجر' : 'Retour au catalogue'"
          >
            <ArrowLeft :size="18" />
          </button>

          <div class="logo-box" @click="backToHome">
            <img src="/alpha-logo.png" alt="ALPHASHOP07" style="height:36px; width:auto; object-fit:contain;" />
            <span class="brand-text">ALPHASHOP<sup>07</sup><span class="dot">.</span></span>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="nav-search">
          <Search :size="14" class="search-icon" />
          <input 
            v-model="searchQuery"
            type="text" 
            :placeholder="currentLang === 'ar' ? 'ابحث عن الملابس، القمصان، الشورتات...' : 'Rechercher vêtements, chemises, cargous...'" 
          />
          <button v-if="searchQuery" @click="searchQuery = ''" class="clear-search">
            <X :size="12" />
          </button>
        </div>

        <!-- Right: Actions Buttons -->
        <div class="nav-actions">
          
          <!-- Language Switcher Button -->
          <button 
            @click="toggleLang"
            class="lang-switch-btn"
            :title="currentLang === 'ar' ? 'Changer en Français' : 'التحويل للعربية'"
          >
            <span>{{ currentLang === 'ar' ? '🇫🇷 FR' : '🇲🇦 العربية' }}</span>
          </button>



          <!-- Shopping Cart Button -->
          <button 
            @click="cartOpen = true"
            class="cart-btn"
          >
            <ShoppingBag :size="16" />
            <span class="desktop-only">{{ currentLang === 'ar' ? 'السلة' : 'Panier' }}</span>
            <span v-if="cartItemCount > 0" class="cart-badge">
              {{ cartItemCount }}
            </span>
          </button>
        </div>
      </div>
    </header>

    <!-- PAGE 1: HOME CATALOGUE VIEW -->
    <div v-if="currentPage === 'home'">
      
      <!-- FULL-WIDTH PURE IMAGE HERO BANNER SHOWCASE -->
      <section 
        class="store-hero-slider-full"
        @mouseenter="stopHeroAutoScroll"
        @mouseleave="startHeroAutoScroll"
      >
        <div 
          v-for="(slide, idx) in heroSlides" 
          :key="idx"
          :class="['full-slide-item', currentHeroIndex === idx ? 'active' : '']"
        >
          <!-- Ambient Blurred Backdrop -->
          <div class="hero-blur-bg" :style="{ backgroundImage: `url(${slide.image})` }"></div>
          <div class="hero-dark-overlay"></div>
          
          <!-- Slide Inner Content -->
          <div class="hero-slide-inner">
            <!-- Left Info Box -->
            <div class="hero-floating-overlay">
              <span class="eyebrow-badge">{{ slide.eyebrow }}</span>
              <h2 class="slide-title">{{ slide.title }}</h2>
              <p class="slide-subtitle">{{ slide.subtitle }}</p>
              <button @click="selectedCategory = slide.category" class="slide-cta-btn">
                {{ currentLang === 'ar' ? 'اكتشف التشكيلة' : 'Découvrir la collection' }} <ChevronRight :size="14" />
              </button>
            </div>

            <!-- Right Full Aspect Model Card -->
            <div class="hero-model-card">
              <img :src="slide.image" :alt="slide.title" class="hero-model-img" />
            </div>
          </div>
        </div>

        <!-- Slider Arrow Navigation -->
        <button @click="prevHeroSlide" class="slider-arrow prev" :title="currentLang === 'ar' ? 'السابق' : 'Précédent'">
          <ChevronLeft :size="18" />
        </button>
        <button @click="nextHeroSlide" class="slider-arrow next" :title="currentLang === 'ar' ? 'التالي' : 'Suivant'">
          <ChevronRight :size="18" />
        </button>

        <!-- Slider Dots Indicators -->
        <div class="slider-dots">
          <button 
            v-for="(slide, idx) in heroSlides" 
            :key="idx"
            @click="setHeroSlide(idx)"
            :class="['dot-btn', currentHeroIndex === idx ? 'active' : '']"
          ></button>
        </div>
      </section>

      <!-- APPLE-STYLE TOP HORIZONTAL CATEGORY & FILTER BAR -->
      <div class="store-layout-container">
        <nav class="top-filter-bar">
        <div class="filter-controls-row">
          
          <!-- Category Selector Dropdown -->
          <div class="select-wrapper">
            <label>{{ currentLang === 'ar' ? 'التصنيف:' : 'Catégorie:' }}</label>
            <select v-model="selectedCategory" class="cat-select-inline">
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.icon }} {{ cat.name }}
              </option>
            </select>
          </div>

          <!-- Size Filter Chips -->
          <div class="size-filter-inline">
            <label>{{ currentLang === 'ar' ? 'المقاس:' : 'Taille:' }}</label>
            <div class="size-chips-wrapper">
              <button 
                v-for="sz in availableSizes"
                :key="sz"
                @click="selectedSize = sz"
                :class="['size-pill', selectedSize === sz ? 'active' : '']"
              >
                {{ sz === 'Tous' ? (currentLang === 'ar' ? 'الكل' : 'Tous') : sz }}
              </button>
            </div>
          </div>

          <!-- Reset Filters Button -->
          <button 
            v-if="selectedCategory !== 'Tous' || selectedSize !== 'Tous' || maxPriceLimit < 1000"
            @click="selectedCategory = 'Tous'; selectedSize = 'Tous'; maxPriceLimit = 1000"
            class="reset-btn-inline"
          >
            {{ currentLang === 'ar' ? 'إعادة ضبط' : 'Réinitialiser' }}
          </button>
        </div>

        <!-- Horizontal Category Pills Scrollbar -->
        <div class="horizontal-pills-bar">
          <button 
            v-for="cat in categories" 
            :key="cat.id"
            @click="selectedCategory = cat.id"
            :class="['cat-pill-btn', selectedCategory === cat.id ? 'active' : '']"
          >
            <span>{{ cat.icon }}</span>
            <span>{{ cat.name }}</span>
          </button>
        </div>
      </nav>

      <!-- PRODUCTS CATALOGUE GRID (100% Full Width, Clean & Unobstructed) -->
      <main class="fullwidth-products-main">
        
        <div class="catalogue-header-info">
          <h2>{{ selectedCategory !== 'Tous' ? selectedCategory : (currentLang === 'ar' ? 'جميع الملابس والتشكيلات' : 'Tous les vêtements') }}</h2>
          <span class="count-badge">{{ filteredProducts.length }} {{ currentLang === 'ar' ? 'منتج' : 'produits' }}</span>
        </div>

        <!-- Products Cards Grid (2 cols mobile, 3 tablet, 4 desktop) -->
        <div v-if="filteredProducts.length > 0" class="products-grid-full">
          <div 
            v-for="product in filteredProducts" 
            :key="product.id"
            @click="openProductDetail(product)"
            class="product-card-modern"
          >
            <div>
              <!-- Image Box -->
              <div class="image-wrapper">
                <img 
                  :src="getProductImage(product)" 
                  :alt="product.name"
                  loading="lazy"
                />
                <span class="category-badge font-bold">
                  {{ product.category || 'Vêtement' }}
                </span>
              </div>

              <!-- Product Info -->
              <div class="details-body">
                <h3 class="product-title">
                  {{ product.name }}
                </h3>
                <div class="price-tag">
                  {{ product.price }} <small>DH</small>
                </div>
              </div>
            </div>

            <!-- Action Button -->
            <div class="card-action-box">
              <button 
                @click.stop="openProductDetail(product)"
                class="action-btn"
              >
                {{ currentLang === 'ar' ? 'طلب سريع / معاينة' : 'Découvrir' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-catalogue-box">
          <Search :size="36" class="empty-icon" />
          <h3>{{ currentLang === 'ar' ? 'لم يتم العثور على أي منتج' : 'Aucun produit trouvé' }}</h3>
          <p>{{ currentLang === 'ar' ? 'جرب تغيير التصنيف أو فلاتر البحث.' : 'Essayez de changer la catégorie أو les filtres.' }}</p>
        </div>
      </main>
      </div> <!-- End of store-layout-container -->
    </div>


    <!-- PAGE 2: DEDICATED SINGLE PRODUCT DETAIL VIEW (Apple Store Layout) -->
    <div v-else-if="currentPage === 'product' && activeProduct" class="single-product-container">
      
      <!-- Breadcrumb Navigation -->
      <nav class="breadcrumb">
        <button @click="backToHome">{{ currentLang === 'ar' ? 'الرئيسية' : 'Accueil' }}</button>
        <ChevronRight :size="12" />
        <button @click="selectedCategory = activeProduct.category; backToHome()">{{ activeProduct.category }}</button>
        <ChevronRight :size="12" />
        <span class="current">{{ activeProduct.name }}</span>
      </nav>

      <!-- Main Product Grid: Gallery Left + Sticky Purchase Card Right -->
      <div class="product-detail-grid">
        
        <!-- LEFT: Photo Gallery Showcase -->
        <div class="gallery-col">
          <div class="main-display-box">
            <img 
              :src="currentDisplayImage" 
              :alt="activeProduct.name" 
            />
          </div>

          <!-- Thumbnails Selector Gallery -->
          <div v-if="activeProductImages.length > 1" class="thumbnails-bar">
            <img 
              v-for="(img, idx) in activeProductImages" 
              :key="idx"
              :src="img"
              @click="activeImageIndex = idx; startAutoScroll()"
              :class="['thumb-img', activeImageIndex === idx ? 'active' : '']"
            />
          </div>
        </div>

        <!-- RIGHT: Sticky Product Details & COD Order Card -->
        <div class="purchase-card-col">
          <div class="product-info-box">
            <span class="cat-badge">{{ activeProduct.category }}</span>
            <h1>{{ activeProduct.name }}</h1>
            <div class="price-large">
              {{ activeProduct.price }} <small>DH</small>
            </div>
          </div>

          <!-- Interactive Visual Color Swatches -->
          <div v-if="availableColors.length > 0" class="color-selector-box">
            <label>{{ currentLang === 'ar' ? 'اختر اللون:' : 'Choisir la couleur:' }}</label>
            <div class="swatches-flex-group">
              <button
                v-for="c in availableColors"
                :key="c"
                type="button"
                @click="onColorSelect(c)"
                :class="['color-swatch-chip', selectedColor === c ? 'active' : '']"
              >
                <span 
                  class="swatch-color-dot" 
                  :style="{ backgroundColor: getColorHex(c), border: c.toLowerCase().includes('blanc') ? '1px solid #cbd5e1' : 'none' }"
                >
                  <Check v-if="selectedColor === c" :size="11" :style="{ color: c.toLowerCase().includes('blanc') ? '#1d1d1f' : '#ffffff' }" />
                </span>
                <span class="swatch-text">{{ formatColorName(c) }}</span>
              </button>
            </div>
          </div>

          <!-- Size Selector -->
          <div class="size-selector-box">
            <label>{{ currentLang === 'ar' ? 'اختر المقاس:' : 'Choisir la taille (Size):' }}</label>
            <div class="size-buttons">
              <button 
                v-for="v in filteredVariantsByColor" 
                :key="v.id"
                @click="selectedVariant = v; activeImageIndex = 0; startAutoScroll()"
                :disabled="v.stock <= 0"
                :class="[
                  'size-btn',
                  selectedVariant?.id === v.id ? 'active' : '',
                  v.stock <= 0 ? 'out-of-stock' : ''
                ]"
              >
                {{ v.size || 'M' }}
              </button>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="cta-buttons">
            <button 
              @click="addToCart(activeProduct, selectedVariant, true)"
              class="buy-now-btn"
            >
              <span>{{ currentLang === 'ar' ? 'شراء الآن (الدفع عند الاستلام)' : 'Acheter Maintenant (COD)' }}</span>
            </button>

            <button 
              @click="addToCart(activeProduct, selectedVariant, false)"
              class="add-cart-btn"
            >
              <ShoppingBag :size="16" />
              <span>{{ currentLang === 'ar' ? 'إضافة إلى السلة' : 'Ajouter au Panier' }}</span>
            </button>
          </div>

          <!-- Accordion Product Specs -->
          <div class="specs-accordion">
            <div class="spec-row">
              <ShieldCheck :size="18" class="icon" />
              <div>
                <b>{{ currentLang === 'ar' ? 'جودة مضمونة:' : 'Qualité Garantie:' }}</b> {{ currentLang === 'ar' ? 'قماش قطني 100% عالي الجودة ومريح للغاية.' : 'Tissu 100% Coton Premium ultra-confortable.' }}
              </div>
            </div>

            <div class="spec-row">
              <Truck :size="18" class="icon" />
              <div>
                <b>{{ currentLang === 'ar' ? 'توصيل سريع:' : 'Expédition Express:' }}</b> {{ currentLang === 'ar' ? 'يصلك الطلب خلال 24 إلى 48 ساعة إلى باب منزلك.' : 'Colis livré en 24h à 48h à votre domicile.' }}
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Related Products Carousel -->
      <section v-if="relatedProducts.length > 0" class="related-section">
        <h2>{{ currentLang === 'ar' ? 'منتجات ذات صلة' : 'Produits Similaires' }}</h2>
        
        <div class="related-grid">
          <div 
            v-for="p in relatedProducts" 
            :key="p.id"
            @click="openProductDetail(p)"
            class="related-card"
          >
            <div class="img-box">
              <img :src="getProductImage(p)" :alt="p.name" />
            </div>
            <div class="body">
              <h4>{{ p.name }}</h4>
              <strong>{{ p.price }} DH</strong>
            </div>
          </div>
        </div>
      </section>

    </div>

    <!-- UNDO TOAST -->
    <div v-if="undoToast" class="undo-toast-container">
      <div class="undo-toast-content">
        <div class="undo-info">
          <CheckCircle2 :size="18" style="color:#059669; flex-shrink:0" />
          <div style="display:flex; flex-direction:column; gap:2px;">
            <strong>{{ undoToast.product.name }}</strong>
            <span style="font-size:11px; color:#6e6e73;">{{ currentLang === 'ar' ? 'أضيف إلى السلة' : 'Ajouté au panier' }} ({{ undoToast.timeLeft }}s)</span>
          </div>
        </div>
        <button class="undo-btn" @click="executeUndo">{{ currentLang === 'ar' ? 'تراجع' : 'Annuler' }}</button>
      </div>
      <div class="undo-progress-bar">
        <div class="undo-progress-fill" :style="{ width: (undoToast.timeLeft / 5 * 100) + '%' }"></div>
      </div>
    </div>

    <!-- CART DRAWER -->
    <div v-if="cartOpen" class="modal-backdrop" @click="cartOpen = false">
      <div class="cart-panel" @click.stop>
        <div class="panel-header">
          <h3>{{ currentLang === 'ar' ? 'سلة المشتريات' : 'Mon Panier' }} ({{ cartItemCount }})</h3>
          <button @click="cartOpen = false"><X :size="18" /></button>
        </div>

        <div class="panel-body">
          <div v-if="shop.cart.length > 0" class="cart-items-list">
            <div 
              v-for="item in shop.cart" 
              :key="item.variantId"
              class="cart-item-card"
            >
              <img :src="item.image" :alt="item.name" class="item-thumb" />
              
              <div class="item-info">
                <h4>{{ item.name }}</h4>
                <p>{{ currentLang === 'ar' ? 'المقاس:' : 'Taille:' }} {{ item.size }}</p>
                <strong>{{ item.price * item.quantity }} DH</strong>
              </div>

              <div class="qty-box">
                <button @click="shop.decrementCartLine(item)"><Minus :size="12" /></button>
                <span>{{ item.quantity }}</span>
                <button @click="shop.incrementCartLine(item)"><Plus :size="12" /></button>
              </div>

              <button @click="shop.removeCartLine(item.variantId)" class="remove-btn">
                <Trash2 :size="16" />
              </button>
            </div>
          </div>

          <div v-else class="empty-cart-view">
            <ShoppingBag :size="40" />
            <p>{{ currentLang === 'ar' ? 'سلتك فارغة حالياً' : 'Votre panier est vide' }}</p>
          </div>
        </div>

        <div v-if="shop.cart.length > 0" class="panel-footer">
          <div class="total-row">
            <span>{{ currentLang === 'ar' ? 'المجموع الكلي:' : 'Total:' }}</span>
            <strong>{{ cartTotal }} DH</strong>
          </div>

          <button 
            @click="checkoutOpen = true; cartOpen = false"
            class="checkout-btn"
          >
            {{ currentLang === 'ar' ? 'متابعة الطلب (الدفع عند الاستلام)' : 'Passer la Commande (COD)' }}
          </button>
        </div>
      </div>
    </div>

    <!-- COD CHECKOUT MODAL -->
    <div v-if="checkoutOpen" class="modal-backdrop" @click="checkoutOpen = false">
      <div class="modal-card" @click.stop>
        <button @click="checkoutOpen = false" class="close-icon-btn"><X :size="18" /></button>

        <h2>{{ currentLang === 'ar' ? 'إتمام الطلب' : 'Passer la Commande' }}</h2>
        <p class="subtitle">{{ currentLang === 'ar' ? 'الدفع نقدًا عند الاستلام فـ جميع المدن المغربية' : 'Paiement à la livraison (الدفع عند الاستلام)' }}</p>

        <form @submit.prevent="submitOrder" class="checkout-form">
          <div class="form-group">
            <label>{{ currentLang === 'ar' ? 'الاسم الكامل' : 'Nom & Prénom' }}</label>
            <input 
              v-model="orderForm.name"
              type="text" 
              required
              :placeholder="currentLang === 'ar' ? 'مثال: محمد أمين' : 'Ex: Mohamed Amine'"
            />
          </div>

          <div class="form-group">
            <label>{{ currentLang === 'ar' ? 'رقم الهاتف' : 'Téléphone' }}</label>
            <input 
              v-model="orderForm.phone"
              type="tel" 
              required
              pattern="^(06|07|05)[0-9]{8}$"
              title="Numéro marocain (ex: 0612345678)"
              placeholder="06XX-XXXXXX"
            />
          </div>

          <div class="form-group relative">
            <label>{{ currentLang === 'ar' ? 'المدينة' : 'Ville' }}</label>
            <input 
              v-model="citySearchQuery"
              @focus="showCityDropdown = true"
              @input="showCityDropdown = true"
              type="text" 
              :placeholder="currentLang === 'ar' ? 'اختر مدينتك...' : 'Sélectionnez votre ville...'"
            />

            <div v-if="showCityDropdown" class="city-dropdown-list">
              <div 
                v-for="c in filteredCities" 
                :key="c.id"
                @click="selectCity(c)"
                class="city-option"
              >
                {{ c.name }}
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>{{ currentLang === 'ar' ? 'عنوان التسليم الكامل' : 'Adresse de livraison' }}</label>
            <textarea 
              v-model="orderForm.address"
              rows="2"
              required
              :placeholder="currentLang === 'ar' ? 'العنوان بالتفصيل...' : 'Adresse complète...'"
            ></textarea>
          </div>

          <div class="order-summary-box">
            <div class="summary-line">
              <span>{{ currentLang === 'ar' ? 'المجموع الفرعي:' : 'Sous-total:' }}</span>
              <strong>{{ cartSubtotal }} DH</strong>
            </div>
            <div class="summary-line">
              <span>{{ currentLang === 'ar' ? 'مصاريف الشحن:' : 'Livraison:' }}</span>
              <strong>{{ shippingCost === 0 ? (currentLang === 'ar' ? 'مجاني' : 'Gratuit') : `${shippingCost} DH` }}</strong>
            </div>
            <div class="summary-line final-total">
              <span>{{ currentLang === 'ar' ? 'المجموع الكلي عند الاستلام:' : 'Total à payer à la livraison:' }}</span>
              <strong class="highlight-price">{{ cartTotal }} DH</strong>
            </div>
          </div>

          <button 
            type="submit"
            :disabled="isSubmitting"
            class="submit-order-button"
          >
            <span v-if="!isSubmitting">{{ currentLang === 'ar' ? 'تأكيد الطلب الآن' : 'Valider la commande' }}</span>
            <span v-else>{{ currentLang === 'ar' ? 'جاري المعالجة...' : 'Traitement...' }}</span>
          </button>
        </form>
      </div>
    </div>

    <!-- ORDER SUCCESS CONFIRMATION -->
    <div v-if="orderSuccess" class="modal-backdrop">
      <div class="modal-card text-center">
        <div class="success-icon-badge">
          <CheckCircle2 :size="32" />
        </div>

        <h2>{{ currentLang === 'ar' ? 'تم تأكيد طلبك بنجاح! 🎉' : 'Commande Confirmée! 🎉' }}</h2>
        <p class="subtitle">{{ currentLang === 'ar' ? 'شكراً لثقتكم فـ ALPHASHOP07.' : 'Merci pour votre confiance.' }}</p>

        <div class="order-details-card">
          <div class="detail-row">
            <span>{{ currentLang === 'ar' ? 'رقم الطلب:' : 'N° Commande:' }}</span>
            <strong>{{ orderSuccess.trackingId }}</strong>
          </div>
          <div class="detail-row">
            <span>{{ currentLang === 'ar' ? 'الاسم:' : 'Nom:' }}</span>
            <strong>{{ orderSuccess.name }}</strong>
          </div>
          <div class="detail-row total">
            <span>{{ currentLang === 'ar' ? 'المجموع الكلي:' : 'Total COD:' }}</span>
            <strong class="highlight-price">{{ orderSuccess.total }} DH</strong>
          </div>
        </div>

        <div class="success-actions">
          <a 
            :href="getWhatsAppOrderLink(orderSuccess)"
            target="_blank"
            class="wa-track-btn"
          >
            <span>{{ currentLang === 'ar' ? 'تتبع الطلب عبر الواتساب (WhatsApp)' : 'التتبع عبر الواتساب (WhatsApp)' }}</span>
          </a>

          <button 
            @click="orderSuccess = null; backToHome()"
            class="secondary-close-btn"
          >
            {{ currentLang === 'ar' ? 'إغلاق' : 'Fermer' }}
          </button>
        </div>
      </div>
    </div>

    <!-- APPLE-STYLE MINIMALIST DARK BLACK STOREFRONT FOOTER -->
    <footer class="store-footer-dark">
      <div class="footer-grid-container">
        <!-- Col 1: Brand & Logo -->
        <div class="footer-col brand-col">
          <div class="logo-box-dark" @click="backToHome">
            <img src="/alpha-logo.png" alt="ALPHASHOP07" style="height:42px; width:auto; object-fit:contain; filter:brightness(0) invert(1);" />
            <span class="brand-text-dark">ALPHASHOP<sup>07</sup><span class="dot">.</span></span>
          </div>
          <p class="brand-desc-dark">
            {{ currentLang === 'ar' ? 'ماركة مغربية للملابس الرجالية العصرية. أناقة تبدأ من التفاصيل المريحة والتصاميم العالية الجودة.' : 'Marque marocaine de vêtements pour hommes. Élégance minimaliste, coupes oversized et matières premium sélectionnées avec soin.' }}
          </p>
        </div>

        <!-- Col 2: Fast Collection Links -->
        <div class="footer-col">
          <h4 class="footer-heading">{{ currentLang === 'ar' ? 'التشكيلات' : 'Collections' }}</h4>
          <ul class="footer-links">
            <li><button @click="selectedCategory = 'Chemises'; backToHome()">👔 {{ currentLang === 'ar' ? 'قمصان صيفية' : 'Chemises Lin & Coton' }}</button></li>
            <li><button @click="selectedCategory = 'Ensembles'; backToHome()">👕 {{ currentLang === 'ar' ? 'أطقم ملابس' : 'Ensembles 2-Pièces' }}</button></li>
            <li><button @click="selectedCategory = 'T-Shirts & Polos'; backToHome()">👕 {{ currentLang === 'ar' ? 'تيشيرتات أوفرسايز' : 'T-Shirts Heavyweight' }}</button></li>
            <li><button @click="selectedCategory = 'Shorts'; backToHome()">🩳 {{ currentLang === 'ar' ? 'شورتات وبرمودا' : 'Shorts & Bermudas' }}</button></li>
            <li><button @click="selectedCategory = 'Pantalons & Cargos'; backToHome()">👖 {{ currentLang === 'ar' ? 'سراويل وكارغو' : 'Pantalons & Cargos' }}</button></li>
          </ul>
        </div>

        <!-- Col 3: Customer Service & Services -->
        <div class="footer-col">
          <h4 class="footer-heading">{{ currentLang === 'ar' ? 'خدماتنا وتعهداتنا' : 'Engagements & Services' }}</h4>
          <ul class="footer-info-list">
            <li><span>🚚 {{ currentLang === 'ar' ? 'توصيل سريع 24h/48h' : 'Livraison Express 24h/48h' }}</span></li>
            <li><span>📦 {{ currentLang === 'ar' ? 'الدفع عند الاستلام (COD)' : 'Paiement à la livraison (COD)' }}</span></li>
            <li><span>🔁 {{ currentLang === 'ar' ? 'ضمان تغيير المقاس' : 'Échange de taille garanti' }}</span></li>
            <li><span>🇲🇦 {{ currentLang === 'ar' ? 'توصيل لجميع المدن المغربية' : 'Livraison partout au Maroc' }}</span></li>
          </ul>
        </div>

        <!-- Col 4: WhatsApp Contact & Hours -->
        <div class="footer-col contact-col">
          <h4 class="footer-heading">{{ currentLang === 'ar' ? 'خدمة العملاء' : 'Service Client' }}</h4>
          <p class="contact-sub">{{ currentLang === 'ar' ? 'طيلة أيام الأسبوع: من 09:00 إلى 22:00' : 'Du Lundi au Dimanche: 09h00 - 22h00' }}</p>
          <a 
            href="https://wa.me/212641432859?text=Salam%20ALPHASHOP07!" 
            target="_blank" 
            class="wa-footer-btn-dark"
          >
            <MessageCircle :size="18" />
            <span>WhatsApp: <b>06 41 43 28 59</b></span>
          </a>
        </div>
      </div>

      <!-- Footer Bottom Bar -->
      <div class="footer-bottom-dark">
        <div class="bottom-container">
          <p>© 2026 ALPHASHOP07. {{ currentLang === 'ar' ? 'جميع الحقوق محفوظة.' : 'Tous droits réservés.' }}</p>
          <span class="morocco-badge">🇲🇦 Made for Morocco</span>
        </div>
      </div>
    </footer>

  </div>
</template>

<style scoped>
.storefront-root {
  min-height: 100vh;
  background-color: #f5f5f7;
  color: #1d1d1f;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
  padding-bottom: 0;
}

/* Top Announcement */
.top-announcement {
  background-color: #1d1d1f;
  color: #f5f5f7;
  font-size: 11px;
  padding: 8px 16px;
  text-align: center;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.top-announcement .sep {
  color: #424245;
}

/* Nav */
.store-nav {
  position: sticky;
  top: 0;
  z-index: 40;
  background-color: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #e5e5e7;
}
.nav-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 16px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.nav-brand-group {
  display: flex;
  align-items: center;
  gap: 10px;
}
.back-btn {
  padding: 6px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #1d1d1f;
  cursor: pointer;
}
.back-btn:hover {
  background-color: #e5e5e7;
}
.logo-box {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}
.wolf-icon {
  width: 34px;
  height: 34px;
  background-color: #1d1d1f;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}
.wolf-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: invert(1);
}
.brand-text {
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -0.5px;
  color: #1d1d1f;
}
.brand-text .dot {
  color: #0071e3;
}

/* Nav Search */
.nav-search {
  position: relative;
  flex: 1;
  max-width: 400px;
  display: flex;
  align-items: center;
}
.nav-search input {
  width: 100%;
  background-color: #f5f5f7;
  border: 1px solid #e5e5e7;
  border-radius: 20px;
  padding: 7px 16px 7px 34px;
  font-size: 12px;
  color: #1d1d1f;
  outline: none;
}
.nav-search input:focus {
  background-color: #ffffff;
  border-color: #0071e3;
}
.nav-search .search-icon {
  position: absolute;
  left: 12px;
  color: #86868b;
}
.clear-search {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  color: #86868b;
  cursor: pointer;
}

/* Actions */
.nav-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.lang-switch-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background-color: #ffffff;
  border: 1px solid #0071e3;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 800;
  color: #0071e3;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 113, 227, 0.15);
}
.lang-switch-btn:hover {
  background-color: #0071e3;
  color: #ffffff;
}

/* RTL Mode Adjustments */
.rtl-mode {
  direction: rtl;
  text-align: right;
  font-family: -apple-system, BlinkMacSystemFont, "Tajawal", "Segoe UI", Roboto, sans-serif;
}
.rtl-mode .nav-search .search-icon {
  right: 12px;
  left: auto;
}
.rtl-mode .nav-search input {
  padding: 7px 34px 7px 16px;
}
.rtl-mode .clear-search {
  left: 10px;
  right: auto;
}
.rtl-mode .hero-floating-overlay {
  text-align: right;
}

.admin-switch-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background-color: #f5f5f7;
  border: 1px solid #e5e5e7;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: #1d1d1f;
  cursor: pointer;
}
.cart-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 16px;
  background-color: #1d1d1f;
  color: #ffffff;
  border: none;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.cart-badge {
  background-color: #0071e3;
  color: #ffffff;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 10px;
  font-weight: 900;
}

/* Store Layout Container */
.store-layout-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 16px;
}

/* Full-Width Pure Image Hero Banner Showcase */
.store-hero-slider-full {
  position: relative;
  width: 100%;
  height: 380px;
  overflow: hidden;
  margin-bottom: 24px;
  background-color: #0f0f12;
}
@media (min-width: 768px) {
  .store-hero-slider-full {
    height: 480px;
  }
}

.full-slide-item {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.6s ease-in-out;
}
.full-slide-item.active {
  opacity: 1;
}

.hero-blur-bg {
  position: absolute;
  inset: -20px;
  background-size: cover;
  background-position: center;
  filter: blur(24px) brightness(0.6);
  transform: scale(1.1);
}

.hero-dark-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(15,15,18,0.85) 0%, rgba(15,15,18,0.4) 50%, rgba(15,15,18,0.85) 100%);
}

.hero-slide-inner {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  box-sizing: border-box;
}
@media (min-width: 768px) {
  .hero-slide-inner {
    padding: 40px 60px;
  }
}

.hero-model-card {
  height: 100%;
  max-height: 400px;
  border-radius: 20px;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 15px 35px rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.2);
}
@media (max-width: 767px) {
  .hero-slide-inner {
    flex-direction: column-reverse;
    justify-content: center;
    gap: 20px;
    padding: 16px;
  }
  .hero-model-card {
    height: 180px;
    width: auto;
    border-radius: 12px;
  }
}
.hero-model-img {
  height: 100%;
  width: auto;
  object-fit: contain;
}

.hero-floating-overlay {
  max-width: 480px;
  background: rgba(15, 15, 18, 0.82);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 24px;
  padding: 28px;
  color: #ffffff;
  box-shadow: 0 10px 30px rgba(0,0,0,0.35);
}
@media (max-width: 639px) {
  .hero-floating-overlay {
    width: 100%;
    padding: 20px;
  }
}

.eyebrow-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 800;
  color: #60a5fa;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}
.slide-title {
  font-size: 24px;
  font-weight: 900;
  margin: 0 0 6px;
  line-height: 1.2;
  color: #ffffff;
}
@media (min-width: 768px) {
  .slide-title {
    font-size: 32px;
  }
}
.slide-subtitle {
  font-size: 13px;
  color: #cbd5e1;
  margin: 0 0 14px;
}
.slide-cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 20px;
  background-color: #ffffff;
  color: #1d1d1f;
  border: none;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
}
.slide-cta-btn:hover {
  background-color: #0071e3;
  color: #ffffff;
}

/* Slider Controls */
.slider-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.9);
  border: 1px solid #e5e5e7;
  color: #1d1d1f;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.slider-arrow:hover {
  background-color: #1d1d1f;
  color: #ffffff;
  border-color: #1d1d1f;
}
.slider-arrow.prev { left: 10px; }
.slider-arrow.next { right: 10px; }

.slider-dots {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  z-index: 10;
}
.dot-btn {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #d2d2d7;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}
.dot-btn.active {
  width: 24px;
  border-radius: 10px;
  background-color: #0071e3;
}

/* TOP HORIZONTAL FILTER BAR (Apple Store Clean Style) */
.top-filter-bar {
  background-color: #ffffff;
  border: 1px solid #e5e5e7;
  border-radius: 20px;
  padding: 14px 16px;
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.02);
}

.filter-controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.select-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  color: #6e6e73;
}
.cat-select-inline {
  background-color: #f5f5f7;
  border: 1px solid #e5e5e7;
  border-radius: 12px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
  color: #1d1d1f;
  outline: none;
}

.size-filter-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  color: #6e6e73;
}
.size-chips-wrapper {
  display: flex;
  gap: 6px;
}
.size-pill {
  padding: 4px 10px;
  border-radius: 10px;
  border: 1px solid #e5e5e7;
  background-color: #f5f5f7;
  font-size: 11px;
  font-weight: 700;
  color: #1d1d1f;
  cursor: pointer;
}
.size-pill.active {
  background-color: #0071e3;
  color: #ffffff;
  border-color: #0071e3;
}

.reset-btn-inline {
  background: none;
  border: none;
  color: #0071e3;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.horizontal-pills-bar {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-top: 4px;
  padding-bottom: 4px;
  border-top: 1px solid #f5f5f7;
}
.horizontal-pills-bar::-webkit-scrollbar {
  display: none;
}
.cat-pill-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background-color: #f5f5f7;
  border: 1px solid #e5e5e7;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  color: #1d1d1f;
  cursor: pointer;
  transition: all 0.2s ease;
}
.cat-pill-btn.active {
  background-color: #1d1d1f;
  color: #ffffff;
  border-color: #1d1d1f;
}

/* FULL-WIDTH PRODUCTS MAIN */
.fullwidth-products-main {
  width: 100%;
}
.catalogue-header-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.catalogue-header-info h2 {
  font-size: 20px;
  font-weight: 900;
  color: #1d1d1f;
  margin: 0;
}
.count-badge {
  font-size: 12px;
  color: #86868b;
  font-weight: 600;
}

/* Products Cards Grid (Full-width 100%) */
.products-grid-full {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
@media (min-width: 640px) {
  .products-grid-full {
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
}
@media (min-width: 1024px) {
  .products-grid-full {
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
  }
}

.product-card-modern {
  background-color: #ffffff;
  border: 1px solid #e5e5e7;
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.product-card-modern:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(0,0,0,0.06);
}
.image-wrapper {
  position: relative;
  aspect-ratio: 4/5;
  background-color: #f5f5f7;
  overflow: hidden;
}
.image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}
.product-card-modern:hover .image-wrapper img {
  transform: scale(1.05);
}
.category-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  background-color: rgba(255,255,255,0.92);
  color: #1d1d1f;
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 12px;
  border: 1px solid #e5e5e7;
}
.details-body {
  padding: 12px;
}
.product-title {
  font-size: 13px;
  font-weight: 800;
  color: #1d1d1f;
  margin: 0 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.price-tag {
  font-size: 15px;
  font-weight: 900;
  color: #1d1d1f;
}
.price-tag small {
  font-size: 11px;
  color: #86868b;
  font-weight: 600;
}
.card-action-box {
  padding: 0 12px 12px;
}
.action-btn {
  width: 100%;
  padding: 7px 0;
  background-color: #f5f5f7;
  color: #1d1d1f;
  border: 1px solid #e5e5e7;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}
.product-card-modern:hover .action-btn {
  background-color: #1d1d1f;
  color: #ffffff;
  border-color: #1d1d1f;
}

.empty-catalogue-box {
  text-align: center;
  padding: 60px 20px;
  background-color: #ffffff;
  border-radius: 20px;
  border: 1px solid #e5e5e7;
}
.empty-icon {
  color: #d2d2d7;
  margin-bottom: 8px;
}
.empty-catalogue-box h3 {
  font-size: 16px;
  font-weight: 800;
  margin: 0 0 4px;
}
.empty-catalogue-box p {
  color: #86868b;
  font-size: 12px;
  margin: 0;
}

/* SINGLE PRODUCT DETAIL PAGE */
.single-product-container {
  max-width: 1140px;
  margin: 0 auto;
  padding: 20px 16px;
}
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #86868b;
  margin-bottom: 24px;
}
.breadcrumb button {
  background: none;
  border: none;
  color: #86868b;
  cursor: pointer;
  padding: 0;
}
.breadcrumb button:hover {
  color: #1d1d1f;
}
.breadcrumb .current {
  color: #1d1d1f;
  font-weight: 800;
}

.product-detail-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 28px;
  align-items: start;
}
@media (min-width: 768px) {
  .product-detail-grid {
    grid-template-columns: 1.1fr 1fr;
    gap: 40px;
  }
}
.gallery-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.main-display-box {
  aspect-ratio: 4/5;
  background-color: #ffffff;
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid #e5e5e7;
}
.main-display-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.thumbnails-bar {
  display: flex;
  gap: 10px;
  overflow-x: auto;
}
.thumb-img {
  width: 64px;
  height: 80px;
  border-radius: 14px;
  object-fit: cover;
  border: 2px solid #e5e5e7;
  cursor: pointer;
  opacity: 0.6;
  transition: all 0.2s ease;
}
.thumb-img.active {
  border-color: #0071e3;
  opacity: 1;
}

.purchase-card-col {
  background-color: #ffffff;
  border: 1px solid #e5e5e7;
  border-radius: 24px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.cat-badge {
  font-size: 11px;
  font-weight: 800;
  color: #0071e3;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.product-info-box h1 {
  font-size: 24px;
  font-weight: 900;
  color: #1d1d1f;
  margin: 4px 0 0;
}
.price-large {
  font-size: 30px;
  font-weight: 900;
  color: #1d1d1f;
  margin-top: 8px;
}
.price-large small {
  font-size: 16px;
  color: #86868b;
}
.shipping-note {
  font-size: 12px;
  color: #6e6e73;
  margin: 4px 0 0;
}

.color-selector-box label,
.size-selector-box label {
  font-size: 12px;
  font-weight: 800;
  color: #1d1d1f;
  display: block;
  margin-bottom: 8px;
}
.color-name-highlight {
  color: #0071e3;
  margin-left: 4px;
}
.swatches-flex-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.color-swatch-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 14px;
  border: 1px solid #e5e5e7;
  background-color: #f5f5f7;
  font-size: 12px;
  font-weight: 700;
  color: #1d1d1f;
  cursor: pointer;
  transition: all 0.2s ease;
}
.color-swatch-chip:hover {
  background-color: #ffffff;
  border-color: #0071e3;
}
.color-swatch-chip.active {
  background-color: #1d1d1f;
  color: #ffffff;
  border-color: #1d1d1f;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.swatch-color-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}
.size-buttons {
  display: flex;
  gap: 8px;
}
.size-btn {
  padding: 8px 16px;
  border-radius: 12px;
  border: 1px solid #e5e5e7;
  background-color: #f5f5f7;
  font-size: 12px;
  font-weight: 800;
  color: #1d1d1f;
  cursor: pointer;
}
.size-btn.active {
  background-color: #1d1d1f;
  color: #ffffff;
  border-color: #1d1d1f;
}
.size-btn.out-of-stock {
  opacity: 0.4;
  text-decoration: line-through;
  cursor: not-allowed;
}

.cta-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.buy-now-btn {
  width: 100%;
  padding: 14px 0;
  background-color: #0071e3;
  color: #ffffff;
  border: none;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}
.add-cart-btn {
  width: 100%;
  padding: 12px 0;
  background-color: #f5f5f7;
  color: #1d1d1f;
  border: 1px solid #e5e5e7;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.share-link-btn {
  width: 100%;
  padding: 11px 0;
  background: #ffffff;
  color: #0071e3;
  border: 1.5px dashed #0071e3;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
}
.share-link-btn:hover {
  background: #f0f7ff;
}

.specs-accordion {
  border-top: 1px solid #e5e5e7;
  padding-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.spec-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 12px;
  color: #515154;
}
.spec-row .icon {
  color: #0071e3;
  shrink: 0;
}

/* Related */
.related-section {
  margin-top: 40px;
  border-top: 1px solid #e5e5e7;
  padding-top: 24px;
}
.related-section h2 {
  font-size: 18px;
  font-weight: 800;
  margin: 0 0 16px;
}
.related-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
@media (min-width: 640px) {
  .related-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
.related-card {
  background-color: #ffffff;
  border: 1px solid #e5e5e7;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
}
.related-card .img-box {
  aspect-ratio: 4/5;
  background-color: #f5f5f7;
}
.related-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.related-card .body {
  padding: 10px;
}
.related-card h4 {
  font-size: 12px;
  margin: 0;
  color: #1d1d1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.related-card strong {
  font-size: 13px;
  color: #1d1d1f;
  display: block;
  margin-top: 2px;
}

/* Modals & Backdrops */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Cart Panel */
.cart-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  max-width: 420px;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  box-shadow: -10px 0 30px rgba(0,0,0,0.15);
  z-index: 99999;
}
.panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e5e5e7;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
}
.panel-header button {
  background: none;
  border: none;
  color: #86868b;
  cursor: pointer;
}
.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
.cart-item-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: #f5f5f7;
  border-radius: 16px;
  border: 1px solid #e5e5e7;
  margin-bottom: 10px;
}
.cart-item-card .item-thumb {
  width: 50px;
  height: 60px;
  object-fit: cover;
  border-radius: 10px;
}
.cart-item-card .item-info {
  flex: 1;
}
.cart-item-card h4 {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
}
.cart-item-card p {
  margin: 2px 0;
  font-size: 10px;
  color: #86868b;
}
.cart-item-card strong {
  font-size: 13px;
}
.qty-box {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: #ffffff;
  border: 1px solid #e5e5e7;
  padding: 4px 8px;
  border-radius: 8px;
}
.qty-box button {
  background: none;
  border: none;
  cursor: pointer;
}
.remove-btn {
  background: none;
  border: none;
  color: #e53e3e;
  cursor: pointer;
}
.panel-footer {
  padding: 16px 20px;
  border-top: 1px solid #e5e5e7;
  background-color: #f5f5f7;
}
.total-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 800;
  margin-bottom: 12px;
}
.checkout-btn {
  width: 100%;
  padding: 12px 0;
  background-color: #1d1d1f;
  color: #ffffff;
  border: none;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

/* Modal Card */
.modal-card {
  width: 90%;
  max-width: 480px;
  background-color: #ffffff;
  border-radius: 24px;
  padding: 24px;
  position: relative;
  max-height: 90vh;
  overflow-y: auto;
}
.modal-card .close-icon-btn {
  position: absolute;
  top: 18px;
  right: 18px;
  background: none;
  border: none;
  color: #86868b;
  cursor: pointer;
}
.modal-card h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 900;
}
.modal-card .subtitle {
  margin: 4px 0 16px;
  font-size: 12px;
  color: #86868b;
}
.checkout-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.form-group label {
  font-size: 11px;
  font-weight: 800;
  display: block;
  margin-bottom: 4px;
}
.form-group input, .form-group textarea {
  width: 100%;
  background-color: #f5f5f7;
  border: 1px solid #e5e5e7;
  border-radius: 12px;
  padding: 9px 12px;
  font-size: 12px;
  color: #1d1d1f;
  outline: none;
}
.city-dropdown-list {
  position: absolute;
  left: 0; right: 0; top: 100%;
  background-color: #ffffff;
  border: 1px solid #e5e5e7;
  border-radius: 12px;
  max-height: 140px;
  overflow-y: auto;
  z-index: 50;
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}
.city-option {
  padding: 8px 12px;
  font-size: 12px;
  cursor: pointer;
}
.city-option:hover {
  background-color: #0071e3;
  color: #ffffff;
}
.order-summary-box {
  background-color: #f5f5f7;
  padding: 12px;
  border-radius: 14px;
  font-size: 12px;
}
.summary-line {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}
.summary-line.final-total {
  border-top: 1px solid #e5e5e7;
  padding-top: 8px;
  margin-top: 6px;
  font-weight: 900;
}
.highlight-price {
  color: #0071e3;
}
.submit-order-button {
  width: 100%;
  padding: 14px 0;
  background-color: #0071e3;
  color: #ffffff;
  border: none;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

/* Success Modal Details */
.success-icon-badge {
  width: 56px;
  height: 56px;
  background-color: #d1fae5;
  color: #059669;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
}
.order-details-card {
  background-color: #f5f5f7;
  padding: 12px;
  border-radius: 14px;
  font-size: 12px;
  text-align: left;
  margin-bottom: 16px;
}
.detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}
.detail-row.total {
  border-top: 1px solid #e5e5e7;
  padding-top: 6px;
  margin-top: 6px;
  font-weight: 900;
}
.wa-track-btn {
  display: block;
  width: 100%;
  padding: 12px 0;
  background-color: #059669;
  color: #ffffff;
  text-decoration: none;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 800;
  margin-bottom: 8px;
}
.secondary-close-btn {
  width: 100%;
  padding: 10px 0;
  background-color: #f5f5f7;
  color: #1d1d1f;
  border: none;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

/* Utilities */
@media (max-width: 767px) {
  .desktop-only {
    display: none !important;
  }
}

/* Dark Black Footer (Apple Store Premium Style) */
.store-footer-dark {
  margin-top: 60px;
  background-color: #0a0a0a;
  color: #f5f5f7;
  border-top: 1px solid #1c1c1e;
  padding: 50px 16px 24px;
}
.footer-grid-container {
  max-width: 1280px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
}
@media (min-width: 640px) {
  .footer-grid-container {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (min-width: 1024px) {
  .footer-grid-container {
    grid-template-columns: 1.5fr 1fr 1fr 1.2fr;
    gap: 40px;
  }
}

.logo-box-dark {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  margin-bottom: 12px;
}
.wolf-icon-dark {
  width: 36px;
  height: 36px;
  background-color: #ffffff;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px;
}
.wolf-icon-dark img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: invert(0);
}
.brand-text-dark {
  font-size: 20px;
  font-weight: 900;
  letter-spacing: -0.5px;
  color: #ffffff;
}
.brand-text-dark .dot {
  color: #0071e3;
}
.brand-desc-dark {
  font-size: 12px;
  color: #a1a1a6;
  line-height: 1.6;
  max-width: 320px;
  margin: 0;
}

.footer-heading {
  font-size: 13px;
  font-weight: 800;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 14px;
}
.footer-links {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.footer-links button {
  background: none;
  border: none;
  color: #a1a1a6;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s ease;
  text-align: left;
}
.footer-links button:hover {
  color: #ffffff;
}

.footer-info-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 12px;
  color: #a1a1a6;
}

.contact-sub {
  font-size: 12px;
  color: #a1a1a6;
  margin: 0 0 12px;
}
.wa-footer-btn-dark {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background-color: #059669;
  color: #ffffff;
  text-decoration: none;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 800;
  transition: transform 0.2s ease, background 0.2s ease;
  box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);
}
.wa-footer-btn-dark:hover {
  transform: translateY(-2px);
  background-color: #10b981;
}

.footer-bottom-dark {
  max-width: 1280px;
  margin: 40px auto 0;
  padding-top: 20px;
  border-top: 1px solid #1c1c1e;
}
.bottom-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: #6e6e73;
}
.morocco-badge {
  font-weight: 700;
  color: #a1a1a6;
}

/* MOBILE RESPONSIVENESS ENHANCEMENTS FOR SINGLE PRODUCT PAGE & HEADER */
@media (max-width: 640px) {
  .store-hero-slider-full {
    border-radius: 0 !important;
    width: 100% !important;
    border: none !important;
  }
  .nav-container {
    gap: 8px;
    padding: 0 10px;
  }
  .brand-text {
    display: none; /* Hide text on mobile to give space for search */
  }
  .nav-search {
    flex: 1;
  }
  .nav-search input {
    font-size: 11px;
    padding: 6px 12px 6px 30px;
  }
  .lang-switch-btn span {
    font-size: 11px;
  }
  .lang-switch-btn {
    padding: 6px 10px;
  }
  .single-product-container {
    padding: 10px 12px 40px;
  }
  .breadcrumb {
    font-size: 11px;
    gap: 4px;
    margin-bottom: 14px;
    flex-wrap: nowrap;
    overflow-x: auto;
    white-space: nowrap;
    padding-bottom: 4px;
    -webkit-overflow-scrolling: touch;
  }
  .breadcrumb .current {
    max-width: 130px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .product-detail-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .main-display-box {
    border-radius: 16px;
    aspect-ratio: 1 / 1;
    max-height: 360px;
    width: 100%;
  }
  .thumbnails-bar {
    gap: 6px;
    padding-bottom: 4px;
  }
  .thumb-img {
    width: 54px;
    height: 66px;
    border-radius: 10px;
  }
  .purchase-card-col {
    padding: 16px 14px;
    border-radius: 18px;
    gap: 14px;
  }
  .product-info-box h1 {
    font-size: 18px;
    line-height: 1.35;
    margin: 2px 0 0;
  }
  .price-large {
    font-size: 22px;
    margin-top: 4px;
  }
  .price-large small {
    font-size: 14px;
  }
  .color-selector-box label,
  .size-selector-box label {
    font-size: 11px;
    margin-bottom: 6px;
  }
  .swatches-flex-group {
    gap: 6px;
  }
  .color-swatch-chip {
    padding: 5px 11px;
    font-size: 11px;
    border-radius: 10px;
    gap: 6px;
  }
  .swatch-color-dot {
    width: 14px;
    height: 14px;
  }
  .size-buttons {
    gap: 6px;
    flex-wrap: wrap;
  }
  .size-btn {
    padding: 7px 14px;
    font-size: 12px;
    border-radius: 10px;
    min-width: 44px;
  }
  .cta-buttons {
    gap: 8px;
    margin-top: 4px;
  }
  .buy-now-btn {
    padding: 13px 0;
    font-size: 13px;
    border-radius: 12px;
  }
  .add-cart-btn {
    padding: 11px 0;
    font-size: 12px;
    border-radius: 12px;
  }
  .share-link-btn {
    padding: 10px 0;
    font-size: 12px;
    border-radius: 12px;
  }
  .specs-accordion {
    margin-top: 10px;
    gap: 8px;
  }
  .spec-row {
    font-size: 11px;
    padding: 10px 12px;
    border-radius: 12px;
  }
}
/* Undo Toast CSS */
.undo-toast-container {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #ffffff;
  border-radius: 14px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.12), 0 2px 10px rgba(0,0,0,0.08);
  width: calc(100% - 32px);
  max-width: 360px;
  z-index: 999999;
  overflow: hidden;
  border: 1px solid #e5e5e7;
  animation: slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes slideUpFade {
  from { opacity: 0; transform: translate(-50%, 20px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
.undo-toast-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
}
.undo-info {
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
}
.undo-info strong {
  font-size: 13px;
  color: #1d1d1f;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}
.undo-btn {
  background: none;
  border: none;
  color: #0071e3;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}
.undo-btn:hover {
  background: #f5f5f7;
}
.undo-progress-bar {
  height: 3px;
  background: #f5f5f7;
  width: 100%;
}
.undo-progress-fill {
  height: 100%;
  background: #059669;
  transition: width 1s linear;
}
</style>
