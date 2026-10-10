import { useState } from 'react'
import { Printer, X } from 'lucide-react'
import { formatMoney } from '../lib/format'
import { paymentLabel } from '../lib/roles'

const DARK = '#2c3e50'
const BRAND = { name: 'Ferretería De2', email: 'ferreteriad2@gmail.com' }

function HeaderCell({ children, width, align = 'left' }) {
  return (
    <td
      style={{
        width,
        textAlign: align,
        backgroundColor: DARK,
        padding: '4px 8px',
        color: '#fff',
        fontWeight: 'bold',
        fontSize: '12px',
      }}
    >
      {children}
    </td>
  )
}

export default function PrintableDoc({ doc, docType = 'factura', sellerName = '', onClose }) {
  const [printNotes, setPrintNotes] = useState(false)

  const isListado = docType === 'listado'
  const isPresupuesto = docType === 'presupuesto'
  const title = isListado ? 'LISTADO DE DEPÓSITO' : isPresupuesto ? 'PRESUPUESTO' : 'FACTURA'
  const docLabel = isListado ? 'Listado de Depósito' : isPresupuesto ? 'Presupuesto' : 'Factura'
  const clientLabel = isListado ? 'PEDIDO PARA' : isPresupuesto ? 'CLIENTE' : 'FACTURAR A'
  const date = doc.created_at ? new Date(doc.created_at).toLocaleDateString('es-AR') : ''
  const items = doc.items || []
  const count = items.length

  const footer =
    isListado
      ? 'Listado interno de depósito — control de mercadería (sin valores).'
      : isPresupuesto
        ? 'Presupuesto — precios sujetos a modificación sin previo aviso.'
        : 'Gracias por su compra!'

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-200">
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 border-b bg-white px-6 py-3 shadow-sm">
        <span className="text-sm text-slate-500">
          Vista previa de impresión — {docLabel} #{doc.id}
        </span>
        <div className="flex items-center gap-4">
          {!isListado && (
            <label className="flex cursor-pointer select-none items-center gap-1.5 text-sm text-slate-600">
              <input
                type="checkbox"
                className="h-4 w-4 accent-green-600"
                checked={printNotes}
                onChange={(e) => setPrintNotes(e.target.checked)}
              />
              Imprimir comentarios
            </label>
          )}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            <X size={16} /> Cerrar
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
          >
            <Printer size={16} /> Imprimir
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto py-6">
        <div
          id="print-area"
          className="mx-auto w-[210mm] min-h-[297mm] bg-white p-8 shadow-lg"
          style={{ fontFamily: 'Arial, sans-serif', fontSize: '12pt', color: '#333' }}
        >
          {/* Encabezado */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
            <tbody>
              <tr>
                <td style={{ width: '25%', verticalAlign: 'top' }}>
                  <img
                    src="/assets/ferreteria-D-CqQMci.png"
                    alt=""
                    style={{ width: '70px', height: '70px', objectFit: 'contain' }}
                  />
                </td>
                <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', fontSize: '12px', color: '#34495e' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#34495e', marginBottom: '4px' }}>
                    {BRAND.name}
                  </div>
                  Email: {BRAND.email}
                </td>
                <td style={{ width: '25%', textAlign: 'right', verticalAlign: 'top', fontSize: '14px', fontWeight: 'bold' }}>
                  {title} Nº {doc.id}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Cliente / vendedor / fecha / pago */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
            <tbody>
              <tr>
                <HeaderCell width="100%">{clientLabel}</HeaderCell>
              </tr>
              <tr>
                <td style={{ padding: '8px', fontSize: '11pt', lineHeight: '1.6' }}>
                  {doc.client_name}
                  {doc.client_phone && (
                    <>
                      <br />Teléfono: {doc.client_phone}
                    </>
                  )}
                  {doc.client_email && (
                    <>
                      <br />Email: {doc.client_email}
                    </>
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
            <tbody>
              <tr>
                <HeaderCell width="35%">VENDEDOR</HeaderCell>
                <HeaderCell width="25%">FECHA</HeaderCell>
                <HeaderCell width="40%">FORMA DE PAGO</HeaderCell>
              </tr>
              <tr>
                <td style={{ padding: '8px', fontSize: '11pt' }}>{sellerName || '—'}</td>
                <td style={{ padding: '8px', fontSize: '11pt' }}>{date}</td>
                <td style={{ padding: '8px', fontSize: '11pt' }}>
                  {paymentLabel(doc.payment_method)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Observación general (listado) */}
          {isListado && doc.notes && (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
              <tbody>
                <tr>
                  <HeaderCell width="100%">OBSERVACIÓN GENERAL</HeaderCell>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontSize: '11pt', whiteSpace: 'pre-wrap', border: '1px solid #bbb' }}>
                    {doc.notes}
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          {/* Ítems: listado (sin precios) o con precios */}
          {isListado ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11pt' }}>
              <thead>
                <tr>
                  <HeaderCell width="10%" align="center">OK</HeaderCell>
                  <HeaderCell width="15%" align="center">CANT.</HeaderCell>
                  <HeaderCell width="75%">DESCRIPCIÓN</HeaderCell>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const bg = idx % 2 === 0 ? '#fff' : '#ecf0f1'
                  return (
                    <tr key={it.id ?? idx}>
                      <td style={{ textAlign: 'center', padding: '6px 8px', backgroundColor: bg }}>
                        <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '1.5px solid #333' }} />
                      </td>
                      <td style={{ textAlign: 'center', padding: '6px 8px', backgroundColor: bg, fontWeight: 'bold' }}>
                        {it.quantity}
                      </td>
                      <td style={{ textAlign: 'left', padding: '6px 8px', backgroundColor: bg }}>
                        {it.product_name}
                        {it.notes && (
                          <div style={{ fontSize: '9pt', color: '#666', fontStyle: 'italic', marginTop: '2px' }}>
                            {it.notes}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
                <tr>
                  <td colSpan={3} style={{ textAlign: 'right', padding: '8px', fontWeight: 'bold' }}>
                    TOTAL DE ARTÍCULOS: {count}
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
              <thead>
                <tr>
                  <HeaderCell width="10%" align="center">CANT.</HeaderCell>
                  <HeaderCell width="60%">DESCRIPCION</HeaderCell>
                  <HeaderCell width="15%" align="right">PRECIO UNIT.</HeaderCell>
                  <HeaderCell width="15%" align="right">PRECIO TOTAL</HeaderCell>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const bg = idx % 2 === 0 ? '#fff' : '#ecf0f1'
                  const lineTotal = Number(it.quantity) * Number(it.unit_price)
                  return (
                    <tr key={it.id ?? idx}>
                      <td style={{ textAlign: 'center', padding: '4px 8px', backgroundColor: bg }}>{it.quantity}</td>
                      <td style={{ textAlign: 'left', padding: '4px 8px', backgroundColor: bg }}>
                        {it.product_name}
                        {printNotes && it.notes && (
                          <div style={{ fontSize: '8pt', color: '#666', fontStyle: 'italic', marginTop: '2px' }}>
                            {it.notes}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', padding: '4px 8px', backgroundColor: bg }}>
                        {formatMoney(it.unit_price)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '4px 8px', backgroundColor: bg }}>
                        {formatMoney(lineTotal)}
                      </td>
                    </tr>
                  )
                })}
                <tr>
                  <td colSpan={3} style={{ textAlign: 'right', padding: '6px 8px' }}>CANTIDAD DE ITEMS</td>
                  <td style={{ textAlign: 'right', padding: '6px 8px' }}>{count}</td>
                </tr>
                <tr>
                  <td colSpan={3} style={{ textAlign: 'right', padding: '6px 8px' }}>SUBTOTAL $</td>
                  <td style={{ textAlign: 'right', padding: '6px 8px' }}>{formatMoney(doc.subtotal)}</td>
                </tr>
                {Number(doc.tax_rate) > 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'right', padding: '6px 8px' }}>
                      IVA ({doc.tax_rate})% $
                    </td>
                    <td style={{ textAlign: 'right', padding: '6px 8px' }}>{formatMoney(doc.tax_amount)}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={3} style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 'bold', fontSize: '12pt' }}>
                    TOTAL $
                  </td>
                  <td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 'bold', fontSize: '12pt' }}>
                    {formatMoney(doc.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          {/* Observaciones (no listado) */}
          {!isListado && doc.notes && (
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
              <tbody>
                <tr>
                  <HeaderCell width="100%">OBSERVACIONES</HeaderCell>
                </tr>
                <tr>
                  <td style={{ padding: '8px', fontSize: '10pt', whiteSpace: 'pre-wrap' }}>{doc.notes}</td>
                </tr>
              </tbody>
            </table>
          )}

          <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '11pt', fontWeight: 'bold' }}>
            {footer}
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: '15mm',
              left: '15mm',
              right: '15mm',
              fontSize: '9pt',
              color: '#999',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>
              {docLabel} #{doc.id}
            </span>
            <span>
              © {BRAND.name} {new Date().getFullYear()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
