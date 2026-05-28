import { useState } from 'react'
import InputField from '../auth/components/InputField'
import LoadingSpinner from '../common/LoadingSpinner'
import { registerSchema, zodToFieldErrors } from '../../validators/authValidators'

const ROLES = [
  { value: 'teacher', label: 'Docente' },
  { value: 'admin', label: 'Administrador' },
]

const emptyForm = () => ({ name: '', email: '', password: '', confirmPassword: '', role: 'teacher' })

const CreateUserModal = ({ onClose, onCreate, isLoading, error }) => {
  const [formData, setFormData] = useState(emptyForm())
  const [fieldErrors, setFieldErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const result = registerSchema.safeParse(formData)
    if (!result.success) {
      setFieldErrors(zodToFieldErrors(result.error))
      return
    }
    onCreate(formData)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Crear usuario</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <InputField
            id="name"
            label="Nombre"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
            error={fieldErrors.name}
          />
          <InputField
            id="email"
            label="Email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            error={fieldErrors.email}
          />
          <InputField
            id="password"
            label="Contraseña"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            error={fieldErrors.password}
          />
          <InputField
            id="confirmPassword"
            label="Confirmar contraseña"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            error={fieldErrors.confirmPassword}
          />

          <div className="flex flex-col gap-1">
            <label htmlFor="role" className="text-sm font-medium text-zinc-700">
              Rol <span className="text-red-500">*</span>
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

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
              {isLoading ? <LoadingSpinner inline tone="light" size="sm" text="Creando..." /> : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateUserModal
