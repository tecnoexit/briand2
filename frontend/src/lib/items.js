import { round2, unitPriceFor } from './format'

export function addProductToItems(items, product, isDistribuidor, currencies) {
  const price = round2(unitPriceFor(product, isDistribuidor, currencies))
  const existing = items.find((it) => it.product_id === product.id)
  const newItem = {
    key: `p-${product.id}-${Date.now()}`,
    product_id: product.id,
    product_name: product.name,
    product_code: product.code,
    quantity: 1,
    unit_price: price,
    notes: '',
  }
  if (existing) {
    const updated = { ...existing, quantity: existing.quantity + 1 }
    return [updated, ...items.filter((it) => it.product_id !== product.id)]
  }
  return [newItem, ...items]
}

export function addManualItem(items) {
  return [
    {
      key: `m-${Date.now()}`,
      product_id: null,
      product_name: '',
      product_code: '',
      quantity: 1,
      unit_price: 0,
      notes: '',
    },
    ...items,
  ]
}
