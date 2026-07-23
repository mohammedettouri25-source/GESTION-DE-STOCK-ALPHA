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
