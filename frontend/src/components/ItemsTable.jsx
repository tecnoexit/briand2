import { Plus, Trash2 } from 'lucide-react'
import { formatMoney, round2 } from '../lib/format'
import { addManualItem } from '../lib/items'

function applyPercent(item, raw) {
  const base = Number(item.base_unit_price ?? item.unit_price ?? 0)
  const pct = raw === '' ? 0 : Number(raw)
  const unit_price = round2(base * (1 + pct / 100))
  return { ...item, base_unit_price: base, price_adjust_percent: pct, unit_price }
}

function applyUnitPrice(item, raw) {
  const unit_price = raw === '' ? 0 : Number(raw)
  return { ...item, base_unit_price: unit_price, price_adjust_percent: 0, unit_price }
}

function visibilityCellClass(it) {
  if (it.distribuidor_discount_enabled) return 'bg-green-50'
  if (it.visibility === 'regular_only') return 'bg-amber-50'
  return ''
}

function visibilityBadge(it) {
  if (it.distribuidor_discount_enabled) {
    const pct = Number(it.distribuidor_discount_percent ?? 0)
    const label = Number.isFinite(pct) && pct !== 0 ? `DIST +${pct.toFixed(0)}%` : 'DIST'
    return (
      <span
        title="Producto con precio/descuento para distribuidores"
        className="mt-1 inline-block rounded bg-green-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white"
      >
        {label}
      </span>
    )
  }
  if (it.visibility === 'regular_only') {
    return (
      <span
        title="Producto exclusivo para clientes regulares"
        className="mt-1 inline-block rounded bg-amber-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white"
      >
        Solo cli.
      </span>
    )
  }
  return null
}

export default function ItemsTable({ items, onChange, symbol = '$', showPrices = true }) {
  const updateItem = (key, field, value) =>
    onChange(items.map((it) => (it.key === key ? { ...it, [field]: value } : it)))

  const removeItem = (key) => onChange(items.filter((it) => it.key !== key))

  const addManual = () => onChange(addManualItem(items))

  const colSpan = showPrices ? 7 : 4

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[11px] font-bold uppercase text-slate-500">
              <th className="py-2 pr-2">Código</th>
              <th className="w-20 py-2 text-center">Cant.</th>
              <th className="py-2 pr-2">Descripción</th>
              {showPrices && <th className="w-20 py-2 text-center">Ajuste %</th>}
              {showPrices && <th className="w-28 py-2 text-right">P. Unit.</th>}
              {showPrices && <th className="w-28 py-2 text-right">P. Total</th>}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="py-10 text-center text-slate-400">
                  Buscá y agregá productos desde el panel derecho
                </td>
              </tr>
            ) : (
              items.map((it) => (
                <tr key={it.key} className="border-b border-slate-100 align-top">
                  <td className={`py-2 pr-2 ${visibilityCellClass(it)}`}>
                    <input
                      value={it.product_code}
                      onChange={(e) => updateItem(it.key, 'product_code', e.target.value)}
                      className="w-24 rounded border border-slate-200 px-2 py-1 text-xs"
                    />
                    {visibilityBadge(it)}
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
                  {showPrices && (
                    <td className="py-2 text-center">
                      <input
                        type="number"
                        step="0.5"
                        value={it.price_adjust_percent ?? 0}
                        title="Ajuste sobre el costo calculado (%). Negativo = debajo del costo, positivo = recargo."
                        onChange={(e) =>
                          onChange(
                            items.map((x) =>
                              x.key === it.key ? applyPercent(x, e.target.value) : x,
                            ),
                          )
                        }
                        className="w-20 rounded border border-slate-200 px-2 py-1 text-center text-sm"
                      />
                    </td>
                  )}
                  {showPrices && (
                    <td className="py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={it.unit_price}
                        onChange={(e) =>
                          onChange(
                            items.map((x) =>
                              x.key === it.key ? applyUnitPrice(x, e.target.value) : x,
                            ),
                          )
                        }
                        className="w-24 rounded border border-slate-200 px-2 py-1 text-right text-sm"
                      />
                    </td>
                  )}
                  {showPrices && (
                    <td className="py-2 text-right font-medium text-slate-700">
                      {formatMoney(Number(it.quantity || 0) * Number(it.unit_price || 0), symbol)}
                    </td>
                  )}
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
