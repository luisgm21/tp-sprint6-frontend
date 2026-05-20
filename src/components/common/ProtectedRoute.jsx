import { Navigate, Outlet } from 'react-router'
import { useAppContext } from '../../context/appContext'

const ProtectedRoute = ({ requiredRole }) => {
  const { isAuthenticated, authUser } = useAppContext()

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (requiredRole && authUser?.role !== requiredRole) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
