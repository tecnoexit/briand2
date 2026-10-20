// Utilidades de formato y cálculo de precios.
// La fórmula replica la del front original:
//   pF  = precio_lista * (1 + impuesto/100) * (1 + factor/100) * (1 + profit_margin/100) * rate
//   cN  = si es distribuidor y el producto tiene descuento habilitado:
//         precio_lista * (1 + impuesto/100) * rate * (1 + descuento/100)
//         sino pF

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function findCurrency(currencies, currencyId) {
  return (currencies || []).find((c) => c.id === currencyId)
}

export function priceRegular(product, currencies = []) {
  const base = num(product?.precio_lista ?? product?.price)
  const impuesto = num(product?.impuesto)
  const profit = num(product?.profit_margin)
  const currency = findCurrency(currencies, product?.currency_id)
  const rate = num(currency?.rate ?? 1)
  const factor = num(currency?.factor ?? 0)
  return base * (1 + impuesto / 100) * (1 + factor / 100) * (1 + profit / 100) * rate
}

export function unitPriceFor(product, isDistribuidor, currencies = []) {
  if (isDistribuidor && product?.distribuidor_discount_enabled) {
    const base = num(product?.precio_lista ?? product?.price)
    const impuesto = num(product?.impuesto)
    const currency = findCurrency(currencies, product?.currency_id)
    const rate = num(currency?.rate ?? 1)
    const discount = num(product?.distribuidor_discount_percent)
    return base * (1 + impuesto / 100) * rate * (1 + discount / 100)
  }
  return priceRegular(product, currencies)
}

export function costoCalculado(product) {
  const base = num(product?.precio_lista ?? product?.price)
  const impuesto = num(product?.impuesto)
  return base * (1 + impuesto / 100)
}

export function costoBase(product, currencies = []) {
  const currency = findCurrency(currencies, product?.currency_id)
  const rate = num(currency?.rate ?? 1)
  return costoCalculado(product) * rate
}

export function defaultAdjustPercent(product, isDistribuidor) {
  if (isDistribuidor && product?.distribuidor_discount_enabled) {
    return num(product?.distribuidor_discount_percent)
  }
  return num(product?.profit_margin)
}

export function round2(value) {
  return Math.round(num(value) * 100) / 100
}

// Precio del catálogo de cliente:
//  - distribuidor: precio distribuidor (con descuento si aplica).
//  - cliente regular: precio de lista + IVA + factor + margen, redondeado
//    hacia arriba al 0.5 más cercano.
export function catalogPrice(product, isDistribuidor, currencies = []) {
  const value = unitPriceFor(product, isDistribuidor, currencies)
  return isDistribuidor ? value : Math.ceil(value * 2) / 2
}

export function currencySymbol(currencies, currencyId, fallback = '$') {
  return findCurrency(currencies, currencyId)?.symbol || fallback
}

export function formatMoney(value, symbol = '$') {
  return `${symbol} ${num(value).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatDay(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-AR')
}

export function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
