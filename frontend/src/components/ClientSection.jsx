import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, Pencil, Search, UserPlus, X } from 'lucide-react'
import api from '../api/client'

const CLIENT_TABS = [
  { value: 'todos', label: 'Todos' },
  { value: 'regular', label: 'Regulares' },
  { value: 'distribuidor', label: 'Distribuidores' },
]

export default function ClientSection({ client, onChange }) {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('todos')
  const [results, setResults] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ id: null, name: '', phone: '', email: '', type: 'regular' })
  const [modalError, setModalError] = useState('')
  const [saving, setSaving] = useState(false)
  const boxRef = useRef(null)

  useEffect(() => {
    if (client) return
    const q = query.trim()
    if (q.length < 1) {
      setResults([])
      return
    }
    const t = setTimeout(async () => {
      try {
        const params = { search: q }
        if (tab !== 'todos') params.type = tab
        const { data } = await api.get('/clients', { params })
        setResults(Array.isArray(data) ? data : [])
      } catch {
        setResults([])
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query, tab, client])

  useEffect(() => {
    const handler = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setResults([])
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const pick = (c) => {
    onChange({ id: c.id, name: c.name, phone: c.phone, email: c.email, type: c.type || 'regular' })
    setQuery('')
    setResults([])
  }

  const openNew = () => {
    setForm({ id: null, name: '', phone: '', email: '', type: 'regular' })
    setModalError('')
    setModalOpen(true)
  }

  const openEdit = () => {
    setForm({
      id: client?.id ?? null,
      name: client?.name || '',
      phone: client?.phone || '',
      email: client?.email || '',
      type: client?.type || 'regular',
    })
    setModalError('')
    setModalOpen(true)
  }

  const save = async () => {
    setModalError('')
    if (!form.name.trim()) {
      setModalError('El nombre es obligatorio.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        type: form.type || 'regular',
      }
      const saved = form.id
        ? (await api.put(`/clients/${form.id}`, payload)).data
        : (await api.post('/clients', payload)).data
      onChange({
        id: saved.id,
        name: saved.name,
        phone: saved.phone,
        email: saved.email,
        type: saved.type || 'regular',
      })
      setModalOpen(false)
    } catch (err) {
      setModalError(err?.response?.data?.message || 'No se pudo guardar el cliente')
    } finally {
      setSaving(false)
    }
  }

  const isDistribuidor = client?.type === 'distribuidor'

  return (
    <div>
      {client ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span
              className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                isDistribuidor ? 'bg-blue-600 text-white' : 'bg-slate-700 text-white'
              }`}
            >
              {isDistribuidor
                ? 'Distribuidor - Precio costo + recargo'
                : 'Regular - Precio de lista'}
            </span>
            <p className="mt-2 text-lg font-semibold text-slate-800">{client.name}</p>
            <p className="text-sm text-slate-500">
              {isDistribuidor ? 'Distribuidor' : 'Cliente regular'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={openEdit}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Pencil size={15} /> Editar
            </button>
            <button
              onClick={() => onChange(null)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <X size={15} /> Cambiar
            </button>
          </div>
        </div>
      ) : (
        <div className="relative" ref={boxRef}>
          <div className="mb-3 flex flex-wrap gap-2">
            {CLIENT_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  tab === t.value
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
            <button
              onClick={openNew}
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-green-600 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50"
            >
              <UserPlus size={15} /> Nuevo cliente
            </button>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cliente por nombre, email o teléfono"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
            />
            {results.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {results.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => pick(c)}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      <span className="text-slate-800">{c.name}</span>
                      <span className="ml-2 text-xs capitalize text-slate-400">
                        {c.type || 'regular'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-800">
                {form.id ? 'Editar cliente' : 'Nuevo cliente'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 px-5 py-4">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nombre *"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="regular">Regular</option>
                <option value="distribuidor">Distribuidor</option>
              </select>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Teléfono"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Email"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              {modalError && <p className="text-sm text-red-600">{modalError}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
