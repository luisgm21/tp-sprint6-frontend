import { useState } from 'react'
import InputField from './InputField'

const FormLogin = ({ onSubmit, isLoading, error }) => {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const errors = {}
    if (!formData.email) errors.email = 'El email es obligatorio'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Email inválido'
    if (!formData.password) errors.password = 'La contraseña es obligatoria'
    return errors
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
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
        {isLoading ? 'Ingresando...' : 'Iniciar sesión'}
      </button>
    </form>
  )
}

export default FormLogin
