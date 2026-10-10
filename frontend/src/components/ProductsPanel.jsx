import { useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import api from '../api/client'
import { formatMoney, round2, unitPriceFor } from '../lib/format'
import { productVisibility, visibleForProduct } from './ItemsEditor'

function productBadges(p) {
  const v = productVisibility(p)
  const badges = []
  if (v === 'distribuidor_only') badges.push({ label: 'SOLO DIST.', cls: 'bg-blue-600 text-white' })
  if (v === 'regular_only') badges.push({ label: 'SOLO CLI.', cls: 'bg-amber-600 text-white' })
  if (p.distribuidor_discount_enabled) {
    badges.push({
      label: `DIST +${Number(p.distribuidor_discount_percent || 0).toFixed(0)}%`,
      cls: 'bg-green-600 text-white',
    })
  }
  return badges
}

export default function ProductsPanel({ isDistribuidor, currencies = [], onAdd, showPrices = true }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [openQuote, setOpenQuote] = useState(false)
  const symbol = '$'

  useEffect(() => {
    if (openQuote) return
    const q = query.trim()
    if (q.length < 1) {
      setResults([])
      return
    }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/products', { params: { search: q, all: 1 } })
        setResults(data.data || data || [])
      } catch {
        setResults([])
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query, openQuote])

  useEffect(() => {
    if (!openQuote) {
      setAllProducts([])
      return
    }
    let active = true
    api
      .get('/products', { params: { all: 1 } })
      .then(({ data }) => {
        if (active) setAllProducts(data.data || data || [])
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [openQuote])

  const canAdd = (p) => openQuote || visibleForProduct(p, isDistribuidor)

  const shownProducts = openQuote
    ? allProducts.filter((p) => {
        const q = query.trim().toLowerCase()
        if (!q) return true
        return (p.name || '').toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q)
      })
    : results

  return (
    <div>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar producto por nombre o código"
          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
        />
      </div>

      <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className="h-4 w-4 accent-green-600"
          checked={openQuote}
          onChange={(e) => setOpenQuote(e.target.checked)}
        />
        Presupuesto abierto: habilitar todos los productos
      </label>

      <div className="mt-3 max-h-[480px] overflow-y-auto rounded-lg border border-slate-100">
        {shownProducts.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">
            {openQuote ? 'Cargando productos…' : 'Escribí para buscar productos'}
          </p>
        ) : (
          shownProducts.map((p) => {
            const addable = canAdd(p)
            const price = round2(unitPriceFor(p, isDistribuidor, currencies))
            const badges = productBadges(p)
            return (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.code}</p>
                  {badges.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {badges.map((b) => (
                        <span
                          key={b.label}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${b.cls}`}
                        >
                          {b.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {showPrices && (
                    <span className="font-mono text-sm font-semibold text-slate-700">
                      {formatMoney(price, symbol)}
                    </span>
                  )}
                  <button
                    onClick={() => addable && onAdd(p)}
                    disabled={!addable}
                    title={addable ? 'Agregar' : 'Producto no disponible para este cliente'}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
