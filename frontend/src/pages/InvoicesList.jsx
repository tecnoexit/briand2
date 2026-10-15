import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, Loader2, Pencil, Printer, Search, X } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { isAdmin } from '../lib/roles'
import { formatDate, formatMoney } from '../lib/format'
import { PAYMENT_METHODS, paymentLabel, voidStatusBadge, voidStatusLabel } from '../lib/roles'
import ClientTypeBadge from '../components/ClientTypeBadge'

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-800">{value}</p>
    </div>
  )
}

function InvoiceDetail({ id, onClose }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    api
      .get(`/invoices/${id}`)
      .then(({ data }) => active && setInvoice(data))
      .catch(() => active && setInvoice(null))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [id])

  const symbol = '$'

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">
            Factura #{id}
          </h2>
          <div className="flex items-center gap-2">
            {invoice && (
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Printer size={16} /> Imprimir
              </button>
            )}
            {isAdmin(user) && invoice && (
              <button
                onClick={() => navigate(`/admin/facturacion?invoice=${id}`)}
                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
              >
                <Pencil size={16} /> Editar
              </button>
            )}
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
              <X size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center text-slate-400">
            <Loader2 className="animate-spin" />
          </div>
        ) : !invoice ? (
          <div className="p-6 text-slate-500">No se pudo cargar la factura.</div>
        ) : (
          <div id="print-area" className="flex-1 px-6 py-5">
            <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <img
                  src="/assets/ferreteria-D-CqQMci.png"
                  alt=""
                  className="h-9 w-9 object-contain"
                />
                <div>
                  <p className="text-lg font-bold leading-none text-slate-800">Ferretería De2</p>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400">Factura</p>
                </div>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold text-slate-800">Factura #{invoice.id}</p>
                <p className="text-slate-500">{formatDate(invoice.created_at)}</p>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-400">Cliente</p>
                <p className="font-medium text-slate-800">{invoice.client_name}</p>
                {invoice.client_type && (
                  <ClientTypeBadge type={invoice.client_type} />
                )}
                {invoice.client_phone && <p className="text-slate-500">{invoice.client_phone}</p>}
                {invoice.client_email && <p className="text-slate-500">{invoice.client_email}</p>}
              </div>
              <div className="text-right">
                <p className="text-slate-400">Fecha</p>
                <p className="font-medium text-slate-800">{formatDate(invoice.created_at)}</p>
                {invoice.seller?.name && (
                  <>
                    <p className="mt-2 text-slate-400">Vendedor</p>
                    <p className="text-slate-700">{invoice.seller.name}</p>
                  </>
                )}
                <p className="mt-2 text-slate-400">Pago</p>
                <p className="text-slate-700">{paymentLabel(invoice.payment_method)}</p>
                <p className="mt-2 text-slate-400">Estado</p>
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${voidStatusBadge(
                    invoice.void_status,
                  )}`}
                >
                  {voidStatusLabel(invoice.void_status)}
                </span>
              </div>
            </div>

            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-y border-slate-200 text-left text-slate-500">
                  <th className="py-2">Producto</th>
                  <th className="py-2 text-center">Cant.</th>
                  <th className="py-2 text-right">P. Unit.</th>
                  <th className="py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.items || []).map((it) => (
                  <tr key={it.id} className="border-b border-slate-100">
                    <td className="py-2">
                      <p className="text-slate-800">{it.product_name}</p>
                      {it.product_code && <p className="text-xs text-slate-400">{it.product_code}</p>}
                      {it.notes && <p className="text-xs italic text-slate-400">{it.notes}</p>}
                    </td>
                    <td className="py-2 text-center text-slate-700">{it.quantity}</td>
                    <td className="py-2 text-right text-slate-700">
                      {formatMoney(it.unit_price, symbol)}
                    </td>
                    <td className="py-2 text-right text-slate-700">
                      {formatMoney(it.total_price, symbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 ml-auto w-64 space-y-1 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatMoney(invoice.subtotal, symbol)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>IVA ({Number(invoice.tax_rate)}%)</span>
                <span>{formatMoney(invoice.tax_amount, symbol)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-semibold text-slate-900">
                <span>Total</span>
                <span>{formatMoney(invoice.total, symbol)}</span>
              </div>
            </div>

            {invoice.notes && (
              <div className="mt-6 text-sm">
                <p className="font-medium text-slate-500">Observaciones</p>
                <p className="whitespace-pre-wrap text-slate-700">{invoice.notes}</p>
              </div>
            )}
            {invoice.modification_reason && (
              <div className="mt-4 text-sm">
                <p className="font-medium text-slate-500">Motivo de la modificación</p>
                <p className="whitespace-pre-wrap text-slate-700">{invoice.modification_reason}</p>
              </div>
            )}

            <p className="mt-8 border-t border-slate-100 pt-3 text-center text-xs text-slate-400">
              Gracias por su compra!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function InvoicesList() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const openId = searchParams.get('invoice')

  const [invoices, setInvoices] = useState([])
  const [summary, setSummary] = useState(null)
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page }
      if (search) params.search = search
      if (paymentMethod) params.payment_method = paymentMethod
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      const { data } = await api.get('/invoices', { params })
      setInvoices(data.data || [])
      setSummary(data.summary)
      setMeta({
        current_page: data.current_page,
        last_page: data.last_page,
        total: data.total,
      })
    } finally {
      setLoading(false)
    }
  }, [page, search, paymentMethod, dateFrom, dateTo])

  useEffect(() => {
    const t = setTimeout(fetchInvoices, 250)
    return () => clearTimeout(t)
  }, [fetchInvoices])

  useEffect(() => {
    setPage(1)
  }, [search, paymentMethod, dateFrom, dateTo])

  const closeDetail = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('invoice')
    setSearchParams(next, { replace: true })
  }

  const symbol = '$'
  const base = isAdmin(user) ? '/admin/facturas' : '/vendedor/facturas'

  const summaryCards = useMemo(
    () => [
      { label: 'Facturas', value: summary?.total_count ?? 0 },
      { label: 'Subtotal', value: formatMoney(summary?.total_subtotal, symbol) },
      { label: 'IVA', value: formatMoney(summary?.total_tax, symbol) },
      { label: 'Total', value: formatMoney(summary?.total_amount, symbol) },
      { label: 'Promedio', value: formatMoney(summary?.avg_amount, symbol) },
    ],
    [summary],
  )

  return (
    <div className="p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-800">Facturas</h1>
        <button
          onClick={() => navigate(isAdmin(user) ? '/admin/facturacion' : '/vendedor/facturacion')}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Nueva factura
        </button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        {summaryCards.map((c) => (
          <SummaryCard key={c.label} {...c} />
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente o N°"
            className="w-64 rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
          />
        </div>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500"
        >
          <option value="">Todos los pagos</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <div>
          <label className="mr-2 text-xs text-slate-500">Desde</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500"
          />
        </div>
        <div>
          <label className="mr-2 text-xs text-slate-500">Hasta</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500"
          />
        </div>
      </div>

      {meta.last_page > 1 && (
        <div className="mb-4 flex items-center justify-between text-sm text-slate-600">
          <span>
            Página {meta.current_page} de {meta.last_page} · {meta.total} facturas
          </span>
          <div className="flex gap-2">
            <button
              disabled={meta.current_page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              disabled={meta.current_page >= meta.last_page}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">N°</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Vendedor</th>
              <th className="px-4 py-3">Pago</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  <Loader2 className="mx-auto animate-spin" />
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  No hay facturas.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-700">#{inv.id}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(inv.created_at)}</td>
                  <td className="px-4 py-3">
                    <p className="text-slate-800">{inv.client_name}</p>
                    {inv.client_type && (
                      <ClientTypeBadge type={inv.client_type} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{inv.seller?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{paymentLabel(inv.payment_method)}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800">
                    {formatMoney(inv.total, symbol)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() =>
                          setSearchParams({ ...Object.fromEntries(searchParams), invoice: inv.id }, { replace: true })
                        }
                        className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50"
                        title="Ver detalle"
                      >
                        <Eye size={16} />
                      </button>
                      {isAdmin(user) && (
                        <button
                          onClick={() => navigate(`/admin/facturacion?invoice=${inv.id}`)}
                          className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50"
                          title="Editar"
                        >
                          <Pencil size={16} />
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

      {openId && <InvoiceDetail id={openId} onClose={closeDetail} />}
    </div>
  )
}
