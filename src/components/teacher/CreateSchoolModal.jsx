import { useState } from 'react'
import { createSchoolSchema, zodToFieldErrors } from '../../validators/schoolValidators'
import LoadingSpinner from '../common/LoadingSpinner'
import { useAppContext } from '../../context/appContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const CreateSchoolModal = ({ open, onClose, onCreated }) => {
  const { token, logout } = useAppContext()
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const result = createSchoolSchema.safeParse(formData)
    if (!result.success) {
      setFieldErrors(zodToFieldErrors(result.error))
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/schools/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401 || res.status === 403) {
        logout()
        return
      }
      if (!res.ok) throw new Error(data.error || 'Error al crear escuela')
      setFormData({ name: '', description: '' })
      setFieldErrors({})
      onCreated?.(data)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Crear escuela</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="name" className="text-sm font-medium text-zinc-700">Nombre <span className="text-red-500">*</span></label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className={`mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 ${fieldErrors.name ? 'border-red-400 bg-red-50' : 'border-zinc-300 bg-white'}`}
              required
            />
            {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
          </div>
          <div>
            <label htmlFor="description" className="text-sm font-medium text-zinc-700">Descripción</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              rows={3}
            />
          </div>
          {error && <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? <LoadingSpinner inline tone="light" size="sm" text="Creando..." /> : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateSchoolModal
