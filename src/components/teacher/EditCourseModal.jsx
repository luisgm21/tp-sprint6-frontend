import { useState, useEffect } from 'react'
import { createCourseSchema, zodToFieldErrors } from '../../validators/courseValidators'
import LoadingSpinner from '../common/LoadingSpinner'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const MONTH_OPTIONS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
]

const EditCourseModal = ({ open, onClose, onEdited, course, schools }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    schoolId: '',
    startMonth: '1',
    endMonth: '12',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (course) {
      setFormData({
        name: course.name || '',
        description: course.description || '',
        schoolId: course.schoolId || '',
        startMonth: String(Number(course.startMonth) || 1),
        endMonth: String(Number(course.endMonth) || 12),
      })
    }
  }, [course, open])

  if (!open) return null

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const result = createCourseSchema.safeParse(formData)
    if (!result.success) {
      setFieldErrors(zodToFieldErrors(result.error))
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/courses/update/${course._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          startMonth: Number(formData.startMonth),
          endMonth: Number(formData.endMonth),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Error al editar curso')
      setFieldErrors({})
      onEdited?.(data)
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
          <h2 className="text-lg font-semibold text-zinc-900">Editar curso</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="schoolId" className="text-sm font-medium text-zinc-700">Escuela <span className="text-red-500">*</span></label>
            <select
              id="schoolId"
              name="schoolId"
              value={formData.schoolId}
              onChange={handleChange}
              className={`mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 ${fieldErrors.schoolId ? 'border-red-400 bg-red-50' : 'border-zinc-300 bg-white'}`}
              required
            >
              <option value="">Seleccioná una escuela</option>
              {schools?.map((school) => (
                <option key={school._id || school.name} value={school._id || school.name}>{school.name}</option>
              ))}
            </select>
            {fieldErrors.schoolId && <p className="text-xs text-red-500 mt-1">{fieldErrors.schoolId}</p>}
          </div>
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="startMonth" className="text-sm font-medium text-zinc-700">Inicio de clases</label>
              <select
                id="startMonth"
                name="startMonth"
                value={formData.startMonth}
                onChange={handleChange}
                className={`mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 ${fieldErrors.startMonth ? 'border-red-400 bg-red-50' : 'border-zinc-300 bg-white'}`}
              >
                {MONTH_OPTIONS.map((month) => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
              {fieldErrors.startMonth && <p className="text-xs text-red-500 mt-1">{fieldErrors.startMonth}</p>}
            </div>
            <div>
              <label htmlFor="endMonth" className="text-sm font-medium text-zinc-700">Fin de clases</label>
              <select
                id="endMonth"
                name="endMonth"
                value={formData.endMonth}
                onChange={handleChange}
                className={`mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 ${fieldErrors.endMonth ? 'border-red-400 bg-red-50' : 'border-zinc-300 bg-white'}`}
              >
                {MONTH_OPTIONS.map((month) => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
              {fieldErrors.endMonth && <p className="text-xs text-red-500 mt-1">{fieldErrors.endMonth}</p>}
            </div>
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
              {isLoading ? <LoadingSpinner inline tone="light" size="sm" text="Guardando..." /> : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditCourseModal
