const STYLES = {
  regular: 'bg-orange-500 text-white',
  distribuidor: 'bg-blue-600 text-white',
}

export default function ClientTypeBadge({ type }) {
  const t = type === 'distribuidor' ? 'distribuidor' : 'regular'
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STYLES[t]}`}
    >
      {t === 'distribuidor' ? 'Distribuidor' : 'Regular'}
    </span>
  )
}
