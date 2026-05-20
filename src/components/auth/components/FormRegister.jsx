import { useState } from 'react'
import InputField from './InputField'
import LoadingSpinner from '../../common/LoadingSpinner'
import { registerSchema, zodToFieldErrors } from '../../../validators/authValidators'

const ROLES = [
  { value: 'teacher', label: 'Docente' },
  { value: 'admin', label: 'Administrador' },
]

const FormRegister = ({ onSubmit, isLoading, error }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
  })
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

    const { confirmPassword, ...submitData } = formData
    onSubmit(submitData)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <InputField
        id="name"
        label="Nombre completo"
        type="text"
        value={formData.name}
        onChange={handleChange}
        placeholder="Juan Pérez"
        required
        error={fieldErrors.name}
      />
      <InputField
        id="email"
        label="Correo electrónico"
        type="email"
        value={formData.email}
        onChange={handleChange}
        placeholder="ejemplo@correo.com"
        required
        error={fieldErrors.email}
      />
      <InputField
        id="password"
        label="Contraseña"
        type="password"
        value={formData.password}
        onChange={handleChange}
        placeholder="Mínimo 6 caracteres"
        required
        error={fieldErrors.password}
      />
      <InputField
        id="confirmPassword"
        label="Confirmar contraseña"
        type="password"
        value={formData.confirmPassword}
        onChange={handleChange}
        placeholder="••••••••"
        required
        error={fieldErrors.confirmPassword}
      />

      <div className="flex flex-col gap-1">
        <label htmlFor="role" className="text-sm font-medium text-zinc-700">
          Rol <span className="ml-1 text-red-500">*</span>
        </label>
        <select
          id="role"
          name="role"
          value={formData.role}
          onChange={handleChange}
          className={[
            'rounded-md border px-3 py-2 text-sm text-zinc-900 outline-none transition-colors',
            'focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200',
            fieldErrors.role ? 'border-red-400 bg-red-50' : 'border-zinc-300 bg-white',
          ].join(' ')}
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        {fieldErrors.role && <p className="text-xs text-red-500">{fieldErrors.role}</p>}
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 border border-red-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="mt-2 rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? <LoadingSpinner inline tone="light" size="sm" text="Registrando..." /> : 'Crear cuenta'}
      </button>
    </form>
  )
}

export default FormRegister
