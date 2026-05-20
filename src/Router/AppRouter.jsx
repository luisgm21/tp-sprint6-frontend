import React from 'react'
import { Navigate, Route, Routes } from 'react-router'
import MainLayout from '../layouts/MainLayout'
import ProtectedRoute from '../components/common/ProtectedRoute'
import LoginPage from '../components/auth/pages/LoginPage'
import RegisterPage from '../components/auth/pages/RegisterPage'
import AdminUsersPage from '../pages/admin/AdminUsersPage'

import TeacherDashboard from '../pages/teacher/TeacherDashboard'

const AppRouter = () => {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to="/login" replace />} />
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

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Route>
    </Routes>
  )
}

export default AppRouter