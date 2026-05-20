import { Link } from 'react-router'

const NotFoundPage = () => {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <section className="w-full max-w-xl rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold tracking-wide text-zinc-500">Error 404</p>
        <h1 className="mt-2 text-3xl font-bold text-zinc-900">Página no encontrada</h1>
        <p className="mt-3 text-sm text-zinc-600">
          La ruta que intentaste abrir no existe o fue movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  )
}

export default NotFoundPage
