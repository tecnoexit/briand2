import { useCallback, useEffect, useState } from 'react'
import { Coins, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import api from '../api/client'
import Modal from '../components/Modal'

const emptyForm = { name: '', symbol: '', rate: '', factor: '' }

export default function Currencies() {
  const [currencies, setCurrencies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [toDelete, setToDelete] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/currencies')
      setCurrencies(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
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
      symbol: c.symbol ?? '',
      rate: c.rate ?? '',
      factor: c.factor ?? '',
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
      symbol: form.symbol.trim(),
      rate: form.rate === '' ? 0 : Number(form.rate),
      factor: form.factor === '' ? 0 : Number(form.factor),
    }
    try {
      if (editing) {
        await api.put(`/currencies/${editing.id}`, payload)
      } else {
        await api.post('/currencies', payload)
      }
      setShowForm(false)
      await load()
    } catch (err) {
      setFormError(err?.response?.data?.message || 'No se pudo guardar la moneda')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    setError('')
    try {
      await api.delete(`/currencies/${toDelete.id}`)
      setToDelete(null)
      await load()
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo eliminar la moneda')
      setToDelete(null)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="text-slate-500" />
          <h1 className="text-2xl font-semibold text-slate-800">Monedas</h1>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          <Plus size={16} /> Nueva moneda
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Símbolo</th>
              <th className="px-4 py-3 text-right">Cotización (rate)</th>
              <th className="px-4 py-3 text-right">Factor (%)</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  <Loader2 className="mx-auto animate-spin" />
                </td>
              </tr>
            ) : currencies.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  No hay monedas.
                </td>
              </tr>
            ) : (
              currencies.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-3 text-slate-700">{c.symbol}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{Number(c.rate)}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{Number(c.factor)}</td>
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
                        onClick={() => setToDelete(c)}
                        className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-red-50 hover:text-red-600"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
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
        <Modal title={editing ? 'Editar moneda' : 'Nueva moneda'} onClose={() => setShowForm(false)}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm text-slate-600">Nombre *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Símbolo *</label>
                <input
                  value={form.symbol}
                  onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Cotización (rate) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.rate}
                  onChange={(e) => setForm({ ...form, rate: e.target.value })}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-600">Factor (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.factor}
                  onChange={(e) => setForm({ ...form, factor: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500"
                />
              </div>
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

      {toDelete && (
        <Modal title="Eliminar moneda" onClose={() => setToDelete(null)} width="max-w-sm">
          <p className="text-sm text-slate-600">
            ¿Eliminar <span className="font-semibold">{toDelete.name}</span>? Esta acción no se puede
            deshacer.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setToDelete(null)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={confirmDelete}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Eliminar
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
