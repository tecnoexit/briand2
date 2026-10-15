import { useEffect, useState } from 'react'
import { Contact, Loader2 } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function MyClients() {
  const { user } = useAuth()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    api
      .get('/clients', { params: { seller_id: user.id, limit: 1000, status: 'all' } })
      .then(({ data }) => setClients(data))
      .catch(() => setClients([]))
      .finally(() => setLoading(false))
  }, [user?.id])

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center gap-2">
        <Contact className="text-slate-500" />
        <h1 className="text-2xl font-semibold text-slate-800">Mis clientes</h1>
      </div>

      <p className="mb-4 text-sm text-slate-500">
        Clientes asignados a tu cuenta ({clients.length}).
      </p>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Dirección</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  <Loader2 className="mx-auto animate-spin" />
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  No tenés clientes asignados.
                </td>
              </tr>
            ) : (
              clients.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.type === 'distribuidor' ? 'Distribuidor' : 'Regular'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.phone || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.email || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.address || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
