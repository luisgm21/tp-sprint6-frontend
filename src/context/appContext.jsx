import { createContext, useContext, useState, useEffect } from 'react'

const AppContext = createContext()

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const normalizeAuthUser = (user) => {
  if (!user) return null
  return {
    ...user,
    id: user.id || user._id,
  }
}

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
      return saved ? normalizeAuthUser(JSON.parse(saved)) : null
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
    const normalizedUser = normalizeAuthUser(data.user)
    localStorage.setItem('token', data.token)
    localStorage.setItem('authUser', JSON.stringify(normalizedUser))
    setToken(data.token)
    setAuthUser(normalizedUser)
  }

  const updateAuthUser = (userData) => {
    const normalizedUser = normalizeAuthUser(userData)
    if (!normalizedUser) return
    localStorage.setItem('authUser', JSON.stringify(normalizedUser))
    setAuthUser(normalizedUser)
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
    updateAuthUser,
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