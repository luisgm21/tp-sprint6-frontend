import { useState } from 'react'
import InputField from './InputField'
import LoadingSpinner from '../../common/LoadingSpinner'
import { loginSchema, zodToFieldErrors } from '../../../validators/authValidators'

const FormLogin = ({ onSubmit, isLoading, error }) => {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const result = loginSchema.safeParse(formData)

    if (!result.success) {
      setFieldErrors(zodToFieldErrors(result.error))
      return
    }

    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
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
        placeholder="••••••••"
        required
        error={fieldErrors.password}
      />

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
        {isLoading ? <LoadingSpinner inline tone="light" size="sm" text="Ingresando..." /> : 'Iniciar sesión'}
      </button>
    </form>
  )
}

export default FormLogin
