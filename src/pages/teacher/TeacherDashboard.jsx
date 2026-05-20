import { useState } from 'react'
import Swal from 'sweetalert2'
import CreateSchoolModal from '../../components/teacher/CreateSchoolModal'
import CreateCourseModal from '../../components/teacher/CreateCourseModal'
import EditCourseModal from '../../components/teacher/EditCourseModal'

const TeacherDashboard = () => {
  const [showModal, setShowModal] = useState(false)
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const [selectedSchool, setSelectedSchool] = useState(null)
  const [schools, setSchools] = useState([])
  // Estructura: { [schoolId]: [cursos] }
  const [coursesBySchool, setCoursesBySchool] = useState({})

  const handleSchoolCreated = (school) => {
    setSchools((prev) => [...prev, school])
  }

  const handleCourseCreated = (course) => {
    setCoursesBySchool(prev => {
      const schoolId = course.schoolId
      return {
        ...prev,
        [schoolId]: prev[schoolId] ? [...prev[schoolId], course] : [course]
      }
    })
  }

  const handleCourseEdited = (updatedCourse) => {
    setCoursesBySchool(prev => {
      const schoolId = updatedCourse.schoolId
      return {
        ...prev,
        [schoolId]: prev[schoolId]
          ? prev[schoolId].map(c => c._id === updatedCourse._id ? updatedCourse : c)
          : [updatedCourse]
      }
    })
  }

  const handleDeleteCourse = async (course) => {
    const result = await Swal.fire({
      title: '¿Eliminar curso?',
      text: `Se eliminará el curso "${course.name}". Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#991b1b',
      cancelButtonColor: '#d4d4d8',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    })
    if (!result.isConfirmed) return
    try {
      const res = await fetch(`/api/courses/delete/${course._id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar curso')
      setCoursesBySchool(prev => {
        const schoolId = course.schoolId
        return {
          ...prev,
          [schoolId]: prev[schoolId]?.filter(c => c._id !== course._id) || []
        }
      })
      Swal.fire('Éxito', 'Curso eliminado correctamente', 'success')
    } catch (err) {
      Swal.fire('Error', err.message, 'error')
    }
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
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-zinc-800">{school.name}</h2>
                    {school.description && <p className="text-sm text-zinc-600 mt-1">{school.description}</p>}
                  </div>
                  <button
                    className="ml-4 rounded-md bg-zinc-700 px-3 py-1 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
                    onClick={() => { setSelectedSchool(school); setShowCourseModal(true) }}
                  >
                    + Crear curso
                  </button>
                </div>
                {/* Cursos de esta escuela */}
                <div className="mt-4">
                  {(coursesBySchool[school._id] && coursesBySchool[school._id].length > 0) ? (
                    <ul className="space-y-2">
                      {coursesBySchool[school._id].map((course) => (
                        <li key={course._id || course.name} className="rounded border border-zinc-100 bg-zinc-50 p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium text-zinc-700">{course.name}</span>
                              {course.description && <span className="ml-2 text-zinc-500 text-sm">{course.description}</span>}
                            </div>
                            <div className="flex gap-2">
                              <button
                                className="text-xs text-blue-600 hover:underline"
                                onClick={() => { setEditingCourse(course); setShowEditModal(true) }}
                              >Editar</button>
                              <button
                                className="text-xs text-red-600 hover:underline"
                                onClick={() => handleDeleteCourse(course)}
                              >Eliminar</button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-zinc-400 text-sm">No hay cursos en esta escuela.</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <CreateSchoolModal open={showModal} onClose={() => setShowModal(false)} onCreated={handleSchoolCreated} />
      <CreateCourseModal
        open={showCourseModal}
        onClose={() => setShowCourseModal(false)}
        onCreated={handleCourseCreated}
        schools={selectedSchool ? [selectedSchool] : schools}
      />
      <EditCourseModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        onEdited={handleCourseEdited}
        course={editingCourse}
        schools={schools}
      />
    </main>
  )
}

export default TeacherDashboard
