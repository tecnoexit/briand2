import { useCallback, useEffect, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  FileSpreadsheet,
  FileText,
  ImageOff,
  Loader2,
  LogOut,
  Search,
} from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { catalogPrice, currencySymbol, formatMoney } from '../lib/format'

const brandLogo = '/assets/ferreteria-D-CqQMci.png'

const THEME = {
  distribuidor: {
    page: 'bg-slate-950 text-slate-100',
    header: 'bg-slate-900 border-slate-800',
    card: 'bg-slate-900 border-slate-800',
    sub: 'text-slate-400',
    thead: 'bg-slate-800/60 text-slate-400',
    rowHover: 'hover:bg-slate-800/50',
    divide: 'divide-slate-800',
    input:
      'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-primary',
    imgBox: 'bg-slate-800 border-slate-700',
    badge: 'bg-primary text-primary-foreground',
    btn: 'border-slate-700 text-slate-200 hover:bg-slate-800',
    pageBtn: 'border-slate-700 hover:bg-slate-800 disabled:opacity-40',
  },
  cliente: {
    page: 'bg-slate-100 text-slate-900',
    header: 'bg-white border-slate-200',
    card: 'bg-white border-slate-200',
    sub: 'text-slate-500',
    thead: 'bg-slate-50 text-slate-500',
    rowHover: 'hover:bg-slate-50',
    divide: 'divide-slate-100',
    input:
      'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-primary',
    imgBox: 'bg-white border-slate-200',
    badge: 'bg-primary text-primary-foreground',
    btn: 'border-slate-200 text-slate-700 hover:bg-slate-50',
    pageBtn: 'border-slate-200 hover:bg-slate-50 disabled:opacity-40',
  },
}

