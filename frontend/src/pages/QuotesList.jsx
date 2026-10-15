import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, FileText, ListChecks, Loader2, Pencil, Printer, Receipt, Search, Trash2, X } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { isAdmin, QUOTE_ESTADOS, QUOTE_ESTADO_BADGE, quoteEstadoLabel } from '../lib/roles'
import { formatDay, formatMoney } from '../lib/format'
import Modal from '../components/Modal'
import PrintableDoc from '../components/PrintableDoc'

const symbol = '$'

function EstadoBadge({ estado }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
        QUOTE_ESTADO_BADGE[estado] || 'bg-slate-100 text-slate-600'
      }`}
    >
      {quoteEstadoLabel(estado)}
    </span>
  )
}

function QuoteDetail({ id, onClose, onEdit, onDelete, onFacturar, onDepositList }) {
  const { user } = useAuth()
  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    api
      .get(`/quotes/${id}`)
      .then(({ data }) => active && setQuote(data))
      .catch(() => active && setQuote(null))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [id])

  const canEdit = quote && (isAdmin(user) || quote.seller_id === user?.id)
  const canFacturar = canEdit && user?.role !== 'deposito'
  const hasPrices = quote && quote.total !== undefined && quote.total !== null

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">Presupuesto #{id}</h2>
          <div className="flex items-center gap-2">
            {quote && (
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Printer size={16} /> Imprimir
              </button>
            )}
            {quote && (
              <button
                onClick={() => onDepositList(quote)}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50"
                title="Listado depósito (sin precios)"
              >
                <ListChecks size={16} /> Listado depósito
              </button>
            )}
            {canEdit && quote && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
              >
                <Pencil size={16} /> Editar
              </button>
            )}
            {canFacturar && quote && (
              <button
                onClick={onFacturar}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Receipt size={16} /> Facturar
              </button>
            )}
            {canEdit && quote && (
              <button
                onClick={onDelete}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 size={16} /> Eliminar
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
        ) : !quote ? (
          <div className="p-6 text-slate-500">No se pudo cargar el presupuesto.</div>
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
                  <p className="text-[10px] text-slate-500">Av. Gral. Juan Facundo Quiroga 1143</p>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400">Presupuesto</p>
                </div>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold text-slate-800">Presupuesto #{id}</p>
                <p className="text-slate-500">{formatDay(quote.created_at)}</p>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-400">Cliente</p>
                <p className="font-medium text-slate-800">{quote.client_name}</p>
                {quote.client_type && (
                  <p className="capitalize text-slate-500">{quote.client_type}</p>
                )}
                {quote.client_phone && <p className="text-slate-500">{quote.client_phone}</p>}
                {quote.client_email && <p className="text-slate-500">{quote.client_email}</p>}
              </div>
              <div className="text-right">
                {quote.estado && <EstadoBadge estado={quote.estado} />}
                {quote.valid_until && (
                  <p className="mt-2 text-slate-500">
                    Válido hasta: <span className="text-slate-700">{formatDay(quote.valid_until)}</span>
                  </p>
                )}
                {quote.seller?.name && (
                  <p className="mt-2 text-slate-500">Vendedor: {quote.seller.name}</p>
                )}
              </div>
            </div>

            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-y border-slate-200 text-left text-slate-500">
                  <th className="py-2">Producto</th>
                  <th className="py-2 text-center">Cant.</th>
                  {hasPrices && <th className="py-2 text-right">P. Unit.</th>}
                  {hasPrices && <th className="py-2 text-right">Subtotal</th>}
                </tr>
              </thead>
              <tbody>
                {(quote.items || []).map((it) => (
                  <tr key={it.id} className="border-b border-slate-100">
                    <td className="py-2">
                      <p className="text-slate-800">{it.product_name}</p>
                      {it.product_code && <p className="text-xs text-slate-400">{it.product_code}</p>}
                      {it.notes && <p className="text-xs italic text-slate-400">{it.notes}</p>}
                    </td>
                    <td className="py-2 text-center text-slate-700">{it.quantity}</td>
                    {hasPrices && (
                      <td className="py-2 text-right text-slate-700">
                        {formatMoney(it.unit_price, symbol)}
                      </td>
                    )}
                    {hasPrices && (
                      <td className="py-2 text-right text-slate-700">
                        {formatMoney(it.total_price, symbol)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {hasPrices && (
              <div className="mt-4 ml-auto w-64 space-y-1 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatMoney(quote.subtotal, symbol)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>IVA ({Number(quote.tax_rate)}%)</span>
                  <span>{formatMoney(quote.tax_amount, symbol)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-semibold text-slate-900">
                  <span>Total</span>
                  <span>{formatMoney(quote.total, symbol)}</span>
                </div>
              </div>
            )}

            {quote.notes && (
              <div className="mt-6 text-sm">
                <p className="font-medium text-slate-500">Observaciones</p>
                <p className="whitespace-pre-wrap text-slate-700">{quote.notes}</p>
              </div>
            )}

            <p className="mt-8 border-t border-slate-100 pt-3 text-center text-xs text-slate-400">
              Presupuesto — precios sujetos a modificación sin previo aviso.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function QuotesList() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const openId = searchParams.get('quote')

  const admin = isAdmin(user)
  const readOnly = user?.role === 'deposito'
  const listBase = admin
    ? '/admin/presupuestos'
    : user?.role === 'deposito'
      ? '/deposito/presupuestos'
      : '/vendedor/presupuestos'
  const invoiceBase = admin ? '/admin/facturacion' : '/vendedor/facturacion'

  const [quotes, setQuotes] = useState([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [toDelete, setToDelete] = useState(null)
  const [printDoc, setPrintDoc] = useState(null)

  const fetchQuotes = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page }
      if (search) params.search = search
      if (estado) params.estado = estado
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      const { data } = await api.get('/quotes', { params })
      setQuotes(data.data || [])
      setMeta({
        current_page: data.current_page,
        last_page: data.last_page,
        total: data.total,
      })
    } finally {
      setLoading(false)
    }
  }, [page, search, estado, dateFrom, dateTo])

  useEffect(() => {
    const t = setTimeout(fetchQuotes, 250)
    return () => clearTimeout(t)
  }, [fetchQuotes])

  useEffect(() => {
    setPage(1)
  }, [search, estado, dateFrom, dateTo])

  const closeDetail = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('quote')
    setSearchParams(next, { replace: true })
  }

  const openDetail = (id) => {
    setSearchParams(
      { ...Object.fromEntries(searchParams), quote: String(id) },
      { replace: true },
    )
  }

  const canEditQuote = (q) => admin || q.seller_id === user?.id

  const facturar = (id) => navigate(`${invoiceBase}?quote=${id}`)

  const openPrintById = async (id, docType) => {
    setError('')
    try {
      const { data } = await api.get(`/quotes/${id}`)
      setPrintDoc({ doc: data, docType, sellerName: data.seller?.name || '' })
    } catch {
      setError('No se pudo cargar el presupuesto')
    }
  }

  const confirmDelete = async () => {
    setError('')
    try {
      await api.delete(`/quotes/${toDelete.id}`)
      setToDelete(null)
      closeDetail()
      await fetchQuotes()
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo eliminar el presupuesto')
      setToDelete(null)
    }
  }

  const hasPrices = (q) => q.total !== undefined && q.total !== null

  return (
    <div className="p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="text-slate-500" />
          <h1 className="text-2xl font-semibold text-slate-800">Presupuestos</h1>
        </div>
        <button
          onClick={() => navigate(`${listBase}/nuevo`)}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Nuevo presupuesto
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

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
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500"
        >
          <option value="">Todos los estados</option>
          {QUOTE_ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
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
            Página {meta.current_page} de {meta.last_page} · {meta.total} presupuestos
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
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Válido hasta</th>
              {!readOnly && <th className="px-4 py-3 text-right">Total</th>}
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                  <Loader2 className="mx-auto animate-spin" />
                </td>
              </tr>
            ) : quotes.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                  No hay presupuestos.
                </td>
              </tr>
            ) : (
              quotes.map((q) => (
                <tr key={q.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-700">#{q.id}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDay(q.created_at)}</td>
                  <td className="px-4 py-3">
                    <p className="text-slate-800">{q.client_name}</p>
                    {q.client_type && (
                      <p className="text-xs capitalize text-slate-400">{q.client_type}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{q.seller?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <EstadoBadge estado={q.estado} />
                      {q.sin_precios && (
                        <span className="rounded-full border border-purple-300 bg-purple-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-700">
                          Sin precios
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDay(q.valid_until)}</td>
                  {!readOnly && (
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {hasPrices(q) ? formatMoney(q.total, symbol) : '—'}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openDetail(q.id)}
                        className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50"
                        title="Ver detalle"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => openPrintById(q.id, 'listado')}
                        className="rounded-lg border border-emerald-200 p-1.5 text-emerald-600 hover:bg-emerald-50"
                        title="Listado depósito (sin precios)"
                      >
                        <ListChecks size={16} />
                      </button>
                      {canEditQuote(q) && (
                        <button
                          onClick={() => navigate(`${listBase}/${q.id}/editar`)}
                          className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      {!readOnly && canEditQuote(q) && (
                        <button
                          onClick={() => facturar(q.id)}
                          className="rounded-lg border border-blue-200 p-1.5 text-blue-600 hover:bg-blue-50"
                          title="Facturar"
                        >
                          <Receipt size={16} />
                        </button>
                      )}
                      {canEditQuote(q) && (
                        <button
                          onClick={() => setToDelete({ id: q.id })}
                          className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                          title="Eliminar presupuesto"
                        >
                          <Trash2 size={16} />
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

      {openId && (
        <QuoteDetail
          id={openId}
          onClose={closeDetail}
          onEdit={() => navigate(`${listBase}/${openId}/editar`)}
          onFacturar={() => facturar(openId)}
          onDelete={() => setToDelete({ id: openId })}
          onDepositList={(quote) =>
            setPrintDoc({ doc: quote, docType: 'listado', sellerName: quote.seller?.name || '' })
          }
        />
      )}

      {printDoc && (
        <PrintableDoc
          doc={printDoc.doc}
          docType={printDoc.docType}
          sellerName={printDoc.sellerName}
          onClose={() => setPrintDoc(null)}
        />
      )}

      {toDelete && (
        <Modal title="Eliminar presupuesto" onClose={() => setToDelete(null)} width="max-w-sm">
          <p className="text-sm text-slate-600">
            ¿Eliminar el presupuesto <span className="font-semibold">#{toDelete.id}</span>? Esta
            acción no se puede deshacer.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setToDelete(null)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={confirmDelete}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Eliminar
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
