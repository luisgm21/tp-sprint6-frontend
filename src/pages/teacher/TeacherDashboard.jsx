import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import Swal from 'sweetalert2'
import CreateSchoolModal from '../../components/teacher/CreateSchoolModal'
import CreateCourseModal from '../../components/teacher/CreateCourseModal'
import EditCourseModal from '../../components/teacher/EditCourseModal'
import ManageCourseStudentsModal from '../../components/teacher/ManageCourseStudentsModal'
import CourseEvaluationsModal from '../../components/teacher/CourseEvaluationsModal'
import { useAppContext } from '../../context/appContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const TeacherDashboard = () => {
  const navigate = useNavigate()
  const { token, authUser, logout } = useAppContext()
  const [showModal, setShowModal] = useState(false)
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showStudentsModal, setShowStudentsModal] = useState(false)
  const [showEvaluationsModal, setShowEvaluationsModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const [selectedCourseForStudents, setSelectedCourseForStudents] = useState(null)
  const [selectedCourseForEvaluations, setSelectedCourseForEvaluations] = useState(null)
  const [selectedSchool, setSelectedSchool] = useState(null)
  const [schools, setSchools] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  // Estructura: { [schoolId]: [cursos] }
  const [coursesBySchool, setCoursesBySchool] = useState({})

  const getSchoolId = (value) => {
    if (!value) return ''
    if (typeof value === 'object') return value._id || ''
    return value
  }

  const loadDashboardData = useCallback(async () => {
    if (!token || !authUser?.id) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setLoadError('')

    try {
      const schoolsRes = await fetch(`${API_URL}/api/schools/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const schoolsData = await schoolsRes.json().catch(() => [])
      if (schoolsRes.status === 401 || schoolsRes.status === 403) {
        logout()
        return
      }
      if (!schoolsRes.ok) {
        throw new Error(schoolsData.error || 'No se pudieron cargar tus escuelas')
      }

      setSchools(schoolsData)

      const coursesRes = await fetch(`${API_URL}/api/courses/teacher/${authUser.id}`)
      const coursesData = await coursesRes.json().catch(() => [])
      if (!coursesRes.ok) {
        throw new Error(coursesData.error || 'No se pudieron cargar tus cursos')
      }

      const grouped = (Array.isArray(coursesData) ? coursesData : []).reduce((acc, course) => {
        const schoolId = getSchoolId(course.schoolId)
        if (!schoolId) return acc

        const normalizedCourse = {
          ...course,
          schoolId,
        }

        return {
          ...acc,
          [schoolId]: acc[schoolId] ? [...acc[schoolId], normalizedCourse] : [normalizedCourse],
        }
      }, {})

      setCoursesBySchool(grouped)
    } catch (err) {
      setLoadError(err.message || 'No se pudo cargar la informacion del dashboard')
    } finally {
      setIsLoading(false)
    }
  }, [token, authUser?.id, logout])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const handleSchoolCreated = async () => {
    await loadDashboardData()
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
      const res = await fetch(`${API_URL}/api/courses/deactivate/${course._id}`, { method: 'PATCH' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Error al eliminar curso')
      setCoursesBySchool(prev => {
        const schoolId = course.schoolId
        return {
          ...prev,
          [schoolId]: prev[schoolId]?.filter(c => c._id !== course._id) || []
        }
      })
      Swal.fire('Éxito', 'Curso eliminado correctamente', 'success')
    } catch (err) {
      Swal.fire('Error', err.message || 'No se pudo eliminar el curso', 'error')
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
        {isLoading && <p className="text-zinc-500">Cargando escuelas...</p>}
        {loadError && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {loadError}
          </p>
        )}
        {!isLoading && schools.length === 0 ? (
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
                                className="text-xs text-emerald-700 hover:underline"
                                onClick={() => {
                                  setSelectedCourseForStudents(course)
                                  setShowStudentsModal(true)
                                }}
                              >Alumnos</button>
                              <button
                                className="text-xs text-violet-700 hover:underline"
                                onClick={() => {
                                  setSelectedCourseForEvaluations(course)
                                  setShowEvaluationsModal(true)
                                }}
                              >Evaluaciones</button>
                              <button
                                className="text-xs text-amber-700 hover:underline"
                                onClick={() => navigate(`/teacher/courses/${course._id}/gradebook`)}
                              >Planilla</button>
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
      <ManageCourseStudentsModal
        open={showStudentsModal}
        onClose={() => setShowStudentsModal(false)}
        course={selectedCourseForStudents}
      />
      <CourseEvaluationsModal
        open={showEvaluationsModal}
        onClose={() => setShowEvaluationsModal(false)}
        course={selectedCourseForEvaluations}
      />
    </main>
  )
}

export default TeacherDashboard
