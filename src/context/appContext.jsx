import { createContext, useContext, useState, useEffect } from 'react'

const AppContext = createContext()

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const AppProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme === 'dark') return true
      if (savedTheme === 'light') return false
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    } catch (error) {
      console.error('Error al leer tema de localStorage:', error)
      return false
    }
  })

  const [authUser, setAuthUser] = useState(() => {
    try {
      const saved = localStorage.getItem('authUser')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [token, setToken] = useState(() => localStorage.getItem('token') || null)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', isDarkMode)
    try {
      localStorage.setItem('theme', isDarkMode ? 'dark' : 'light')
    } catch (error) {
      console.error('Error al guardar tema en localStorage:', error)
    }
  }, [isDarkMode])

  const toggleDarkMode = () => setIsDarkMode((current) => !current)

  const login = async (email, password) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Credenciales inválidas')
    localStorage.setItem('token', data.token)
    localStorage.setItem('authUser', JSON.stringify(data.user))
    setToken(data.token)
    setAuthUser(data.user)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('authUser')
    setToken(null)
    setAuthUser(null)
  }

  const values = {
    isDarkMode,
    toggleDarkMode,
    authUser,
    token,
    isAuthenticated: !!token,
    login,
    logout,
  }

  return (
    <AppContext.Provider value={values}>
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => useContext(AppContext)