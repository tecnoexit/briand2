import { useEffect, useRef, useState } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import api from '../api/client'
import { formatMoney, round2, unitPriceFor } from '../lib/format'

export function productVisibility(p) {
  const v = p?.visibility
  if (v === 'all' || v === 'distribuidor_only' || v === 'regular_only') return v
  return p?.distribuidor_only ? 'distribuidor_only' : 'regular_only'
}

export function visibleForProduct(p, isDistribuidor) {
  const v = productVisibility(p)
  return isDistribuidor ? v !== 'regular_only' : v !== 'distribuidor_only'
}

const symbol = '$'

export default function ItemsEditor({
  items,
  onChange,
  isDistribuidor,
  currencies = [],
  productsById,
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [error, setError] = useState('')
  const productsRef = useRef({})

  useEffect(() => {
    if (productsById && Object.keys(productsById).length) {
      productsRef.current = { ...productsRef.current, ...productsById }
    }
  }, [productsById])

  // Recalcula precios de los ítems con producto conocido cuando cambia el tipo
  // de cliente (distribuidor) o cuando llegan las monedas.
  useEffect(() => {
    onChange(
      items.map((it) => {
        const p = it.product_id ? productsRef.current[it.product_id] : null
        if (!p) return it
        return { ...it, unit_price: round2(unitPriceFor(p, isDistribuidor, currencies)) }
      }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDistribuidor, currencies])

  useEffect(() => {
    if (query.trim().length < 1) {
      setResults([])
      return
    }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/products', { params: { search: query, all: 1 } })
        const list = data.data || data || []
        setResults(list)
        productsRef.current = {
          ...productsRef.current,
          ...Object.fromEntries(list.map((p) => [p.id, p])),
        }
      } catch {
        setResults([])
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  const addProduct = (p) => {
    if (!visibleForProduct(p, isDistribuidor)) {
      setError(
        productVisibility(p) === 'distribuidor_only'
          ? 'Producto exclusivo para clientes distribuidores.'
          : 'Producto reservado para clientes regulares (no distribuidores).',
      )
      return
    }
    setError('')
    productsRef.current = { ...productsRef.current, [p.id]: p }
    setQuery('')
    setResults([])
    const price = round2(unitPriceFor(p, isDistribuidor, currencies))
    const existing = items.find((it) => it.product_id === p.id)
    const newItem = {
      key: `p-${p.id}-${Date.now()}`,
      product_id: p.id,
      product_name: p.name,
      product_code: p.code,
      quantity: 1,
      unit_price: price,
      notes: '',
    }
    if (existing) {
      const updated = { ...existing, quantity: existing.quantity + 1 }
      onChange([updated, ...items.filter((it) => it.product_id !== p.id)])
    } else {
      onChange([newItem, ...items])
    }
  }

  const addManual = () => {
    onChange([
      {
        key: `m-${Date.now()}`,
        product_id: null,
        product_name: '',
        product_code: '',
        quantity: 1,
        unit_price: 0,
        notes: '',
      },
      ...items,
    ])
  }

  const updateItem = (key, field, value) => {
    onChange(items.map((it) => (it.key === key ? { ...it, [field]: value } : it)))
  }

  const removeItem = (key) => onChange(items.filter((it) => it.key !== key))

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
        {results.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
            {results
              .filter((p) => visibleForProduct(p, isDistribuidor))
              .map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => addProduct(p)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span>
                      <span className="text-slate-800">{p.name}</span>
                      {p.code && <span className="ml-2 text-xs text-slate-400">{p.code}</span>}
                    </span>
                    <span className="text-slate-500">
                      {formatMoney(round2(unitPriceFor(p, isDistribuidor, currencies)), symbol)}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2">Producto</th>
              <th className="w-20 py-2 text-center">Cant.</th>
              <th className="w-28 py-2 text-right">P. Unit.</th>
              <th className="w-28 py-2 text-right">Subtotal</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400">
                  Agregá productos.
                </td>
              </tr>
            ) : (
              items.map((it) => (
                <tr key={it.key} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-2">
                    <input
                      value={it.product_name}
                      onChange={(e) => updateItem(it.key, 'product_name', e.target.value)}
                      placeholder="Producto"
                      className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                    />
                    <input
                      value={it.notes}
                      onChange={(e) => updateItem(it.key, 'notes', e.target.value)}
                      placeholder="Nota del ítem (opcional)"
                      className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-600"
                    />
                  </td>
                  <td className="py-2 text-center">
                    <input
                      type="number"
                      min={1}
                      value={it.quantity}
                      onChange={(e) =>
                        updateItem(it.key, 'quantity', Math.max(1, Number(e.target.value)))
                      }
                      className="w-16 rounded border border-slate-200 px-2 py-1 text-center text-sm"
                    />
                  </td>
                  <td className="py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={it.unit_price}
                      onChange={(e) => updateItem(it.key, 'unit_price', Number(e.target.value))}
                      className="w-24 rounded border border-slate-200 px-2 py-1 text-right text-sm"
                    />
                  </td>
                  <td className="py-2 text-right font-medium text-slate-700">
                    {formatMoney(Number(it.quantity || 0) * Number(it.unit_price || 0), symbol)}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => removeItem(it.key)}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <button
        onClick={addManual}
        className="mt-3 flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800"
      >
        <Plus size={16} /> Agregar ítem manual
      </button>
    </div>
  )
}
