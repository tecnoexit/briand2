import { useEffect, useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import api from '../api/client'
import { formatMoney, round2, unitPriceFor } from '../lib/format'

function productBadges(p) {
  const badges = []
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
  const [allProducts, setAllProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const symbol = '$'

  useEffect(() => {
    let active = true
    setLoading(true)
    api
      .get('/products', { params: { all: 1 } })
      .then(({ data }) => {
        if (active) setAllProducts(data.data || data || [])
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const shownProducts = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allProducts
    return allProducts.filter(
      (p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.code || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q),
    )
  }, [allProducts, query])

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

      <div className="mt-3 max-h-[480px] overflow-y-auto rounded-lg border border-slate-100">
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">Cargando productos…</p>
        ) : shownProducts.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">No se encontraron productos</p>
        ) : (
          shownProducts.map((p) => {
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
                    onClick={() => onAdd(p)}
                    title="Agregar"
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-600 text-white hover:bg-green-700"
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
