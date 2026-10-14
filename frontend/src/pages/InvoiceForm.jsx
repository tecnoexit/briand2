import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileText, Loader2, Save } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { PAYMENT_METHODS, isAdmin } from '../lib/roles'
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

export default function InvoiceForm() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('invoice')
  const quoteId = searchParams.get('quote')

  const admin = isAdmin(user)
  const invoiceBase = admin ? '/admin/facturas' : '/vendedor/facturas'
  const quoteBase = admin ? '/admin/presupuestos' : '/vendedor/presupuestos'

  const [currencies, setCurrencies] = useState([])
  const [client, setClient] = useState(null)
  const [items, setItems] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [taxRate, setTaxRate] = useState(0)
  const [notes, setNotes] = useState('')
  const [modificationReason, setModificationReason] = useState('')
  const [dateLabel, setDateLabel] = useState(() => new Date().toLocaleDateString('es-AR'))
  const [sellerName, setSellerName] = useState(() => user?.name || '—')
  const [sellerId, setSellerId] = useState(null)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isDistribuidor = client?.type === 'distribuidor'
  const symbol = '$'

  useEffect(() => {
    api.get('/currencies').then(({ data }) => setCurrencies(data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!editId) return
    setLoading(true)
    api
      .get(`/invoices/${editId}`)
      .then(({ data }) => {
        setClient({
          id: data.client_id,
          name: data.client_name,
          phone: data.client_phone,
          email: data.client_email,
          type: data.client_type || 'regular',
        })
        setPaymentMethod(data.payment_method || 'efectivo')
        setTaxRate(0)
        setNotes(data.notes || '')
        setModificationReason(data.modification_reason || '')
        if (data.created_at) setDateLabel(new Date(data.created_at).toLocaleDateString('es-AR'))
        if (data.seller?.name) setSellerName(data.seller.name)
        setItems(
          (data.items || []).map((it, idx) => ({
            key: `it-${it.id ?? idx}`,
            product_id: it.product_id,
            product_name: it.product_name,
            product_code: it.product_code,
            quantity: it.quantity,
            unit_price: Number(it.unit_price),
            notes: it.notes || '',
          })),
        )
      })
      .catch(() => setError('No se pudo cargar la factura'))
      .finally(() => setLoading(false))
  }, [editId])

  useEffect(() => {
    if (editId || !quoteId || currencies.length === 0) return
    let active = true
    setLoading(true)
    api
      .get(`/quotes/${quoteId}`)
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
        setTaxRate(0)
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
              : Number(it.unit_price)
            return {
              key: `q-${it.id ?? idx}`,
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
  }, [editId, quoteId, currencies])

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
    items: items.map((it) => ({
      product_id: it.product_id || null,
      product_name: it.product_name,
      product_code: it.product_code || null,
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      notes: it.notes || null,
    })),
  })

  const handleSaveInvoice = async () => {
    setError('')
    setSuccess('')
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    const payload = {
      ...buildPayload(),
      seller_id: sellerId || undefined,
      modification_reason: editId ? modificationReason || null : undefined,
    }
    setSaving(true)
    try {
      if (editId) {
        await api.put(`/invoices/${editId}`, payload)
        setSuccess('Factura actualizada.')
      } else {
        await api.post('/invoices', payload)
        setSuccess('Factura creada.')
      }
      setTimeout(() => navigate(invoiceBase), 600)
    } catch (err) {
      const data = err?.response?.data
      setError(data?.message || data?.errors?.items?.[0] || 'No se pudo guardar la factura')
    } finally {
      setSaving(false)
    }
  }

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
      estado: 'pendiente',
      valid_until: defaultValidUntil(),
    }
    setSaving(true)
    try {
      await api.post('/quotes', payload)
      setSuccess('Presupuesto creado.')
      setTimeout(() => navigate(quoteBase), 600)
    } catch (err) {
      const data = err?.response?.data
      setError(data?.message || data?.errors?.items?.[0] || 'No se pudo guardar el presupuesto')
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
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-slate-800">
          {editId
            ? `Editar factura #${editId}`
            : quoteId
              ? `Facturar presupuesto #${quoteId}`
              : 'Nueva factura'}
        </h1>
      </div>

      {quoteId && !editId && (
        <div className="mb-4 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700">
          Presupuesto #{quoteId} precargado. Los precios se actualizaron con los valores vigentes;
          revisá antes de guardar.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{success}</div>
      )}

      {/* === Sección superior: cliente y datos de factura === */}
      <section className="mb-5 rounded-xl border border-slate-200 bg-white p-5">
        <ClientSection client={client} onChange={setClient} />

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
            <input
              value={sellerName}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600"
            />
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
          {editId && (
            <>
              <label className="mt-3 mb-1 block text-xs font-bold text-slate-600">
                Motivo de la modificación
              </label>
              <textarea
                value={modificationReason}
                onChange={(e) => setModificationReason(e.target.value)}
                rows={2}
                placeholder="Describí por qué se modifica la factura"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </>
          )}
        </div>
      </section>

      {/* === Estructura de dos columnas === */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Detalle de factura
            </h2>

            <ItemsTable items={items} onChange={setItems} symbol={symbol} />

            <div className="mt-4 space-y-1 border-t border-slate-200 pt-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatMoney(subtotal, symbol)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>IVA (0%)</span>
                <span>{formatMoney(taxAmount, symbol)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-semibold text-slate-900">
                <span>Total</span>
                <span>{formatMoney(total, symbol)}</span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={handleSaveQuote}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                <FileText size={16} /> Guardar como Presupuesto
              </button>
              <button
                onClick={handleSaveInvoice}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Guardar Factura
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
            />
          </section>
        </aside>
      </div>
    </div>
  )
}

