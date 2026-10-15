export const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'credito', label: 'Crédito' },
]

export function paymentLabel(value) {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value ?? ''
}

export const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'deposito', label: 'Depósito' },
  { value: 'cliente', label: 'Cliente' },
  { value: 'distribuidor', label: 'Distribuidor' },
]

export function roleLabel(value) {
  return ROLES.find((r) => r.value === value)?.label ?? value ?? ''
}

export const QUOTE_ESTADOS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'aceptado', label: 'Aceptado' },
  { value: 'rechazado', label: 'Rechazado' },
  { value: 'vencido', label: 'Vencido' },
]

export const QUOTE_ESTADO_BADGE = {
  pendiente: 'bg-amber-100 text-amber-700',
  aceptado: 'bg-green-100 text-green-700',
  rechazado: 'bg-red-100 text-red-700',
  vencido: 'bg-slate-200 text-slate-600',
}

export function quoteEstadoLabel(value) {
  return QUOTE_ESTADOS.find((e) => e.value === value)?.label ?? value ?? ''
}

export function isAdmin(user) {
  return user?.role === 'admin'
}

export function isVendedor(user) {
  return user?.role === 'vendedor'
}

export const ACCOUNT_PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'otro', label: 'Otro' },
]

export function accountPaymentLabel(value) {
  return ACCOUNT_PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value ?? ''
}

export const VOID_STATUS = {
  vigente: { label: 'Vigente', badge: 'bg-green-100 text-green-700' },
  pendiente: { label: 'Anulación pendiente', badge: 'bg-amber-100 text-amber-700' },
  anulada: { label: 'Anulada', badge: 'bg-red-100 text-red-700' },
}

export function voidStatusLabel(value) {
  return VOID_STATUS[value]?.label ?? 'Vigente'
}

export function voidStatusBadge(value) {
  return VOID_STATUS[value]?.badge ?? VOID_STATUS.vigente.badge
}

export function homePathFor(user) {
  switch (user?.role) {
    case 'admin':
      return '/admin/facturacion'
    case 'vendedor':
      return '/vendedor/facturacion'
    case 'deposito':
      return '/deposito'
    case 'distribuidor':
    case 'cliente':
      return '/client'
    default:
      return '/login'
  }
}
