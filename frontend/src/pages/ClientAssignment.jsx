import { useCallback, useEffect, useState } from 'react'
import { Contact, Loader2, Search } from 'lucide-react'
import api from '../api/client'

export default function ClientAssignment() {
  const [clients, setClients] = useState([])
  const [sellers, setSellers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [sellerFilter, setSellerFilter] = useState('')

  const [savingId, setSavingId] = useState(null)

  const loadSellers = useCallback(async () => {
    try {
      const { data } = await api.get('/users')
      const list = Array.isArray(data)
        ? data.filter((u) => u.role === 'vendedor' || u.role === 'distribuidor')
        : []
      setSellers(list.sort((a, b) => (a.name || '').localeCompare(b.name || '')))
    } catch {
      setSellers([])
    }
  }, [])

  const loadClients = useCallback(async () => {
    setLoading(true)
    try {
      const params = { limit: 1000, status: 'all' }
      if (search) params.search = search
      if (sellerFilter === 'none') params.unassigned = 1
      else if (sellerFilter) params.seller_id = sellerFilter
      const { data } = await api.get('/clients', { params })
      setClients(data)
      setError('')
    } catch {
      setError('No se pudieron cargar los clientes')
    } finally {
      setLoading(false)
    }
  }, [search, sellerFilter])

  useEffect(() => {
    loadSellers()
  }, [loadSellers])

  useEffect(() => {
    const t = setTimeout(loadClients, 250)
    return () => clearTimeout(t)
  }, [loadClients])

  const assign = async (client, sellerId) => {
    setError('')
    setSavingId(client.id)
    try {
      await api.put(`/clients/${client.id}/seller`, { seller_id: sellerId || null })
      await loadClients()
    } catch (e) {
      setError(e?.response?.data?.message || 'No se pudo actualizar la asignación')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center gap-2">
        <Contact className="text-slate-500" />
        <h1 className="text-2xl font-semibold text-slate-800">Asignación de clientes</h1>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente…"
            className="w-72 rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-green-500"
          />
        </div>
        <select
          value={sellerFilter}
          onChange={(e) => setSellerFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500"
        >
          <option value="">Todos los clientes</option>
          <option value="none">Sin vendedor asignado</option>
          {sellers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3">Vendedor asignado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                  <Loader2 className="mx-auto animate-spin" />
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                  No hay clientes.
                </td>
              </tr>
            ) : (
              clients.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.email || ''}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.type === 'distribuidor' ? 'Distribuidor' : 'Regular'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={c.seller_id ?? ''}
                      disabled={savingId === c.id}
                      onChange={(e) => assign(c, e.target.value)}
                      className="w-full max-w-xs rounded-lg border border-slate-300 px-2 py-1.5 text-sm disabled:opacity-50"
                    >
                      <option value="">Sin asignar</option>
                      {sellers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
