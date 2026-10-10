import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  ImageOff,
  Layers,
  Loader2,
  PackagePlus,
  Pencil,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import api from '../api/client'
import Modal from '../components/Modal'
import { productVisibility } from '../components/ItemsEditor'
import { formatMoney } from '../lib/format'

const VISIBILITY_LABEL = {
  all: 'Todos los clientes',
  distribuidor_only: 'Solo distribuidores',
  regular_only: 'Solo clientes',
}

const EMPTY_PRODUCT = {
  name: '',
  description: '',
  code: '',
  precio_lista: 0,
  impuesto: 0,
  profit_margin: 0,
  currency_id: 0,
  image_url: '',
  stock: 0,
  distribuidor_discount_enabled: false,
  distribuidor_discount_percent: 0,
  visibility: 'all',
  distribuidor_only: false,
}

const costo = (lista, imp) => (Number(lista) || 0) * (1 + (Number(imp) || 0) / 100)

function findCurrency(currencies, id) {
  return currencies.find((c) => c.id === id)
}

function ProductForm({ product, currencies, onClose, onSaved }) {
  const editing = !!product
  const [form, setForm] = useState(() =>
    product
      ? {
          name: product.name || '',
          description: product.description || '',
          code: product.code || '',
          precio_lista: Number(product.precio_lista ?? product.price ?? 0),
          impuesto: Number(product.impuesto ?? 0),
          profit_margin: Number(product.profit_margin || 0),
          currency_id: product.currency_id,
          image_url: product.image_url || '',
          stock: product.stock,
          distribuidor_discount_enabled: !!product.distribuidor_discount_enabled,
          distribuidor_discount_percent: Number(product.distribuidor_discount_percent ?? 0),
          visibility: productVisibility(product),
        }
      : { ...EMPTY_PRODUCT, currency_id: currencies[0]?.id || 0 },
  )
  const [imageFile, setImageFile] = useState(null)
  const [preview, setPreview] = useState(
    product?.image_url ? `/backapi${product.image_url}` : null,
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  const currency = findCurrency(currencies, form.currency_id)
  const rate = Number(currency?.rate ?? 1)
  const factor = Number(currency?.factor ?? 0)
  const cost = costo(form.precio_lista, form.impuesto)
  const salePrice = cost * (1 + factor / 100) * (1 + (Number(form.profit_margin) || 0) / 100) * rate
  const distPrice =
    cost * rate * (1 + (Number(form.distribuidor_discount_percent) || 0) / 100)

  const pickFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const toDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
    })

  const handleSave = async () => {
    setError('')
    if (!form.name?.trim() || !form.code?.trim()) {
      setError('Nombre y código son obligatorios.')
      return
    }
    const visibility = form.visibility ?? 'all'
    const payload = {
      name: form.name,
      description: form.description || '',
      code: form.code,
      precio_lista: Number(form.precio_lista) || 0,
      impuesto: parseFloat((Number(form.impuesto) || 0).toFixed(2)),
      profit_margin: Number(form.profit_margin) || 0,
      currency_id: form.currency_id,
      stock: Number(form.stock) || 0,
      distribuidor_discount_enabled: !!form.distribuidor_discount_enabled,
      distribuidor_discount_percent: form.distribuidor_discount_enabled
        ? Number(form.distribuidor_discount_percent) || 0
        : 0,
      visibility,
      distribuidor_only: visibility === 'distribuidor_only',
    }
    setSaving(true)
    try {
      if (imageFile) payload.image = await toDataUrl(imageFile)
      if (editing) {
        await api.put(`/products/${product.id}`, payload)
      } else {
        await api.post('/products', payload)
      }
      onSaved()
    } catch (err) {
      const data = err?.response?.data
      setError(data?.message || data?.errors?.code?.[0] || 'No se pudo guardar el producto')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-800">
            {editing ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Imagen del Producto</label>
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-4">
              {preview ? (
                <div className="relative h-32 w-32 overflow-hidden rounded-lg border border-slate-200">
                  <img src={preview} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null)
                      setPreview(null)
                    }}
                    className="absolute right-1 top-1 rounded-full bg-red-600 p-1 text-white"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <ImageOff className="h-8 w-8 text-slate-300" />
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={pickFile}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-white"
              >
                <Upload size={14} /> Seleccionar Archivo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Código</label>
              <input
                value={form.code}
                onChange={(e) => set('code', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Moneda</label>
              <select
                value={form.currency_id}
                onChange={(e) => set('currency_id', parseInt(e.target.value, 10))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {currencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Nombre</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Precio Lista</label>
              <input
                type="number"
                step="0.01"
                value={Number.isNaN(form.precio_lista) ? '' : form.precio_lista}
                onChange={(e) => set('precio_lista', parseFloat(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">
                Impuesto <span className="font-normal text-slate-400">(%)</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={Number.isNaN(form.impuesto) ? '' : form.impuesto}
                onChange={(e) => set('impuesto', parseFloat(e.target.value))}
                placeholder="Ej: 20 para IVA 20%"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Precio Costo (calculado)
            </span>
            <span className="font-mono font-bold text-slate-800">{formatMoney(cost)}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-green-700">Ganancia %</label>
              <input
                type="number"
                step="0.1"
                value={Number.isNaN(form.profit_margin) ? '' : form.profit_margin}
                onChange={(e) => set('profit_margin', parseFloat(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Stock</label>
              <input
                type="number"
                value={Number.isNaN(form.stock) ? '' : form.stock}
                onChange={(e) => set('stock', parseInt(e.target.value, 10))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Descripción</label>
            <input
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50/50 p-3">
            <p className="text-xs font-bold uppercase text-blue-700">Configuración Distribuidor</p>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-blue-600"
                checked={!!form.distribuidor_discount_enabled}
                onChange={(e) => set('distribuidor_discount_enabled', e.target.checked)}
              />
              <span className="text-xs">
                Aplicar precio distribuidor (precio costo + % distribuidor)
              </span>
            </label>
            {form.distribuidor_discount_enabled && (
              <div className="space-y-1 pl-6">
                <label className="text-xs font-bold text-slate-600">
                  Porcentaje distribuidor sobre costo (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={Number.isNaN(form.distribuidor_discount_percent) ? '' : form.distribuidor_discount_percent}
                  onChange={(e) => set('distribuidor_discount_percent', parseFloat(e.target.value))}
                  placeholder="Ej: 50 → precio = costo × 1.50"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <div className="mt-1 flex items-center justify-between rounded border border-blue-200 bg-blue-50 px-2 py-1.5">
                  <span className="text-[10px] font-bold uppercase text-blue-700">
                    Precio distribuidor
                  </span>
                  <span className="font-mono text-sm font-bold text-blue-700">
                    {formatMoney(distPrice)}
                  </span>
                </div>
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">
                Visibilidad del producto
              </label>
              <select
                value={form.visibility ?? 'all'}
                onChange={(e) => set('visibility', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="all">{VISIBILITY_LABEL.all}</option>
                <option value="distribuidor_only">{VISIBILITY_LABEL.distribuidor_only}</option>
                <option value="regular_only">{VISIBILITY_LABEL.regular_only}</option>
              </select>
              <p className="mt-1 pl-1 text-[10px] text-slate-400">
                Define qué clientes pueden ver este producto en el catálogo y facturarlo.
              </p>
            </div>
          </div>

          <div className="space-y-1 rounded-lg border border-green-200 bg-green-50/50 p-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase text-slate-500">Precio Costo</p>
              <p className="font-mono font-semibold text-slate-800">{formatMoney(cost)}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase text-slate-500">
                Precio Venta (Local)
              </p>
              <p className="text-xl font-bold text-green-700">{formatMoney(salePrice)}</p>
            </div>
            <p className="pt-1 text-[10px] text-slate-400">
              Costo × (1 + Factor%) × (1 + Ganancia%) × Cotización
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="border-t border-slate-200 px-5 py-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Products() {
  const [products, setProducts] = useState([])
  const [currencies, setCurrencies] = useState([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0, from: 0, to: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [currencyFilter, setCurrencyFilter] = useState('all')
  const [visibilityFilter, setVisibilityFilter] = useState('todos')
  const [sort, setSort] = useState('updated_at')
  const [direction, setDirection] = useState('desc')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [bulk, setBulk] = useState(false)
  const [overrides, setOverrides] = useState({})

  useEffect(() => {
    api.get('/currencies').then(({ data }) => setCurrencies(data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(id)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [currencyFilter, visibilityFilter])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page, search, sort, direction }
      if (currencyFilter !== 'all') params.currency_id = currencyFilter
      if (visibilityFilter !== 'todos') params.visibility = visibilityFilter
      const { data } = await api.get('/products', { params })
      setProducts(data.data || [])
      setMeta({
        current_page: data.current_page || 1,
        last_page: data.last_page || 1,
        total: data.total || 0,
        from: data.from || 0,
        to: data.to || 0,
      })
    } catch {
      setError('No se pudieron cargar los productos')
    } finally {
      setLoading(false)
    }
  }, [page, search, sort, direction, currencyFilter, visibilityFilter])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const toggleSort = (column) => {
    if (sort === column) {
      setDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSort(column)
      setDirection('asc')
    }
  }

  const SortIcon = ({ column }) => {
    if (sort !== column) return <ChevronsUpDown className="ml-1 inline h-3 w-3 opacity-30" />
    return direction === 'asc' ? (
      <ChevronUp className="ml-1 inline h-3 w-3 text-green-600" />
    ) : (
      <ChevronDown className="ml-1 inline h-3 w-3 text-green-600" />
    )
  }

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (product) => {
    setEditing(product)
    setFormOpen(true)
  }

  const onSaved = () => {
    setFormOpen(false)
    setEditing(null)
    fetchProducts()
  }

  const setOverride = (id, field, value) =>
    setOverrides((o) => ({ ...o, [id]: { ...o[id], [field]: value } }))

  const val = (product, field) => overrides[product.id]?.[field] ?? product[field]

  const startBulk = () => {
    setBulk(true)
    setOverrides({})
  }

  const cancelBulk = () => {
    setBulk(false)
    setOverrides({})
  }

  const saveBulk = async () => {
    const items = Object.entries(overrides).map(([id, changes]) => ({
      id: parseInt(id, 10),
      ...changes,
    }))
    setError('')
    if (items.length === 0) {
      cancelBulk()
      return
    }
    try {
      await api.put('/products/bulk', { items })
      cancelBulk()
      fetchProducts()
    } catch {
      setError('No se pudo guardar la edición masiva')
    }
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/products/${deleteTarget.id}`)
      setDeleteTarget(null)
      fetchProducts()
    } catch {
      setError('No se pudo eliminar el producto')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const displayPrice = useCallback(
    (product, kind) => {
      const lista = Number(val(product, 'precio_lista') ?? 0)
      const imp = Number(val(product, 'impuesto') ?? 0)
      const margin = Number(val(product, 'profit_margin') ?? 0)
      const currency = findCurrency(currencies, val(product, 'currency_id'))
      const rate = Number(currency?.rate ?? 1)
      const factor = Number(currency?.factor ?? 0)
      const cost = costo(lista, imp)
      if (kind === 'dist') {
        const pct = Number(val(product, 'distribuidor_discount_percent') ?? 0)
        return cost * rate * (1 + pct / 100)
      }
      return cost * (1 + factor / 100) * (1 + margin / 100) * rate
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currencies, overrides],
  )

  const hasAnyOverride = useMemo(() => Object.keys(overrides).length > 0, [overrides])

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <h1 className="text-2xl font-semibold text-slate-800">Productos</h1>
        <div className="flex flex-wrap gap-2">
          {bulk ? (
            <>
              <button
                onClick={cancelBulk}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <X size={16} /> Cancelar
              </button>
              <button
                onClick={saveBulk}
                disabled={!hasAnyOverride}
                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
              >
                <Save size={16} /> Guardar Cambios
              </button>
            </>
          ) : (
            <>
              <button
                onClick={startBulk}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Layers size={16} /> Edición Masiva
              </button>
              <button
                onClick={openNew}
                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                <PackagePlus size={16} /> Nuevo Producto
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre o código..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
          />
        </div>
        <select
          value={currencyFilter}
          onChange={(e) => setCurrencyFilter(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-56"
        >
          <option value="all">Todas las monedas</option>
          {currencies.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.name} ({c.symbol})
            </option>
          ))}
        </select>
        <select
          value={visibilityFilter}
          onChange={(e) => setVisibilityFilter(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-56"
        >
          <option value="todos">Todos</option>
          <option value="distribuidor_only">Solo distribuidor</option>
          <option value="regular_only">Solo clientes</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                <th className="px-4 py-3 text-left">Imagen</th>
                <th className="cursor-pointer px-4 py-3 text-left" onClick={() => toggleSort('code')}>
                  Código <SortIcon column="code" />
                </th>
                <th className="cursor-pointer px-4 py-3 text-left" onClick={() => toggleSort('name')}>
                  Producto <SortIcon column="name" />
                </th>
                <th className="px-4 py-3 text-right">P. Lista</th>
                <th className="px-4 py-3 text-right">Impuesto</th>
                <th className="px-4 py-3 text-right">P. Costo</th>
                <th className="px-4 py-3 text-right text-green-700">Ganancia %</th>
                <th className="px-4 py-3 text-center text-blue-700">% Dist.</th>
                <th className="px-4 py-3 text-center text-blue-700">Visibilidad</th>
                <th className="px-4 py-3 text-center">Moneda</th>
                <th className="px-4 py-3 text-right">Precio Venta (Local)</th>
                <th
                  className="cursor-pointer px-4 py-3 text-right"
                  onClick={() => toggleSort('stock')}
                >
                  Stock <SortIcon column="stock" />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-right"
                  onClick={() => toggleSort('updated_at')}
                >
                  Actualizado <SortIcon column="updated_at" />
                </th>
                {!bulk && <th className="px-4 py-3 text-center">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={14} className="px-4 py-12 text-center text-slate-400">
                    <Loader2 className="mx-auto animate-spin" />
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-12 text-center text-slate-400">
                    No hay productos.
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const currency = findCurrency(currencies, val(product, 'currency_id'))
                  const rate = Number(currency?.rate ?? 1)
                  const cost = costo(val(product, 'precio_lista'), val(product, 'impuesto'))
                  const costLocal = cost * rate
                  const distEnabled = !!val(product, 'distribuidor_discount_enabled')
                  const visibility = productVisibility({
                    ...product,
                    visibility: val(product, 'visibility'),
                  })
                  return (
                    <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50">
                          {product.image_url ? (
                            <img
                              src={`/backapi${product.image_url}`}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImageOff className="h-4 w-4 text-slate-300" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {bulk ? (
                          <input
                            value={val(product, 'code') ?? ''}
                            onChange={(e) => setOverride(product.id, 'code', e.target.value)}
                            className="w-20 rounded border border-slate-300 px-1 py-0.5 text-xs"
                          />
                        ) : (
                          product.code
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {bulk ? (
                          <div className="space-y-1">
                            <input
                              value={val(product, 'name') ?? ''}
                              onChange={(e) => setOverride(product.id, 'name', e.target.value)}
                              className="w-full rounded border border-slate-300 px-1 py-0.5 text-xs"
                            />
                            <input
                              value={val(product, 'description') ?? ''}
                              onChange={(e) =>
                                setOverride(product.id, 'description', e.target.value)
                              }
                              placeholder="Descripción..."
                              className="w-full rounded border border-slate-300 px-1 py-0.5 text-[10px]"
                            />
                          </div>
                        ) : (
                          <>
                            <p className="font-medium text-slate-800">{product.name}</p>
                            <p className="max-w-[180px] truncate text-[10px] text-slate-400">
                              {product.description}
                            </p>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {bulk ? (
                          <input
                            type="number"
                            value={val(product, 'precio_lista') ?? 0}
                            onChange={(e) =>
                              setOverride(product.id, 'precio_lista', parseFloat(e.target.value))
                            }
                            className="w-24 rounded border border-slate-300 px-1 py-0.5 text-right text-xs"
                          />
                        ) : (
                          <span className="font-mono">
                            {formatMoney(Number(product.precio_lista ?? product.price ?? 0))}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {bulk ? (
                          <input
                            type="number"
                            step="0.01"
                            value={val(product, 'impuesto') ?? 0}
                            onChange={(e) =>
                              setOverride(
                                product.id,
                                'impuesto',
                                parseFloat(parseFloat(e.target.value).toFixed(2)),
                              )
                            }
                            className="w-20 rounded border border-slate-300 px-1 py-0.5 text-right text-xs"
                          />
                        ) : (
                          <span className="font-mono text-xs text-slate-500">
                            {Number(product.impuesto ?? 0).toFixed(2)}%
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-mono font-semibold">{formatMoney(cost)}</span>
                          {rate !== 1 && (
                            <span className="font-mono text-xs text-slate-400">
                              {formatMoney(costLocal)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {bulk ? (
                          <input
                            type="number"
                            value={val(product, 'profit_margin') ?? 0}
                            onChange={(e) =>
                              setOverride(product.id, 'profit_margin', parseFloat(e.target.value))
                            }
                            className="w-16 rounded border border-green-300 px-1 py-0.5 text-right text-xs"
                          />
                        ) : (
                          <span className="font-semibold text-green-700">
                            {product.profit_margin ?? 0}%
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-center">
                        {bulk ? (
                          <div className="flex flex-col items-center gap-1">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-blue-600"
                              checked={distEnabled}
                              onChange={(e) =>
                                setOverride(
                                  product.id,
                                  'distribuidor_discount_enabled',
                                  e.target.checked,
                                )
                              }
                            />
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              disabled={!distEnabled}
                              value={val(product, 'distribuidor_discount_percent') ?? 0}
                              onChange={(e) =>
                                setOverride(
                                  product.id,
                                  'distribuidor_discount_percent',
                                  parseFloat(e.target.value),
                                )
                              }
                              className="w-16 rounded border border-slate-300 px-1 py-0.5 text-right text-xs disabled:opacity-40"
                            />
                            {distEnabled && (
                              <span className="font-mono text-[10px] font-semibold text-blue-700">
                                {formatMoney(displayPrice(product, 'dist'))}
                              </span>
                            )}
                          </div>
                        ) : product.distribuidor_discount_enabled ? (
                          <div className="flex flex-col items-center">
                            <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              +{Number(product.distribuidor_discount_percent ?? 0).toFixed(0)}%
                            </span>
                            <span className="font-mono text-[10px] font-semibold text-blue-700">
                              {formatMoney(displayPrice(product, 'dist'))}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-center">
                        {bulk ? (
                          <select
                            value={val(product, 'visibility') ?? 'all'}
                            onChange={(e) => setOverride(product.id, 'visibility', e.target.value)}
                            className="rounded border border-slate-300 px-1 py-0.5 text-xs"
                          >
                            <option value="all">Todos</option>
                            <option value="distribuidor_only">Solo distrib.</option>
                            <option value="regular_only">Solo clientes</option>
                          </select>
                        ) : visibility === 'distribuidor_only' ? (
                          <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            SOLO DIST
                          </span>
                        ) : visibility === 'regular_only' ? (
                          <span className="rounded bg-amber-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            SOLO CLI
                          </span>
                        ) : (
                          <span className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                            TODOS
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {bulk ? (
                          <select
                            value={val(product, 'currency_id')}
                            onChange={(e) =>
                              setOverride(product.id, 'currency_id', parseInt(e.target.value, 10))
                            }
                            className="rounded border border-slate-300 px-1 py-0.5 text-xs"
                          >
                            {currencies.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.symbol}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold">
                            {currency?.symbol || '$'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-green-700">
                        {formatMoney(displayPrice(product, 'regular'))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {bulk ? (
                          <input
                            type="number"
                            value={val(product, 'stock') ?? 0}
                            onChange={(e) =>
                              setOverride(product.id, 'stock', parseInt(e.target.value, 10))
                            }
                            className="w-20 rounded border border-slate-300 px-1 py-0.5 text-right text-xs"
                          />
                        ) : (
                          product.stock
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-[10px] text-slate-400">
                        {new Date(product.updated_at).toLocaleString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      {!bulk && (
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => openEdit(product)}
                              className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50"
                              title="Editar"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(product)}
                              className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {meta.last_page > 1 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row">
            <div className="text-xs text-slate-500">
              Mostrando <span className="font-bold text-slate-700">{meta.from}</span> a{' '}
              <span className="font-bold text-slate-700">{meta.to}</span> de{' '}
              <span className="font-bold text-slate-700">{meta.total}</span> productos
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-300 p-1.5 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-medium text-slate-600">
                Página <span className="text-green-700">{page}</span> de {meta.last_page}
              </span>
              <button
                disabled={page >= meta.last_page || loading}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-300 p-1.5 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {formOpen && (
        <ProductForm
          product={editing}
          currencies={currencies}
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          onSaved={onSaved}
        />
      )}

      {deleteTarget && (
        <Modal title="¿Eliminar producto?" onClose={() => setDeleteTarget(null)} width="max-w-sm">
          <p className="text-sm text-slate-600">
            ¿Eliminar <span className="font-semibold">{deleteTarget.name}</span>? Esta acción no se
            puede deshacer.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={confirmDelete}
              disabled={deleting}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deleting && <Loader2 size={14} className="animate-spin" />}
              Eliminar
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
