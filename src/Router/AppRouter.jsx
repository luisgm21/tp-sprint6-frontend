import React from 'react'
import { Route, Routes } from 'react-router'
import MainLayout from '../layouts/MainLayout'
import ProtectedRoute from '../components/common/ProtectedRoute'
import LoginPage from '../components/auth/pages/LoginPage'
import RegisterPage from '../components/auth/pages/RegisterPage'
import AdminUsersPage from '../pages/admin/AdminUsersPage'

const AppRouter = () => {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Rutas protegidas solo para admin */}
        <Route element={<ProtectedRoute requiredRole="admin" />}>
          <Route path="/admin/users" element={<AdminUsersPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default AppRouter