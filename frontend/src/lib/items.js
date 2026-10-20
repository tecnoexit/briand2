import { round2, costoBase, defaultAdjustPercent } from './format'
import { productVisibility } from '../components/ItemsEditor'

export function addProductToItems(items, product, isDistribuidor, currencies) {
  const base = round2(costoBase(product, currencies))
  const adjust = defaultAdjustPercent(product, isDistribuidor)
  const price = round2(base * (1 + adjust / 100))
  const existing = items.find((it) => it.product_id === product.id)
  const newItem = {
    key: `p-${product.id}-${Date.now()}`,
    product_id: product.id,
    product_name: product.name,
    product_code: product.code,
    quantity: 1,
    unit_price: price,
    base_unit_price: base,
    price_adjust_percent: adjust,
    visibility: productVisibility(product),
    distribuidor_discount_enabled: !!product.distribuidor_discount_enabled,
    distribuidor_discount_percent: Number(product.distribuidor_discount_percent ?? 0),
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
      base_unit_price: 0,
      price_adjust_percent: 0,
      visibility: null,
      distribuidor_discount_enabled: false,
      distribuidor_discount_percent: 0,
      notes: '',
    },
    ...items,
  ]
}
