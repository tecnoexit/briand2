import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Ban, Loader2, Plus, Search, Wallet } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { accountPaymentLabel, isAdmin, voidStatusBadge, voidStatusLabel } from '../lib/roles'
import { formatDate, formatMoney } from '../lib/format'

function Card({ label, value, accent = false }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${accent ? 'text-slate-900' : 'text-slate-800'}`}>{value}</p>
    </div>
  )
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold text-slate-800">{title}</h3>
        {children}
      </div>
    </div>
  )
}

export default function SellerAccount({ mode = 'mine' }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { sellerId } = useParams()
  const admin = isAdmin(user)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const [paymentOpen, setPaymentOpen] = useState(false)
  const [balanceOpen, setBalanceOpen] = useState(false)
  const [voidOpen, setVoidOpen] = useState(null)

  const [busy, setBusy] = useState(false)

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    try {
      const url = mode === 'admin' ? `/cuenta-corriente/seller/${sellerId}` : '/cuenta-corriente/mia'
      const { data } = await api.get(url, {
        params: {
          search: search || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          page,
        },
      })
      setData(data)
      setError('')
    } catch {
      setError('No se pudo cargar la cuenta corriente')
    } finally {
      setLoading(false)
    }
  }, [mode, sellerId, search, dateFrom, dateTo, page])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  const invoicesMeta = data?.invoices || {}
  const invoices = invoicesMeta.data || []
  const payments = data?.payments || []

  const back = () => (admin ? navigate('/admin/cuenta-corriente') : navigate('/vendedor/facturas'))

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center gap-3">
        <button
          onClick={back}
          className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            Cuenta corriente · {data?.seller?.name || '…'}
          </h1>
          <p className="text-xs text-slate-500">
            Saldo = saldo inicial + boletas vigentes − pagos registrados
          </p>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Saldo inicial" value={formatMoney(data?.opening_balance)} />
        <Card label="Boletas vigentes" value={formatMoney(data?.invoiced)} />
        <Card label="Pagos" value={formatMoney(data?.paid)} />
        <Card label="Saldo pendiente" value={formatMoney(data?.balance)} accent />
      </div>

      {admin && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setPaymentOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            <Plus size={16} /> Registrar pago
          </button>
          <button
            onClick={() => setBalanceOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Wallet size={16} /> Saldo inicial
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Buscar por N° de boleta"
            className="w-56 rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <div>
          <label className="mr-2 text-xs text-slate-500">Desde</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mr-2 text-xs text-slate-500">Hasta</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">N°</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    <Loader2 className="mx-auto animate-spin" />
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No hay boletas.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">#{inv.id}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(inv.created_at)}</td>
                    <td className="px-4 py-3 text-slate-600">{inv.client_name}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {formatMoney(inv.total)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${voidStatusBadge(
                          inv.void_status,
                        )}`}
                      >
                        {voidStatusLabel(inv.void_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {inv.void_status !== 'anulada' && (
                          <button
                            onClick={() => setVoidOpen(inv)}
                            className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                            title="Solicitar anulación"
                          >
                            <Ban size={14} />
                          </button>
                        )}
                        {admin && inv.void_status === 'pendiente' && (
                          <button
                            onClick={() => authorizeVoid(inv.id)}
                            disabled={busy}
                            className="rounded-lg border border-green-300 px-2 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50"
                          >
                            Autorizar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {invoicesMeta.last_page > 1 && (
        <div className="mb-6 flex items-center justify-between text-sm text-slate-600">
          <span>
            Página {invoicesMeta.current_page} de {invoicesMeta.last_page} · {invoicesMeta.total} boletas
          </span>
          <div className="flex gap-2">
            <button
              disabled={invoicesMeta.current_page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              disabled={invoicesMeta.current_page >= invoicesMeta.last_page}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
          Pagos registrados
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Medio</th>
              <th className="px-4 py-2">Referencia</th>
              <th className="px-4 py-2 text-right">Importe</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Sin pagos registrados.
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-slate-600">{formatDate(p.paid_at)}</td>
                  <td className="px-4 py-2 text-slate-600">{accountPaymentLabel(p.method)}</td>
                  <td className="px-4 py-2 text-slate-600">{p.reference || p.notes || '—'}</td>
                  <td className="px-4 py-2 text-right font-medium text-slate-800">
                    {formatMoney(p.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {paymentOpen && (
        <PaymentModal
          sellerId={data?.seller?.id}
          onClose={() => setPaymentOpen(false)}
          onSaved={fetchDetail}
        />
      )}
      {balanceOpen && (
        <BalanceModal
          sellerId={data?.seller?.id}
          current={data?.opening_balance}
          onClose={() => setBalanceOpen(false)}
          onSaved={fetchDetail}
        />
      )}
      {voidOpen && (
        <VoidModal
          invoice={voidOpen}
          onClose={() => setVoidOpen(null)}
          onSaved={fetchDetail}
        />
      )}
    </div>
  )

  function authorizeVoid(id) {
    if (!confirm('¿Autorizar la anulación de esta boleta?')) return
    setBusy(true)
    api
      .post(`/invoices/${id}/autorizar-anulacion`)
      .then(fetchDetail)
      .catch(() => alert('No se pudo autorizar la anulación'))
      .finally(() => setBusy(false))
  }
}

function PaymentModal({ sellerId, onClose, onSaved }) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('efectivo')
  const [reference, setReference] = useState('')
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const submit = async () => {
    setErr('')
    if (!amount || Number(amount) < 0) return setErr('Ingresá un importe válido.')
    setSaving(true)
    try {
      await api.post('/cuenta-corriente/pagos', {
        seller_id: sellerId,
        amount: Number(amount),
        method,
        reference: reference || null,
        paid_at: paidAt || null,
      })
      onSaved()
      onClose()
    } catch (e) {
      setErr(e?.response?.data?.message || 'No se pudo registrar el pago')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Registrar pago" onClose={onClose}>
      {err && <p className="mb-3 text-sm text-red-600">{err}</p>}
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600">Importe</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600">Medio de pago</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="cheque">Cheque</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600">Referencia</label>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="N° de operación, etc."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-600">Fecha</label>
          <input
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function BalanceModal({ sellerId, current, onClose, onSaved }) {
  const [value, setValue] = useState(current ?? 0)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const submit = async () => {
    setErr('')
    setSaving(true)
    try {
      await api.put(`/cuenta-corriente/seller/${sellerId}/saldo-inicial`, {
        opening_balance: Number(value),
      })
      onSaved()
      onClose()
    } catch (e) {
      setErr(e?.response?.data?.message || 'No se pudo actualizar el saldo inicial')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Saldo inicial" onClose={onClose}>
      {err && <p className="mb-3 text-sm text-red-600">{err}</p>}
      <div className="mb-4">
        <label className="mb-1 block text-xs font-bold text-slate-600">Saldo inicial</label>
        <input
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          Cancelar
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </Modal>
  )
}

function VoidModal({ invoice, onClose, onSaved }) {
  const [reason, setReason] = useState(invoice.void_reason || '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const submit = async () => {
    setErr('')
    if (!reason.trim()) return setErr('El motivo es obligatorio.')
    setSaving(true)
    try {
      await api.post(`/invoices/${invoice.id}/anular`, { void_reason: reason })
      onSaved()
      onClose()
    } catch (e) {
      setErr(e?.response?.data?.message || 'No se pudo solicitar la anulación')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Anular boleta #${invoice.id}`} onClose={onClose}>
      {err && <p className="mb-3 text-sm text-red-600">{err}</p>}
      <div className="mb-4">
        <label className="mb-1 block text-xs font-bold text-slate-600">Motivo (obligatorio)</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Describí el motivo de la anulación"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          Cancelar
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          {saving ? 'Solicitando…' : 'Solicitar anulación'}
        </button>
      </div>
    </Modal>
  )
}
