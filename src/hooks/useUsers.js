import { useState, useEffect, useCallback } from 'react'
import { useAppContext } from '../context/appContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const useUsers = () => {
  const { token, logout } = useAppContext()
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/users`, { headers: authHeaders })
      if (res.status === 401 || res.status === 403) { logout(); return }
      if (!res.ok) throw new Error('Error al obtener usuarios')
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const updateUser = async (id, body) => {
    const res = await fetch(`${API_URL}/api/users/update/${id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al actualizar')
    await fetchUsers()
  }

  const deactivateUser = async (id) => {
    const res = await fetch(`${API_URL}/api/users/deactivate/${id}`, {
      method: 'PATCH',
      headers: authHeaders,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al desactivar')
    await fetchUsers()
  }

  const deleteUser = async (id) => {
    const res = await fetch(`${API_URL}/api/users/delete/${id}`, {
      method: 'DELETE',
      headers: authHeaders,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al eliminar')
    await fetchUsers()
  }

  return { users, isLoading, error, updateUser, deactivateUser, deleteUser, refetch: fetchUsers }
}
