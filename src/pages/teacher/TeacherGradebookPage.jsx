import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { useAppContext } from '../../context/appContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const MONTHS = [
  { index: 0, label: 'Ene' },
  { index: 1, label: 'Feb' },
  { index: 2, label: 'Mar' },
  { index: 3, label: 'Abr' },
  { index: 4, label: 'May' },
  { index: 5, label: 'Jun' },
  { index: 6, label: 'Jul' },
  { index: 7, label: 'Ago' },
  { index: 8, label: 'Sep' },
  { index: 9, label: 'Oct' },
  { index: 10, label: 'Nov' },
  { index: 11, label: 'Dic' },
]

const MIN_NUMERIC_SLOTS = 2

const getEntityId = (entity) => {
  if (!entity) return ''
  if (typeof entity === 'object') return entity._id || ''
  return entity
}

const getStudentName = (student) => {
  if (!student) return 'Alumno'
  return `${student.lastName || ''}, ${student.firstName || ''}`.trim().replace(/^,\s*/, '') || student.documentNumber || 'Alumno'
}

const emptyNumericSlot = () => ({ id: null, score: '', isDirty: false })

const getTodayLocalDateInput = () => {
  const now = new Date()
  const offsetMs = now.getTimezoneOffset() * 60 * 1000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10)
}

const parseDateInputAsLocalDate = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const localDate = new Date(year, month - 1, day)

  if (
    Number.isNaN(localDate.getTime())
    || localDate.getFullYear() !== year
    || localDate.getMonth() !== month - 1
    || localDate.getDate() !== day
  ) {
    return null
  }

  return localDate
}

const normalizeMonthRange = (startMonth, endMonth) => {
  const start = Number(startMonth)
  const end = Number(endMonth)

  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end > 12 || start > end) {
    return MONTHS
  }

  return MONTHS.filter((month) => {
    const monthNumber = month.index + 1
    return monthNumber >= start && monthNumber <= end
  })
}

const buildNumericCells = (evaluations, enrollments, year, monthsRange) => {
  const grouped = {}

  ;(Array.isArray(evaluations) ? evaluations : []).forEach((evaluation) => {
    if (evaluation?.isRecovery) return
    if (evaluation?.score === undefined || evaluation?.score === null) return
    if (!evaluation?.date) return

    const date = new Date(evaluation.date)
    if (Number.isNaN(date.getTime()) || date.getFullYear() !== year) return

    const enrollmentId = getEntityId(evaluation.enrollmentId)
    if (!enrollmentId) return

    const monthIndex = date.getMonth()
    const key = `${enrollmentId}-${monthIndex}`
    if (!grouped[key]) grouped[key] = []

    grouped[key].push({
      id: evaluation._id,
      score: evaluation.score ?? '',
      date: evaluation.date,
    })
  })

  const cells = {}
  ;(Array.isArray(enrollments) ? enrollments : []).forEach((enrollment) => {
    monthsRange.forEach((month) => {
      const key = `${enrollment._id}-${month.index}`
      const slots = (grouped[key] || [])
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map((item) => ({ id: item.id, score: String(item.score ?? ''), isDirty: false }))

      while (slots.length < MIN_NUMERIC_SLOTS) {
        slots.push(emptyNumericSlot())
      }

      cells[key] = slots
    })
  })

  return cells
}

