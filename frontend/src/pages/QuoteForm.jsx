import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { FileText, Loader2, Save } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { PAYMENT_METHODS, QUOTE_ESTADOS, isAdmin } from '../lib/roles'
import { formatMoney, round2, unitPriceFor } from '../lib/format'
import { addProductToItems } from '../lib/items'
import ClientSection from '../components/ClientSection'
import ProductsPanel from '../components/ProductsPanel'
import ItemsTable from '../components/ItemsTable'

function defaultValidUntil() {
  const d = new Date()
  d.setDate(d.getDate() + 15)
  return d.toISOString().slice(0, 10)
}

export default function QuoteForm() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const params = useParams()
  const [searchParams] = useSearchParams()
  const editId = params.id ?? searchParams.get('quote')

  const admin = isAdmin(user)
  const isDeposito = user?.role === 'deposito'
  const quoteBase = admin
    ? '/admin/presupuestos'
    : isDeposito
      ? '/deposito/presupuestos'
      : '/vendedor/presupuestos'
  const invoiceBase = admin ? '/admin/facturas' : '/vendedor/facturas'

  const [currencies, setCurrencies] = useState([])
  const [client, setClient] = useState(null)
  const [items, setItems] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [taxRate, setTaxRate] = useState(0)
  const [estado, setEstado] = useState('pendiente')
  const [validUntil, setValidUntil] = useState(defaultValidUntil())
  const [notes, setNotes] = useState('')
  const [dateLabel, setDateLabel] = useState(() => new Date().toLocaleDateString('es-AR'))
  const [sellerName, setSellerName] = useState(() => user?.name || '—')
  const [sellerId, setSellerId] = useState(null)
  const [users, setUsers] = useState([])

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isDistribuidor = client?.type === 'distribuidor'
  const symbol = '$'
  const sellers = useMemo(
    () => users.filter((u) => u.role === 'vendedor' || u.role === 'admin'),
    [users],
  )

  useEffect(() => {
    api.get('/currencies').then(({ data }) => setCurrencies(data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!admin) return
    api
      .get('/users')
      .then(({ data }) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [admin])

  useEffect(() => {
    if (!editId || currencies.length === 0) return
    let active = true
    setLoading(true)
    api
      .get(`/quotes/${editId}`)
      .then(async ({ data }) => {
        if (!active) return
        const isDist = data.client_type === 'distribuidor'
        setClient({
          id: data.client_id,
          name: data.client_name,
          phone: data.client_phone,
          email: data.client_email,
          type: data.client_type || 'regular',
        })
        setPaymentMethod(data.payment_method || 'efectivo')
        setTaxRate(data.tax_rate != null ? Number(data.tax_rate) : 0)
        setEstado(data.estado || 'pendiente')
        setValidUntil(data.valid_until ? String(data.valid_until).slice(0, 10) : '')
        setNotes(data.notes || '')
        if (data.created_at) setDateLabel(new Date(data.created_at).toLocaleDateString('es-AR'))
        if (data.seller?.name) setSellerName(data.seller.name)
        if (data.seller_id) setSellerId(data.seller_id)

        const ids = [...new Set((data.items || []).map((it) => it.product_id).filter(Boolean))]
        const map = {}
        await Promise.all(
          ids.map(async (pid) => {
            try {
              map[pid] = (await api.get(`/products/${pid}`)).data
            } catch {
              // producto inexistente
            }
          }),
        )
        if (!active) return
        setItems(
          (data.items || []).map((it, idx) => {
            const product = it.product_id ? map[it.product_id] : null
            const price = product
              ? round2(unitPriceFor(product, isDist, currencies))
              : Number(it.unit_price || 0)
            return {
              key: `it-${it.id ?? idx}`,
              product_id: it.product_id,
              product_name: it.product_name,
              product_code: it.product_code,
              quantity: it.quantity,
              unit_price: price,
              notes: it.notes || '',
            }
          }),
        )
      })
      .catch(() => setError('No se pudo cargar el presupuesto'))
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [editId, currencies])

  const subtotal = useMemo(
    () => items.reduce((acc, it) => acc + Number(it.quantity || 0) * Number(it.unit_price || 0), 0),
    [items],
  )
  const taxAmount = useMemo(() => (subtotal * Number(taxRate || 0)) / 100, [subtotal, taxRate])
  const total = subtotal + taxAmount

  const addProduct = (p) => setItems(addProductToItems(items, p, isDistribuidor, currencies))

  const validate = () => {
    if (!client?.name?.trim()) return 'Seleccioná o creá un cliente.'
    if (items.length === 0) return 'Agregá al menos un producto.'
    if (items.some((it) => !it.product_name.trim())) return 'Hay ítems sin nombre de producto.'
    return null
  }

  const buildPayload = () => ({
    client_id: client.id || null,
    client_name: client.name,
    client_phone: client.phone || null,
    client_email: client.email || null,
    payment_method: paymentMethod,
    tax_rate: Number(taxRate),
    notes: notes || null,
    seller_id: sellerId || undefined,
    items: items.map((it) => ({
      product_id: it.product_id || null,
      product_name: it.product_name,
      product_code: it.product_code || null,
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      notes: it.notes || null,
    })),
  })

  const handleSaveQuote = async () => {
    setError('')
    setSuccess('')
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    const payload = {
      ...buildPayload(),
      estado,
      valid_until: validUntil || null,
    }
    setSaving(true)
    try {
      if (editId) {
        await api.put(`/quotes/${editId}`, payload)
        setSuccess('Presupuesto actualizado.')
      } else {
        await api.post('/quotes', payload)
        setSuccess('Presupuesto creado.')
      }
      setTimeout(() => navigate(quoteBase), 600)
    } catch (err) {
      const data = err?.response?.data
      setError(data?.message || data?.errors?.items?.[0] || 'No se pudo guardar el presupuesto')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveInvoice = async () => {
    setError('')
    setSuccess('')
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    setSaving(true)
    try {
      await api.post('/invoices', buildPayload())
      setSuccess('Factura creada.')
      setTimeout(() => navigate(invoiceBase), 600)
    } catch (err) {
      const data = err?.response?.data
      setError(data?.message || data?.errors?.items?.[0] || 'No se pudo guardar la factura')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-slate-400">
        <Loader2 className="animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-slate-800">
          {editId ? `Editar presupuesto #${editId}` : 'Nuevo presupuesto'}
        </h1>
        {isDeposito && (
          <span className="rounded-full border border-purple-300 bg-purple-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-purple-700">
            Sin precios
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{success}</div>
      )}

      {/* === Sección superior: cliente y datos de presupuesto === */}
      <section className="mb-5 rounded-xl border border-slate-200 bg-white p-5">
        <ClientSection client={client} onChange={setClient} />

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Teléfono</label>
            <input
              value={client?.phone || ''}
              onChange={(e) => setClient({ ...client, phone: e.target.value })}
              disabled={!client}
              placeholder="Teléfono"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Email</label>
            <input
              value={client?.email || ''}
              onChange={(e) => setClient({ ...client, email: e.target.value })}
              disabled={!client}
              placeholder="Email"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Vendedor</label>
            {admin ? (
              <select
                value={sellerId ?? user?.id ?? ''}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : null
                  setSellerId(id)
                  const u = sellers.find((x) => x.id === id)
                  setSellerName(u?.name || user?.name || '—')
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {sellers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={sellerName}
                readOnly
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600"
              />
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Fecha</label>
            <input
              value={dateLabel}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Forma de Pago</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Estado</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {QUOTE_ESTADOS.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Válido hasta</label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-bold text-slate-600">
            Observaciones / Notas
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Observaciones / Notas"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </section>

      {/* === Estructura de dos columnas === */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Detalle de presupuesto
            </h2>

            <ItemsTable items={items} onChange={setItems} symbol={symbol} showPrices={!isDeposito} />

            {!isDeposito && (
              <div className="mt-4 space-y-1 border-t border-slate-200 pt-3 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatMoney(subtotal, symbol)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>IVA ({taxRate}%)</span>
                  <span>{formatMoney(taxAmount, symbol)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-semibold text-slate-900">
                  <span>Total</span>
                  <span>{formatMoney(total, symbol)}</span>
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              {!isDeposito && (
                <button
                  onClick={handleSaveInvoice}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  <FileText size={16} /> Guardar como Factura
                </button>
              )}
              <button
                onClick={handleSaveQuote}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Guardar Presupuesto
              </button>
            </div>
          </section>
        </div>

        <aside>
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Productos
            </h2>
            <ProductsPanel
              isDistribuidor={isDistribuidor}
              currencies={currencies}
              onAdd={addProduct}
              showPrices={!isDeposito}
            />
          </section>
        </aside>
      </div>
    </div>
  )
}
