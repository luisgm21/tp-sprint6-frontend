import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import FormRegister from '../components/FormRegister'
import { API_URL } from '../../../config/env'
import { safeJson } from '../../../util/safeJson'

const RegisterPage = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (formData) => {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
        const data = await safeJson(response, {})
      if (!response.ok) throw new Error(data.error || 'Error al registrarse')
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.message || 'Error al registrarse')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900">Crear cuenta</h1>
          <p className="mt-1 text-sm text-zinc-500">Completá el formulario para registrarte</p>
        </div>

        {success ? (
          <div className="rounded-md bg-green-50 border border-green-200 px-4 py-6 text-center">
            <p className="text-sm font-medium text-green-700">¡Cuenta creada correctamente!</p>
            <p className="mt-1 text-xs text-green-600">Redirigiendo al login...</p>
          </div>
        ) : (
          <FormRegister onSubmit={handleSubmit} isLoading={isLoading} error={error} />
        )}

        <p className="mt-6 text-center text-sm text-zinc-500">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="font-medium text-zinc-800 underline underline-offset-4 hover:text-zinc-600">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </main>
  )
}

export default RegisterPage
