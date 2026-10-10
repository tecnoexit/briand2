import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Contact, Loader2, Pencil, Plus, Power, Search } from 'lucide-react'
import api from '../api/client'
import Modal from '../components/Modal'

const emptyForm = { name: '', phone: '', email: '', address: '', type: 'regular' }

const CLIENT_TYPES = [
  { value: 'regular', label: 'Regular' },
  { value: 'distribuidor', label: 'Distribuidor' },
]

const TYPE_BADGE = {
  regular: 'bg-sky-100 text-sky-700',
  distribuidor: 'bg-slate-200 text-slate-700',
}

export default function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('active')

  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { limit: 1000, status }
      if (search) params.search = search
      if (type) params.type = type
      const { data } = await api.get('/clients', { params })
      setClients(data)
    } finally {
      setLoading(false)
    }
  }, [search, type, status])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
    setShowForm(true)
  }

  const openEdit = (c) => {
    setEditing(c)
    setForm({
      name: c.name ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
      address: c.address ?? '',
      type: c.type ?? 'regular',
    })
    setFormError('')
    setShowForm(true)
  }

  const submit = async (e) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      type: form.type,
    }
    try {
      if (editing) {
        await api.put(`/clients/${editing.id}`, payload)
      } else {
        await api.post('/clients', payload)
      }
      setShowForm(false)
      await load()
    } catch (err) {
      const data = err?.response?.data
      setFormError(data?.message || data?.errors?.name?.[0] || 'No se pudo guardar el cliente')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (c) => {
    setError('')
    try {
      await api.put(`/clients/${c.id}`, { active: !c.active })
      await load()
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo cambiar el estado del cliente')
    }
  }

  return (
    <div className="p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Contact className="text-slate-500" />
          <h1 className="text-2xl font-semibold text-slate-800">Clientes</h1>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          <Plus size={16} /> Nuevo cliente
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
            placeholder="Buscar por nombre, email o teléfono"
            className="w-72 rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
          />
        </div>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500"
        >
          <option value="">Todos los tipos</option>
          {CLIENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500"
        >
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
          <option value="all">Todos</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Dirección</th>
              <th className="px-4 py-3">Estado</th>
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
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  No hay clientes.
                </td>
              </tr>
            ) : (
              clients.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        TYPE_BADGE[c.type || 'regular'] || 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {c.type === 'distribuidor' ? 'Distribuidor' : 'Regular'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.phone || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.email || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.address || '—'}</td>
                  <td className="px-4 py-3">
                    {c.active ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                        <CheckCircle2 size={14} /> Activo
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-400">Inactivo</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(c)}
                        className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => toggleActive(c)}
                        className={`rounded-lg border p-1.5 ${
                          c.active
                            ? 'border-slate-300 text-slate-600 hover:bg-red-50 hover:text-red-600'
                            : 'border-slate-300 text-green-700 hover:bg-green-50'
                        }`}
                        title={c.active ? 'Desactivar' : 'Reactivar'}
                      >
                        <Power size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title={editing ? 'Editar cliente' : 'Nuevo cliente'} onClose={() => setShowForm(false)}>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-600">Nombre *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-slate-600">Tipo</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500"
                >
                  {CLIENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Teléfono</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">Dirección</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500"
              />
            </div>

            {formError && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Guardar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
