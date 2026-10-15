import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Loader2 } from 'lucide-react'
import api from '../api/client'
import { formatMoney } from '../lib/format'

export default function CuentaCorriente() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/cuenta-corriente')
      .then(({ data }) => setData(data))
      .catch(() => setError('No se pudo cargar el resumen de cuentas corrientes'))
      .finally(() => setLoading(false))
  }, [])

  const sellers = data?.sellers || []
  const totals = data?.totals || {}

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Cuenta corriente por vendedor</h1>
        <p className="text-xs text-slate-500">
          Saldo = saldo inicial + boletas vigentes − pagos registrados
        </p>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Saldo inicial total" value={formatMoney(totals.opening_balance)} />
        <SummaryCard label="Boletas vigentes" value={formatMoney(totals.invoiced)} />
        <SummaryCard label="Pagos" value={formatMoney(totals.paid)} />
        <SummaryCard label="Saldo pendiente total" value={formatMoney(totals.balance)} accent />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Vendedor</th>
                <th className="px-4 py-3 text-right">Saldo inicial</th>
                <th className="px-4 py-3 text-right">Boletas</th>
                <th className="px-4 py-3 text-right">Pagos</th>
                <th className="px-4 py-3 text-right">Saldo pendiente</th>
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
              ) : sellers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No hay vendedores.
                  </td>
                </tr>
              ) : (
                sellers.map((row) => (
                  <tr key={row.seller.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{row.seller.name}</p>
                      <p className="text-xs text-slate-400">{row.seller.email}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatMoney(row.opening_balance)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatMoney(row.invoiced)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatMoney(row.paid)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatMoney(row.balance)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => navigate(`/admin/cuenta-corriente/${row.seller.id}`)}
                        className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50"
                        title="Ver detalle"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, accent = false }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${accent ? 'text-slate-900' : 'text-slate-800'}`}>
        {value}
      </p>
    </div>
  )
}
