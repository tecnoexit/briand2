import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { homePathFor } from './lib/roles'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import InvoicesList from './pages/InvoicesList'
import InvoiceForm from './pages/InvoiceForm'
import QuotesList from './pages/QuotesList'
import QuoteForm from './pages/QuoteForm'
import Currencies from './pages/Currencies'
import Users from './pages/Users'
import Clients from './pages/Clients'
import ClientCatalog from './pages/ClientCatalog'
import Products from './pages/Products'
import CuentaCorriente from './pages/CuentaCorriente'
import SellerAccount from './pages/SellerAccount'

function HomeRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={homePathFor(user)} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<HomeRedirect />} />

      <Route
        element={
          <ProtectedRoute roles={['admin', 'vendedor']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['admin']}>
              <Products />
            </ProtectedRoute>
          }
        />
        <Route path="/admin/facturacion" element={<InvoiceForm />} />
        <Route path="/admin/facturas" element={<InvoicesList />} />
        <Route path="/admin/presupuestos" element={<QuotesList />} />
        <Route path="/admin/presupuestos/nuevo" element={<QuoteForm />} />
        <Route path="/admin/presupuestos/:id/editar" element={<QuoteForm />} />
        <Route path="/admin/clientes" element={<Clients />} />
        <Route
          path="/admin/monedas"
          element={
            <ProtectedRoute roles={['admin']}>
              <Currencies />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/usuarios"
          element={
            <ProtectedRoute roles={['admin']}>
              <Users />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/cuenta-corriente"
          element={
            <ProtectedRoute roles={['admin']}>
              <CuentaCorriente />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/cuenta-corriente/:sellerId"
          element={
            <ProtectedRoute roles={['admin']}>
              <SellerAccount mode="admin" />
            </ProtectedRoute>
          }
        />

        <Route path="/vendedor" element={<Navigate to="/vendedor/facturacion" replace />} />
        <Route path="/vendedor/facturacion" element={<InvoiceForm />} />
        <Route path="/vendedor/facturas" element={<InvoicesList />} />
        <Route path="/vendedor/presupuestos" element={<QuotesList />} />
        <Route path="/vendedor/presupuestos/nuevo" element={<QuoteForm />} />
        <Route path="/vendedor/presupuestos/:id/editar" element={<QuoteForm />} />
        <Route path="/vendedor/clientes" element={<Clients />} />
        <Route path="/vendedor/cuenta-corriente" element={<SellerAccount mode="mine" />} />

        <Route path="/facturas/:id" element={<InvoicesList />} />
      </Route>

      <Route
        element={
          <ProtectedRoute roles={['deposito']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/deposito" element={<Navigate to="/deposito/presupuestos" replace />} />
        <Route path="/deposito/presupuestos" element={<QuotesList />} />
        <Route path="/deposito/presupuestos/nuevo" element={<QuoteForm />} />
        <Route path="/deposito/presupuestos/:id/editar" element={<QuoteForm />} />
      </Route>

      <Route
        path="/client"
        element={
          <ProtectedRoute roles={['cliente', 'distribuidor']}>
            <ClientCatalog />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}
