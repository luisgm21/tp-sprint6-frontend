import { createContext, useContext, useState, useEffect } from 'react'

const AppContext = createContext()

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

  const values = {
    isDarkMode, 
    toggleDarkMode
  }

  return (
    <AppContext.Provider value={values}>
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => useContext(AppContext)