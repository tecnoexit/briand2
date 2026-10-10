import { useEffect, useRef, useState } from 'react'
import { Search, UserPlus, X } from 'lucide-react'
import api from '../api/client'

const emptyNewClient = { name: '', phone: '', email: '', address: '', type: 'regular' }

export default function ClientPicker({ value, onChange }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newClient, setNewClient] = useState(emptyNewClient)
  const [error, setError] = useState('')
  const boxRef = useRef(null)

  useEffect(() => {
    if (query.trim().length < 1) {
      setResults([])
      return
    }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/clients', { params: { search: query } })
        setResults(data)
      } catch {
        setResults([])
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    const handler = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setShowResults(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const pick = (c) => {
    onChange({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      type: c.type || 'regular',
    })
    setQuery('')
    setResults([])
    setShowResults(false)
  }

  const create = async () => {
    if (!newClient.name.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    setError('')
    try {
      const { data } = await api.post('/clients', newClient)
      pick({ ...data, type: data.type || 'regular' })
      setShowNew(false)
      setNewClient(emptyNewClient)
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo crear el cliente')
    }
  }

  if (value) {
    return (
      <div className="flex items-start justify-between rounded-lg bg-slate-50 p-3">
        <div>
          <p className="font-medium text-slate-800">{value.name}</p>
          <p className="text-sm capitalize text-slate-500">
            {value.type || 'regular'}
            {value.phone ? ` · ${value.phone}` : ''}
            {value.email ? ` · ${value.email}` : ''}
          </p>
        </div>
        <button
          onClick={() => onChange(null)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200"
          title="Cambiar cliente"
        >
          <X size={18} />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative" ref={boxRef}>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setShowResults(true)
          }}
          onFocus={() => setShowResults(true)}
          placeholder="Buscar cliente por nombre, email o teléfono"
          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
        />
        {showResults && results.length > 0 && (
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

      <button
        onClick={() => setShowNew((v) => !v)}
        className="flex items-center gap-1.5 text-sm font-medium text-green-700 hover:underline"
      >
        <UserPlus size={16} /> Nuevo cliente
      </button>

      {showNew && (
        <div className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
          <input
            value={newClient.name}
            onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
            placeholder="Nombre *"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={newClient.type}
            onChange={(e) => setNewClient({ ...newClient, type: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="regular">Regular</option>
            <option value="distribuidor">Distribuidor</option>
          </select>
          <input
            value={newClient.phone}
            onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
            placeholder="Teléfono"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={newClient.email}
            onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
            placeholder="Email"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={newClient.address}
            onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
            placeholder="Dirección"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
          />
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
          <div className="sm:col-span-2">
            <button
              onClick={create}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Crear y seleccionar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