const TeacherGradebookPage = () => {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const { authUser } = useAppContext()

  const [course, setCourse] = useState(null)
  const [enrollments, setEnrollments] = useState([])
  const [courseEvaluations, setCourseEvaluations] = useState([])

  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [selectedMonth, setSelectedMonth] = useState(0)
  const [numericLoadDate, setNumericLoadDate] = useState(getTodayLocalDateInput())
  const [studentSearch, setStudentSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [minAverageFilter, setMinAverageFilter] = useState('')
  const [showDetailedNumeric, setShowDetailedNumeric] = useState(false)
  const [numericNotesFilters, setNumericNotesFilters] = useState({
    search: '',
    month: 'all',
    minScore: '',
  })
  const [numericCells, setNumericCells] = useState({})
  const [numericDeletedIds, setNumericDeletedIds] = useState([])
  const [numericMessage, setNumericMessage] = useState('')
  const [numericError, setNumericError] = useState('')
  const [isSavingNumeric, setIsSavingNumeric] = useState(false)
  const [numericNoteDrafts, setNumericNoteDrafts] = useState({})
  const [savingNumericNoteId, setSavingNumericNoteId] = useState('')

  const userId = authUser?.id || authUser?._id || ''
  const courseYear = useMemo(() => Number(course?.year) || new Date().getFullYear(), [course])
  const classMonths = useMemo(() => normalizeMonthRange(course?.startMonth, course?.endMonth), [course?.startMonth, course?.endMonth])

  const numericEvaluationsById = useMemo(() => {
    const map = {}
    courseEvaluations.forEach((evaluation) => {
      if (evaluation?.isRecovery) return
      if (evaluation?.score === undefined || evaluation?.score === null) return

      map[evaluation._id] = {
        score: evaluation.score,
        date: evaluation.date,
      }
    })
    return map
  }, [courseEvaluations])

  const enrollmentStudentNameById = useMemo(() => {
    const map = {}
    enrollments.forEach((enrollment) => {
      map[enrollment._id] = getStudentName(enrollment.studentId)
    })
    return map
  }, [enrollments])

  const numericNotesHistory = useMemo(() => {
    return courseEvaluations
      .filter((evaluation) => !evaluation?.isRecovery && evaluation?.score !== undefined && evaluation?.score !== null)
      .map((evaluation) => {
        const date = evaluation.date ? new Date(evaluation.date) : null
        const monthIndex = date && !Number.isNaN(date.getTime()) ? date.getMonth() : -1
        const enrollmentId = getEntityId(evaluation.enrollmentId)

        return {
          id: evaluation._id,
          enrollmentId,
          studentName: enrollmentStudentNameById[enrollmentId] || 'Alumno',
          score: Number(evaluation.score),
          monthIndex,
          monthLabel: monthIndex >= 0 ? MONTHS[monthIndex].label : '-',
          dateInput: date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : '',
          description: String(evaluation.comments || ''),
        }
      })
      .sort((a, b) => b.dateInput.localeCompare(a.dateInput))
  }, [courseEvaluations, enrollmentStudentNameById])

  const filteredNumericNotesHistory = useMemo(() => {
    const query = numericNotesFilters.search.trim().toLowerCase()
    const monthFilter = numericNotesFilters.month
    const minScore = numericNotesFilters.minScore === '' ? null : Number(numericNotesFilters.minScore)

    return numericNotesHistory.filter((note) => {
      if (query) {
        const inStudent = note.studentName.toLowerCase().includes(query)
        const inDescription = note.description.toLowerCase().includes(query)
        if (!inStudent && !inDescription) return false
      }

      if (monthFilter !== 'all' && String(note.monthIndex) !== monthFilter) {
        return false
      }

      if (minScore !== null && !Number.isNaN(minScore) && Number(note.score) < minScore) {
        return false
      }

      return true
    })
  }, [numericNotesHistory, numericNotesFilters])

  useEffect(() => {
    if (classMonths.length > 0) {
      setSelectedMonth(classMonths[0].index)
    }
  }, [classMonths])

  useEffect(() => {
    setNumericLoadDate((prev) => {
      const previousDate = prev ? new Date(prev) : new Date()
      const safeDay = !Number.isNaN(previousDate.getTime()) ? previousDate.getDate() : 1
      const nextDate = new Date(courseYear, selectedMonth, Math.min(Math.max(safeDay, 1), 28))
      return nextDate.toISOString().slice(0, 10)
    })
  }, [courseYear, selectedMonth])

  useEffect(() => {
    const drafts = {}
    numericNotesHistory.forEach((note) => {
      drafts[note.id] = {
        date: note.dateInput,
        description: note.description,
      }
    })
    setNumericNoteDrafts(drafts)
  }, [numericNotesHistory])

  useEffect(() => {
    if (!courseId) return

    const fetchData = async () => {
      setIsLoading(true)
      setLoadError('')
      setNumericMessage('')
      setNumericError('')
      setNumericDeletedIds([])

      try {
        const [courseRes, enrollmentsRes, evaluationsRes] = await Promise.all([
          fetch(`${API_URL}/api/courses/${courseId}`),
          fetch(`${API_URL}/api/enrollments/course/${courseId}`),
          fetch(`${API_URL}/api/evaluations/course/${courseId}`),
        ])

        const courseData = await courseRes.json().catch(() => ({}))
        const enrollmentsData = await enrollmentsRes.json().catch(() => [])
        const evaluationsData = await evaluationsRes.json().catch(() => [])

        if (!courseRes.ok) throw new Error(courseData.error || 'No se pudo cargar el curso')
        if (!enrollmentsRes.ok) throw new Error(enrollmentsData.error || 'No se pudieron cargar los alumnos del curso')
        if (!evaluationsRes.ok) throw new Error(evaluationsData.error || 'No se pudieron cargar las evaluaciones del curso')

        const activeEnrollments = Array.isArray(enrollmentsData) ? enrollmentsData : []
        const evaluationsList = Array.isArray(evaluationsData) ? evaluationsData : []

        setCourse(courseData)
        setEnrollments(activeEnrollments)
        setCourseEvaluations(evaluationsList)
        setNumericCells(buildNumericCells(evaluationsList, activeEnrollments, Number(courseData?.year) || new Date().getFullYear(), normalizeMonthRange(courseData?.startMonth, courseData?.endMonth)))
      } catch (error) {
        setLoadError(error.message || 'No se pudo cargar la planilla')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [courseId])

  const getCellKey = (enrollmentId, monthIndex) => `${enrollmentId}-${monthIndex}`

  const getSlots = (enrollmentId, monthIndex) => {
    const key = getCellKey(enrollmentId, monthIndex)
    return numericCells[key] || Array.from({ length: MIN_NUMERIC_SLOTS }, () => emptyNumericSlot())
  }

  const parseValidScore = (value) => {
    const trimmed = String(value || '').trim()
    if (!trimmed) return null

    const numericValue = Number(trimmed)
    if (Number.isNaN(numericValue) || numericValue < 1 || numericValue > 10) return null

    return numericValue
  }

  const getMonthAverageForEnrollment = (enrollmentId, monthIndex) => {
    const slots = getSlots(enrollmentId, monthIndex)
    const validScores = slots
      .map((slot) => parseValidScore(slot.score))
      .filter((score) => score !== null)

    if (validScores.length === 0) return null
    const total = validScores.reduce((sum, current) => sum + current, 0)
    return total / validScores.length
  }

  const filteredEnrollments = useMemo(() => {
    const query = studentSearch.trim().toLowerCase()
    const minAverage = minAverageFilter === '' ? null : Number(minAverageFilter)

    return enrollments.filter((enrollment) => {
      const studentLabel = getStudentName(enrollment.studentId).toLowerCase()
      const slots = getSlots(enrollment._id, selectedMonth)
      const hasAnyScore = slots.some((slot) => parseValidScore(slot.score) !== null)
      const average = getMonthAverageForEnrollment(enrollment._id, selectedMonth)

      if (query && !studentLabel.includes(query)) return false
      if (statusFilter === 'with-notes' && !hasAnyScore) return false
      if (statusFilter === 'without-notes' && hasAnyScore) return false

      if (minAverage !== null && !Number.isNaN(minAverage)) {
        if (average === null) return false
        if (average < minAverage) return false
      }

      return true
    })
  }, [enrollments, studentSearch, statusFilter, minAverageFilter, selectedMonth, numericCells])

  const setNumericSlotScore = (enrollmentId, monthIndex, slotIndex, value) => {
    const key = getCellKey(enrollmentId, monthIndex)

    setNumericCells((prev) => {
      const currentSlots = prev[key] || Array.from({ length: MIN_NUMERIC_SLOTS }, () => emptyNumericSlot())
      const nextSlots = currentSlots.map((slot, index) => (
        index === slotIndex
          ? { ...slot, score: value, isDirty: true }
          : slot
      ))
      return { ...prev, [key]: nextSlots }
    })

    setNumericMessage('')
    setNumericError('')
  }

  const addNumericSlot = (enrollmentId, monthIndex) => {
    const key = getCellKey(enrollmentId, monthIndex)

    setNumericCells((prev) => {
      const currentSlots = prev[key] || []
      return {
        ...prev,
        [key]: [...currentSlots, emptyNumericSlot()],
      }
    })

    setNumericMessage('')
    setNumericError('')
  }

  const removeNumericSlot = (enrollmentId, monthIndex, slotIndex) => {
    const key = getCellKey(enrollmentId, monthIndex)
    let removedId = null

    setNumericCells((prev) => {
      const currentSlots = prev[key] || []
      if (currentSlots.length <= 1) return prev

      removedId = currentSlots[slotIndex]?.id || null
      const nextSlots = currentSlots.filter((_, index) => index !== slotIndex)

      while (nextSlots.length < MIN_NUMERIC_SLOTS) {
        nextSlots.push(emptyNumericSlot())
      }

      return { ...prev, [key]: nextSlots }
    })

    if (removedId) {
      setNumericDeletedIds((prev) => [...new Set([...prev, removedId])])
    }

    setNumericMessage('')
    setNumericError('')
  }

  const saveNumericSheet = async () => {
    setNumericMessage('')
    setNumericError('')

    if (!userId) {
      setNumericError('No se pudo identificar el usuario autenticado')
      return
    }

    setIsSavingNumeric(true)
    try {
      let pendingActions = 0
      const deleteQueue = [...new Set(numericDeletedIds)]
      for (const [key, slots] of Object.entries(numericCells)) {
        const [enrollmentId, monthRaw] = key.split('-')
        const monthIndex = Number(monthRaw)

        const enrollment = enrollments.find((item) => item._id === enrollmentId)
        const studentId = getEntityId(enrollment?.studentId)
        if (!studentId) continue

        for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
          const slot = slots[slotIndex]
          const trimmed = String(slot?.score || '').trim()
          const isDirty = Boolean(slot?.isDirty)

          if (!trimmed) {
            if (slot?.id && isDirty) deleteQueue.push(slot.id)
            continue
          }

          if (!isDirty) continue

          const score = Number(trimmed)
          if (Number.isNaN(score) || score < 1 || score > 10) {
            throw new Error('Las notas numéricas deben estar entre 1 y 10')
          }
          const date = numericLoadDate

          if (slot?.id) {
            const original = numericEvaluationsById[slot.id]
            const unchanged = original && Number(original.score) === score

            if (unchanged) continue

            const updateRes = await fetch(`${API_URL}/api/evaluations/update/${slot.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ score, date }),
            })
            const updateData = await updateRes.json().catch(() => ({}))
            if (!updateRes.ok) throw new Error(updateData.error || 'No se pudo actualizar una nota mensual')
            pendingActions += 1
          } else {
            const createRes = await fetch(`${API_URL}/api/evaluations/create`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                enrollmentId,
                courseId: courseId,
                studentId,
                name: `Nota mensual - ${MONTHS[monthIndex].label} #${slotIndex + 1}`,
                date,
                score,
                isRecovery: false,
                createdBy: userId,
              }),
            })
            const createData = await createRes.json().catch(() => ({}))
            if (!createRes.ok) throw new Error(createData.error || 'No se pudo crear una nota mensual')
            pendingActions += 1
          }
        }
      }

      const uniqueDeleteIds = [...new Set(deleteQueue)]
      for (const evaluationId of uniqueDeleteIds) {
        const deleteRes = await fetch(`${API_URL}/api/evaluations/delete/${evaluationId}`, {
          method: 'DELETE',
        })
        const deleteData = await deleteRes.json().catch(() => ({}))
        if (!deleteRes.ok) throw new Error(deleteData.error || 'No se pudo eliminar una nota mensual')
        pendingActions += 1
      }

      if (pendingActions === 0) {
        setNumericMessage('No hay cambios por guardar')
        setNumericDeletedIds([])
        return
      }

      const evaluationsRes = await fetch(`${API_URL}/api/evaluations/course/${courseId}`)
      const evaluationsData = await evaluationsRes.json().catch(() => [])
      if (!evaluationsRes.ok) throw new Error(evaluationsData.error || 'No se pudieron refrescar las evaluaciones')

      const refreshedEvaluations = Array.isArray(evaluationsData) ? evaluationsData : []
      setCourseEvaluations(refreshedEvaluations)
      setNumericCells(buildNumericCells(refreshedEvaluations, enrollments, courseYear, classMonths))
      setNumericDeletedIds([])
      setNumericMessage('Planilla guardada correctamente')
    } catch (error) {
      setNumericError(error.message || 'No se pudo guardar la planilla')
    } finally {
      setIsSavingNumeric(false)
    }
  }

  const updateNumericNoteDraft = (noteId, field, value) => {
    setNumericNoteDrafts((prev) => ({
      ...prev,
      [noteId]: {
        date: prev[noteId]?.date || '',
        description: prev[noteId]?.description || '',
        [field]: value,
      },
    }))
    setNumericMessage('')
    setNumericError('')
  }

  const saveNumericNoteMetadata = async (noteId) => {
    const draft = numericNoteDrafts[noteId]
    if (!draft?.date) {
      setNumericError('Cada nota numérica debe tener una fecha válida')
      return
    }

    setSavingNumericNoteId(noteId)
    setNumericMessage('')
    setNumericError('')

    try {
      const response = await fetch(`${API_URL}/api/evaluations/update/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: parseDateInputAsLocalDate(draft.date),
          comments: String(draft.description || '').trim(),
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar la nota numérica')

      const evaluationsRes = await fetch(`${API_URL}/api/evaluations/course/${courseId}`)
      const evaluationsData = await evaluationsRes.json().catch(() => [])
      if (!evaluationsRes.ok) throw new Error(evaluationsData.error || 'No se pudieron refrescar las evaluaciones')

      const refreshedEvaluations = Array.isArray(evaluationsData) ? evaluationsData : []
      setCourseEvaluations(refreshedEvaluations)
      setNumericCells(buildNumericCells(refreshedEvaluations, enrollments, courseYear, classMonths))
      setNumericMessage('Nota actualizada correctamente')
    } catch (error) {
      setNumericError(error.message || 'No se pudo actualizar la nota numérica')
    } finally {
      setSavingNumericNoteId('')
    }
  }

  const maxSlotsForSelectedMonth = filteredEnrollments.reduce((maxSlots, enrollment) => {
    const slotsCount = getSlots(enrollment._id, selectedMonth).length
    return Math.max(maxSlots, slotsCount)
  }, MIN_NUMERIC_SLOTS)

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-3 text-xs text-zinc-500">
        <Link to="/teacher/dashboard" className="hover:text-zinc-700 hover:underline">Panel docente</Link>
        <span className="mx-2">/</span>
        <span>{course?.name || 'Curso'}</span>
        <span className="mx-2">/</span>
        <span className="font-medium text-zinc-700">Planilla</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Planilla de notas</h1>
          <p className="mt-1 text-sm text-zinc-500">{course?.name || 'Curso'} · Ciclo {courseYear}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Volver
          </button>
          <Link
            to="/teacher/dashboard"
            className="rounded-md bg-zinc-800 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
          >
            Ir al panel
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500">
          <LoadingSpinner inline size="sm" text="Cargando planilla..." />
        </div>
      ) : loadError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{loadError}</p>
      ) : (
        <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-48">
              <label htmlFor="selectedMonth" className="text-xs font-medium text-zinc-600">Mes de carga</label>
              <select
                id="selectedMonth"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(Number(event.target.value))}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              >
                {classMonths.map((month) => (
                  <option key={month.index} value={month.index}>{month.label}</option>
                ))}
              </select>
            </div>

            <div className="min-w-48">
              <label htmlFor="numericLoadDate" className="text-xs font-medium text-zinc-600">Fecha de carga</label>
              <input
                id="numericLoadDate"
                type="date"
                value={numericLoadDate}
                onChange={(event) => setNumericLoadDate(event.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              />
            </div>

            <button
              type="button"
              onClick={saveNumericSheet}
              disabled={isSavingNumeric}
              className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingNumeric ? <LoadingSpinner inline tone="light" size="sm" text="Guardando..." /> : 'Guardar planilla'}
            </button>
          </div>

          <div className="grid gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-3">
            <div>
              <label htmlFor="studentSearch" className="text-xs font-medium text-zinc-600">Buscar alumno</label>
              <input
                id="studentSearch"
                type="text"
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder="Apellido o nombre"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              />
            </div>

            <div>
              <label htmlFor="statusFilter" className="text-xs font-medium text-zinc-600">Estado de carga</label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              >
                <option value="all">Todos</option>
                <option value="with-notes">Con notas</option>
                <option value="without-notes">Sin notas</option>
              </select>
            </div>

            <div>
              <label htmlFor="minAverageFilter" className="text-xs font-medium text-zinc-600">Promedio mínimo</label>
              <input
                id="minAverageFilter"
                type="number"
                min="1"
                max="10"
                step="0.1"
                value={minAverageFilter}
                onChange={(event) => setMinAverageFilter(event.target.value)}
                placeholder="Ej: 7"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              />
            </div>
          </div>

          <p className="text-xs text-zinc-500">
            Carga rápida en formato planilla: escribí notas y guardá todos los cambios de una vez.
          </p>

          {numericError && <p className="text-sm text-red-600">{numericError}</p>}
          {numericMessage && <p className="text-sm text-emerald-600">{numericMessage}</p>}

          <div className="max-h-[68vh] overflow-auto rounded-lg border border-zinc-200">
            <table className="min-w-full w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-zinc-50">
                <tr>
                  <th className="border-b border-zinc-200 px-3 py-2 text-left text-xs font-semibold text-zinc-600">Alumno</th>
                  {Array.from({ length: maxSlotsForSelectedMonth }).map((_, slotIndex) => (
                    <th
                      key={`slot-header-${slotIndex}`}
                      className="border-b border-zinc-200 px-2 py-2 text-center text-xs font-semibold text-zinc-600"
                    >
                      Nota {slotIndex + 1}
                    </th>
                  ))}
                  <th className="border-b border-zinc-200 px-2 py-2 text-center text-xs font-semibold text-zinc-600">Promedio mes</th>
                  <th className="border-b border-zinc-200 px-2 py-2 text-center text-xs font-semibold text-zinc-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredEnrollments.length === 0 ? (
                  <tr>
                    <td colSpan={maxSlotsForSelectedMonth + 3} className="px-3 py-4 text-center text-sm text-zinc-500">
                      No hay resultados para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredEnrollments.map((enrollment) => {
                    const slots = getSlots(enrollment._id, selectedMonth)
                    const monthAverage = getMonthAverageForEnrollment(enrollment._id, selectedMonth)

                    return (
                      <tr key={enrollment._id}>
                        <td className="border-b border-zinc-100 px-3 py-2 text-zinc-700">{getStudentName(enrollment.studentId)}</td>
                        {Array.from({ length: maxSlotsForSelectedMonth }).map((_, slotIndex) => {
                          const slot = slots[slotIndex]
                          return (
                            <td key={`${enrollment._id}-${selectedMonth}-${slotIndex}`} className="border-b border-zinc-100 px-2 py-2 text-center">
                              {slot ? (
                                <div className="flex items-center justify-center gap-1">
                                  <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    step="0.01"
                                    value={slot.score}
                                    onChange={(event) => setNumericSlotScore(enrollment._id, selectedMonth, slotIndex, event.target.value)}
                                    className="w-14 rounded border border-zinc-300 px-1 py-0.5 text-center text-[11px] outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-200"
                                    placeholder="-"
                                  />
                                  {slots.length > MIN_NUMERIC_SLOTS ? (
                                    <button
                                      type="button"
                                      onClick={() => removeNumericSlot(enrollment._id, selectedMonth, slotIndex)}
                                      className="h-5 w-5 rounded border border-zinc-300 text-[10px] text-zinc-600 hover:bg-zinc-100"
                                      title="Quitar nota"
                                    >
                                      x
                                    </button>
                                  ) : null}
                                </div>
                              ) : (
                                <span className="text-xs text-zinc-400">-</span>
                              )}
                            </td>
                          )
                        })}
                        <td className="border-b border-zinc-100 px-2 py-2 text-center text-xs font-medium text-zinc-700">
                          {monthAverage === null ? '-' : monthAverage.toFixed(2)}
                        </td>
                        <td className="border-b border-zinc-100 px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => addNumericSlot(enrollment._id, selectedMonth)}
                            className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                            title="Agregar nota"
                          >
                            + Agregar
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowDetailedNumeric((prev) => !prev)}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              {showDetailedNumeric ? 'Ocultar edición detallada' : 'Ver edición detallada'}
            </button>
          </div>

          {showDetailedNumeric ? (
            <div className="space-y-3 rounded-lg border border-zinc-200 p-3">
              <h4 className="text-sm font-semibold text-zinc-800">Notas numéricas cargadas (detalle)</h4>

              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  type="text"
                  value={numericNotesFilters.search}
                  onChange={(event) => setNumericNotesFilters((prev) => ({ ...prev, search: event.target.value }))}
                  placeholder="Filtrar por alumno o descripción"
                  className="rounded border border-zinc-300 px-2 py-1.5 text-xs outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-200"
                />

                <select
                  value={numericNotesFilters.month}
                  onChange={(event) => setNumericNotesFilters((prev) => ({ ...prev, month: event.target.value }))}
                  className="rounded border border-zinc-300 px-2 py-1.5 text-xs outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-200"
                >
                  <option value="all">Todos los meses</option>
                  {classMonths.map((month) => (
                    <option key={`detail-month-${month.index}`} value={String(month.index)}>{month.label}</option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  max="10"
                  step="0.1"
                  value={numericNotesFilters.minScore}
                  onChange={(event) => setNumericNotesFilters((prev) => ({ ...prev, minScore: event.target.value }))}
                  placeholder="Nota mínima"
                  className="rounded border border-zinc-300 px-2 py-1.5 text-xs outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-200"
                />
              </div>

              <div className="max-h-80 overflow-auto rounded border border-zinc-200">
                {filteredNumericNotesHistory.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-zinc-500">No hay notas para los filtros seleccionados.</p>
                ) : (
                  <table className="min-w-full border-collapse text-sm">
                    <thead className="sticky top-0 bg-zinc-50">
                      <tr>
                        <th className="border-b border-zinc-200 px-2 py-2 text-left text-xs font-semibold text-zinc-600">Alumno</th>
                        <th className="border-b border-zinc-200 px-2 py-2 text-center text-xs font-semibold text-zinc-600">Mes</th>
                        <th className="border-b border-zinc-200 px-2 py-2 text-center text-xs font-semibold text-zinc-600">Nota</th>
                        <th className="border-b border-zinc-200 px-2 py-2 text-left text-xs font-semibold text-zinc-600">Fecha</th>
                        <th className="border-b border-zinc-200 px-2 py-2 text-left text-xs font-semibold text-zinc-600">Descripción</th>
                        <th className="border-b border-zinc-200 px-2 py-2 text-center text-xs font-semibold text-zinc-600">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredNumericNotesHistory.map((note) => {
                        const draft = numericNoteDrafts[note.id] || { date: note.dateInput, description: note.description }
                        const isSaving = savingNumericNoteId === note.id

                        return (
                          <tr key={note.id}>
                            <td className="border-b border-zinc-100 px-2 py-2 text-zinc-700">{note.studentName}</td>
                            <td className="border-b border-zinc-100 px-2 py-2 text-center text-xs text-zinc-700">{note.monthLabel}</td>
                            <td className="border-b border-zinc-100 px-2 py-2 text-center text-xs font-medium text-zinc-700">{Number(note.score).toFixed(2)}</td>
                            <td className="border-b border-zinc-100 px-2 py-2">
                              <input
                                type="date"
                                value={draft.date}
                                onChange={(event) => updateNumericNoteDraft(note.id, 'date', event.target.value)}
                                className="w-full rounded border border-zinc-300 px-2 py-1 text-xs outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-200"
                              />
                            </td>
                            <td className="border-b border-zinc-100 px-2 py-2">
                              <input
                                type="text"
                                value={draft.description}
                                onChange={(event) => updateNumericNoteDraft(note.id, 'description', event.target.value)}
                                placeholder="Descripción de la nota"
                                className="w-full rounded border border-zinc-300 px-2 py-1 text-xs outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-200"
                              />
                            </td>
                            <td className="border-b border-zinc-100 px-2 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => saveNumericNoteMetadata(note.id)}
                                disabled={isSaving}
                                className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isSaving ? 'Guardando...' : 'Guardar'}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : null}
        </section>
      )}
    </main>
  )
}

export default TeacherGradebookPage
