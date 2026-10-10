import { useCallback, useEffect, useState } from 'react'
import { Loader2, Pencil, Plus, Search, Trash2, Users as UsersIcon } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { ROLES, roleLabel } from '../lib/roles'
import { formatDate } from '../lib/format'
import Modal from '../components/Modal'

const emptyForm = { name: '', email: '', password: '', role: 'vendedor' }

const roleBadge = {
  admin: 'bg-purple-100 text-purple-700',
  vendedor: 'bg-green-100 text-green-700',
  deposito: 'bg-amber-100 text-amber-700',
  cliente: 'bg-sky-100 text-sky-700',
  distribuidor: 'bg-slate-200 text-slate-700',
}

export default function Users() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [toDelete, setToDelete] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/users')
      setUsers(data)
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

  const openEdit = (u) => {
    setEditing(u)
    setForm({ name: u.name ?? '', email: u.email ?? '', password: '', role: u.role ?? 'vendedor' })
    setFormError('')
    setShowForm(true)
  }

  const submit = async (e) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      if (editing) {
        const payload = { name: form.name.trim(), email: form.email.trim(), role: form.role }
        if (form.password) payload.password = form.password
        await api.put(`/users/${editing.id}`, payload)
      } else {
        await api.post('/users', {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
        })
      }
      setShowForm(false)
      await load()
    } catch (err) {
      const data = err?.response?.data
      setFormError(
        data?.message ||
          data?.errors?.email?.[0] ||
          data?.errors?.password?.[0] ||
          'No se pudo guardar el usuario',
      )
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    setError('')
    try {
      await api.delete(`/users/${toDelete.id}`)
      setToDelete(null)
      await load()
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo eliminar el usuario')
      setToDelete(null)
    }
  }

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
  })

  return (
    <div className="p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UsersIcon className="text-slate-500" />
          <h1 className="text-2xl font-semibold text-slate-800">Usuarios</h1>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-4">
        <div className="relative w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Alta</th>
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
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  No hay usuarios.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {u.name}
                    {u.id === me?.id && (
                      <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                        vos
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        roleBadge[u.role] || 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {roleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setToDelete(u)}
                        disabled={u.id === me?.id}
                        className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                        title={u.id === me?.id ? 'No podés eliminarte' : 'Eliminar'}
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
        <Modal
          title={editing ? 'Editar usuario' : 'Nuevo usuario'}
          onClose={() => setShowForm(false)}
        >
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
            <div>
              <label className="mb-1 block text-sm text-slate-600">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">
                Contraseña {editing ? '(dejar vacío para no cambiar)' : '*'}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={!editing}
                minLength={editing ? undefined : 8}
                autoComplete="new-password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">Rol *</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
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
        <Modal title="Eliminar usuario" onClose={() => setToDelete(null)} width="max-w-sm">
          <p className="text-sm text-slate-600">
            ¿Eliminar a <span className="font-semibold">{toDelete.name}</span>? Esta acción no se
            puede deshacer.
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
