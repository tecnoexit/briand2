import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Boxes,
  Coins,
  Contact,
  FileText,
  LogOut,
  PackagePlus,
  Receipt,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { isAdmin } from '../lib/roles'

function navItems(user) {
  if (user?.role === 'deposito') {
    return [{ to: '/deposito/presupuestos', label: 'Presupuestos', icon: FileText }]
  }

  const base = isAdmin(user) ? '/admin' : '/vendedor'
  const items = []
  if (isAdmin(user)) {
    items.push({ to: '/admin', label: 'Productos', icon: Boxes, end: true })
  }
  items.push(
    { to: `${base}/facturacion`, label: 'Facturación', icon: PackagePlus },
    { to: `${base}/facturas`, label: 'Facturas', icon: Receipt },
    { to: `${base}/presupuestos`, label: 'Presupuestos', icon: FileText },
    { to: `${base}/clientes`, label: 'Clientes', icon: Contact },
    { to: `${base}/cuenta-corriente`, label: 'Cuenta Corriente', icon: Wallet },
  )
  if (isAdmin(user)) {
    items.push({ to: '/admin/asignacion-clientes', label: 'Asignación de clientes', icon: UserCheck })
    items.push({ to: '/admin/monedas', label: 'Monedas', icon: Coins })
    items.push({ to: '/admin/usuarios', label: 'Usuarios', icon: Users })
  } else {
    items.push({ to: `${base}/mis-clientes`, label: 'Mis clientes', icon: UserCheck })
  }
  return items
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col bg-slate-900 text-slate-200">
        <div className="flex items-center gap-2 px-5 py-5 text-lg font-semibold text-white">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
          Ferretería De2
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {navItems(user).map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? 'bg-green-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-3">
          <div className="mb-2 px-2">
            <p className="truncate text-sm font-medium text-white">{user?.name}</p>
            <p className="truncate text-xs capitalize text-slate-400">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden bg-slate-100">
        <Outlet />
      </main>
    </div>
  )
}
