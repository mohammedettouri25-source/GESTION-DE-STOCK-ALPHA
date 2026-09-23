import Dexie from 'dexie'

export const localDb = new Dexie('alphashop07')

localDb.version(1).stores({
  products: 'id,sku,barcode,name,category',
  sales: 'id,createdAt,status',
  customers: 'id,phone,name',
  movements: 'id,productId,createdAt,type',
  queue: '++id,table,createdAt'
})

localDb.version(2).stores({
  products: 'id,sku,barcode,name,category',
  sales: 'id,createdAt,status',
  customers: 'id,phone,name',
  suppliers: 'id,phone,name',
  expenses: 'id,category,date',
  movements: 'id,productId,createdAt,type',
  queue: '++id,table,createdAt'
})

// Debug interceptors to catch DataCloneError source
const tablesToDebug = ['products', 'sales', 'customers', 'movements', 'queue']
tablesToDebug.forEach(tableName => {
  const table = localDb[tableName]
  if (!table) return
  
  const origPut = table.put.bind(table)
  table.put = async function(item, key) {
    if (Array.isArray(item)) {
      console.error(`🚨 FATAL: ARRAY PASSED TO ${tableName}.put!`, JSON.stringify(item))
      alert(`FATAL ERROR: Array passed to ${tableName}.put. See console.`)
    }
    try {
      return await origPut(item, key)
    } catch (e) {
      console.error(`🚨 DEXIE PUT ERROR in ${tableName}! Payload:`, item)
      throw new Error(`DEXIE_PUT_ERROR [${tableName}]: ${e.message}`)
    }
  }

  const origAdd = table.add.bind(table)
  table.add = async function(item, key) {
    if (Array.isArray(item)) {
      console.error(`🚨 FATAL: ARRAY PASSED TO ${tableName}.add!`, JSON.stringify(item))
      alert(`FATAL ERROR: Array passed to ${tableName}.add. See console.`)
    }
    try {
      return await origAdd(item, key)
    } catch (e) {
      console.error(`🚨 DEXIE ADD ERROR in ${tableName}! Payload:`, item)
      throw new Error(`DEXIE_ADD_ERROR [${tableName}]: ${e.message}`)
    }
  }
})