export default function ClientCatalog() {
  const { user, logout } = useAuth()
  const isDistribuidor = user?.role === 'distribuidor'
  const t = isDistribuidor ? THEME.distribuidor : THEME.cliente

  const [currencies, setCurrencies] = useState([])
  const [products, setProducts] = useState([])
  const [meta, setMeta] = useState({ page: 1, lastPage: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('name')
  const [direction, setDirection] = useState('asc')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    api
      .get('/currencies')
      .then(({ data }) => setCurrencies(data || []))
      .catch(() => setCurrencies([]))
  }, [])

  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 500)
    return () => clearTimeout(id)
  }, [searchInput])

  useEffect(() => {
    let active = true
    setLoading(true)
    api
      .get('/products', { params: { page, search, sort, direction } })
      .then(({ data }) => {
        if (!active) return
        setProducts(data.data || [])
        setMeta({
          page: data.current_page || 1,
          lastPage: data.last_page || 1,
          total: data.total || 0,
        })
      })
      .catch(() => {
        if (active) setProducts([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [page, search, sort, direction])

  const priceOf = useCallback(
    (product) => catalogPrice(product, isDistribuidor, currencies),
    [isDistribuidor, currencies],
  )

  const displayPrice = useCallback(
    (product) => formatMoney(priceOf(product), currencySymbol(currencies, product.currency_id)),
    [priceOf, currencies],
  )

  const toggleSort = (column) => {
    if (sort === column) {
      setDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSort(column)
      setDirection('asc')
    }
    setPage(1)
  }

  const SortIcon = ({ column }) => {
    if (sort !== column) return <ChevronsUpDown className="ml-1 h-3.5 w-3.5 opacity-40" />
    return direction === 'asc' ? (
      <ChevronUp className="ml-1 h-3.5 w-3.5 text-primary" />
    ) : (
      <ChevronDown className="ml-1 h-3.5 w-3.5 text-primary" />
    )
  }

  const fetchAll = async () => {
    const { data } = await api.get('/products', {
      params: { search, sort, direction, all: 1 },
    })
    return data.data || []
  }

  const exportCsv = async () => {
    if (exporting) return
    setExporting('csv')
    try {
      const rows = await fetchAll()
      const header = ['Producto', 'Descripción', 'Precio Local']
      if (isDistribuidor) header.push('Imagen URL')
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
      const lines = [header.map(esc).join(',')]
      rows.forEach((p) => {
        const row = [p.name, p.description || '', displayPrice(p)]
        if (isDistribuidor) row.push(p.image_url ? `${window.location.origin}/backapi${p.image_url}` : '')
        lines.push(row.map(esc).join(','))
      })
      const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
        type: 'text/csv;charset=utf-8;',
      })
      const stamp = new Date().toLocaleDateString('es-AR').replace(/\//g, '-')
      const name = `lista_precios${isDistribuidor ? '_distribuidor' : ''}_${stamp}.csv`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(null)
    }
  }

  const fetchImage = async (product) => {
    if (!product.image_url) return null
    try {
      const { data } = await api.get(`/products/${product.id}/image-base64`)
      if (!data?.data_url) return null
      return { dataUrl: data.data_url, format: (data.mime || '').includes('png') ? 'PNG' : 'JPEG' }
    } catch {
      return null
    }
  }

  const exportPdf = async () => {
    if (exporting) return
    setExporting('pdf')
    setProgress(0)
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ])
      const rows = await fetchAll()
      const images = new Array(rows.length).fill(null)
      const withImage = rows.filter((p) => p.image_url)
      let done = 0
      const concurrency = 6
      let cursor = 0
      const worker = async () => {
        while (cursor < withImage.length) {
          const current = withImage[cursor++]
          const idx = rows.indexOf(current)
          images[idx] = await fetchImage(current)
          done += 1
          setProgress(withImage.length ? Math.round((done / withImage.length) * 100) : 100)
        }
      }
      await Promise.all(Array.from({ length: Math.min(concurrency, withImage.length) || 1 }, worker))
      setProgress(100)

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const title = isDistribuidor
        ? 'Lista de Precios - Distribuidor'
        : 'Lista de Precios - Ferretería'
      doc.setFontSize(16)
      doc.text(title, 14, 18)
      doc.setFontSize(10)
      doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-AR')}`, 14, 25)

      autoTable(doc, {
        startY: 30,
        head: [['Imagen', 'Producto', 'Descripción', 'Precio']],
        body: rows.map((p) => ['', p.name, p.description || '-', displayPrice(p)]),
        styles: { fontSize: 8, cellPadding: 2, valign: 'middle', overflow: 'linebreak' },
        headStyles: { fillColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { cellWidth: 16, minCellHeight: 16, halign: 'center' },
          3: { halign: 'right', cellWidth: 28 },
        },
        didDrawCell: (data) => {
          if (data.section !== 'body' || data.column.index !== 0) return
          const img = images[data.row.index]
          if (!img) return
          const size = 12
          const x = data.cell.x + (data.cell.width - size) / 2
          const y = data.cell.y + (data.cell.height - size) / 2
          try {
            doc.addImage(img.dataUrl, img.format, x, y, size, size)
          } catch {
            /* imagen inválida: se omite */
          }
        },
      })

      const stamp = new Date().toLocaleDateString('es-AR').replace(/\//g, '-')
      doc.save(`lista_precios_${isDistribuidor ? 'distribuidor_' : ''}${stamp}.pdf`)
    } finally {
      setExporting(null)
      setProgress(0)
    }
  }

  const canPrev = page > 1
  const canNext = page < meta.lastPage

  const empty = !loading && products.length === 0

  return (
    <div className={`min-h-screen ${t.page}`}>
      {exporting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`w-[320px] rounded-2xl border p-6 text-center shadow-xl ${t.card}`}>
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
            <p className="font-semibold">
              {exporting === 'pdf' ? 'Generando PDF…' : 'Generando Excel…'}
            </p>
            {exporting === 'pdf' ? (
              <>
                <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-black/10">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-sm font-medium opacity-70">{progress}%</p>
                <p className="mt-1 text-xs opacity-60">Cargando imágenes de los productos…</p>
              </>
            ) : (
              <p className="mt-2 text-sm opacity-60">Preparando el archivo…</p>
            )}
          </div>
        </div>
      )}

      <header className={`border-b shadow-sm ${t.header}`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img src={brandLogo} alt="Ferretería De2" className="h-8 w-8 object-contain" />
            <div>
              <h1 className="text-lg font-bold leading-none">Ferretería De2</h1>
              <p className={`text-[10px] uppercase tracking-wider ${t.sub}`}>
                {isDistribuidor ? 'Catálogo Distribuidor' : 'Catálogo de Precios'}
              </p>
            </div>
            {isDistribuidor && (
              <span
                className={`hidden rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider sm:inline-flex ${t.badge}`}
              >
                Modo Distribuidor
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium">{user?.name}</p>
              <p className={`text-[10px] capitalize ${t.sub}`}>
                {isDistribuidor ? 'Distribuidor' : 'Cliente'}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Cerrar sesión"
              className={`rounded-lg p-2 transition-colors ${t.btn}`}
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="relative w-full md:w-96">
            <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${t.sub}`} />
            <input
              type="text"
              placeholder="Buscar producto por nombre o código..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={`h-11 w-full rounded-lg border pl-10 pr-3 text-sm outline-none transition-colors ${t.input}`}
            />
          </div>
          <div className="flex w-full gap-2 md:w-auto">
            <button
              type="button"
              onClick={exportCsv}
              disabled={!!exporting}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 md:flex-none ${t.btn}`}
            >
              {exporting === 'csv' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
              )}
              Excel
            </button>
            <button
              type="button"
              onClick={exportPdf}
              disabled={!!exporting}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 md:flex-none ${t.btn}`}
            >
              {exporting === 'pdf' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 text-red-600" />
              )}
              PDF
            </button>
          </div>
        </div>

        <div className={`overflow-hidden rounded-xl border shadow-sm ${t.card}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b ${t.thead} ${t.divide}`}>
                  <th className="w-24 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider">
                    Imagen
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider"
                    onClick={() => toggleSort('name')}
                  >
                    <div className="flex items-center">
                      Producto
                      <SortIcon column="name" />
                    </div>
                  </th>
                  <th className="hidden px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider lg:table-cell">
                    Descripción
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider"
                    onClick={() => toggleSort('price')}
                  >
                    <div className="flex items-center justify-end">
                      Precio Local
                      <SortIcon column="price" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${t.divide}`}>
                {products.map((product) => (
                  <tr key={product.id} className={`transition-colors ${t.rowHover}`}>
                    <td className="p-4">
                      <div
                        className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border ${t.imgBox}`}
                      >
                        {product.image_url ? (
                          <img
                            src={`/backapi${product.image_url}`}
                            alt={product.name}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageOff className={`h-6 w-6 ${t.sub}`} />
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold">{product.name}</div>
                      <div className={`text-xs lg:hidden ${t.sub}`}>
                        {product.description || '-'}
                      </div>
                    </td>
                    <td className={`hidden max-w-xs p-4 text-xs lg:table-cell ${t.sub}`}>
                      <p className="line-clamp-2">{product.description || '-'}</p>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-mono text-base font-bold text-primary">
                        {displayPrice(product)}
                      </div>
                      <div className={`text-[9px] uppercase ${t.sub}`}>IVA incluido</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {empty && (
            <div className="py-20 text-center">
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full ${t.imgBox}`}>
                <Search className={`h-6 w-6 ${t.sub}`} />
              </div>
              <p className={`font-medium ${t.sub}`}>No encontramos productos que coincidan</p>
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="mt-2 text-sm font-medium text-primary hover:underline"
              >
                Limpiar búsqueda
              </button>
            </div>
          )}

          {loading && products.length === 0 && !empty && (
            <div className="animate-pulse py-20 text-center">
              <p className={`text-sm font-medium ${t.sub}`}>Actualizando lista de precios...</p>
            </div>
          )}
        </div>

        {!loading && products.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className={t.sub}>
              {meta.total.toLocaleString('es-AR')} productos · página {meta.page} de{' '}
              {meta.lastPage}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!canPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={`rounded-lg border px-3 py-1.5 font-medium transition-colors ${t.pageBtn}`}
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={!canNext}
                onClick={() => setPage((p) => p + 1)}
                className={`rounded-lg border px-3 py-1.5 font-medium transition-colors ${t.pageBtn}`}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
