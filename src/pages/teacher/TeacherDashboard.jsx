import { useState } from 'react'
import CreateSchoolModal from '../../components/teacher/CreateSchoolModal'

const TeacherDashboard = () => {
  const [showModal, setShowModal] = useState(false)
  const [schools, setSchools] = useState([])

  const handleSchoolCreated = (school) => {
    setSchools((prev) => [...prev, school])
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Panel docente</h1>
          <p className="mt-1 text-sm text-zinc-500">Gestioná tus escuelas y cursos</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
        >
          + Crear escuela
        </button>
      </div>
      <section>
        {schools.length === 0 ? (
          <p className="text-zinc-500">Aún no creaste escuelas.</p>
        ) : (
          <ul className="space-y-3">
            {schools.map((school) => (
              <li key={school._id || school.name} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                <h2 className="font-semibold text-zinc-800">{school.name}</h2>
                {school.description && <p className="text-sm text-zinc-600 mt-1">{school.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
      <CreateSchoolModal open={showModal} onClose={() => setShowModal(false)} onCreated={handleSchoolCreated} />
    </main>
  )
}

export default TeacherDashboard
