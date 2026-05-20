import React from 'react'
import { Navigate, Route, Routes } from 'react-router'
import MainLayout from '../layouts/MainLayout'
import ProtectedRoute from '../components/common/ProtectedRoute'
import LoginPage from '../components/auth/pages/LoginPage'
import RegisterPage from '../components/auth/pages/RegisterPage'
import AdminUsersPage from '../pages/admin/AdminUsersPage'
import NotFoundPage from '../pages/NotFoundPage'
import { useAppContext } from '../context/appContext'

import TeacherDashboard from '../pages/teacher/TeacherDashboard'

const AppRouter = () => {
  const { isAuthenticated, authUser } = useAppContext()

  const getHomePath = () => {
    if (!isAuthenticated) return '/login'
    if (authUser?.role === 'admin') return '/admin/users'
    if (authUser?.role === 'teacher') return '/teacher/dashboard'
    return '/login'
  }

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to={getHomePath()} replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Rutas protegidas solo para admin */}
        <Route element={<ProtectedRoute requiredRole="admin" />}>
          <Route path="/admin/users" element={<AdminUsersPage />} />
        </Route>

        {/* Rutas protegidas solo para docentes */}
        <Route element={<ProtectedRoute requiredRole="teacher" />}>
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
        </Route>

        <Route path="*" element={isAuthenticated ? <NotFoundPage /> : <Navigate to="/login" replace />} />
      </Route>
    </Routes>
  )
}

export default AppRouter