import React from 'react'
import { Route, Routes } from 'react-router'
import MainLayout from '../layouts/MainLayout'
import LoginPage from '../components/auth/pages/LoginPage'
import RegisterPage from '../components/auth/pages/RegisterPage'

const AppRouter = () => {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
    </Routes>
  )
}

export default AppRouter