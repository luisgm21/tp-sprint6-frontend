import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import FormLogin from '../components/FormLogin'
import { useAppContext } from '../../../context/appContext'

const LoginPage = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAppContext()
  const navigate = useNavigate()

  const handleSubmit = async (formData) => {
    setIsLoading(true)
    setError('')
    try {
      await login(formData.email, formData.password)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-zinc-500">Ingresá tu cuenta para continuar</p>
        </div>

        <FormLogin onSubmit={handleSubmit} isLoading={isLoading} error={error} />

        <p className="mt-6 text-center text-sm text-zinc-500">
          ¿No tenés cuenta?{' '}
          <Link to="/register" className="font-medium text-zinc-800 underline underline-offset-4 hover:text-zinc-600">
            Registrate
          </Link>
        </p>
      </div>
    </main>
  )
}

export default LoginPage
