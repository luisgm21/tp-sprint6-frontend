import { useEffect, useMemo, useState } from 'react'
import LoadingSpinner from '../common/LoadingSpinner'
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

const TAB_NUMERIC = 'numeric'
const TAB_RUBRIC = 'rubric'
const TAB_CHECKLIST = 'checklist'
const MIN_NUMERIC_SLOTS = 2

const getSchoolId = (course) => {
  if (!course?.schoolId) return ''
  if (typeof course.schoolId === 'object') return course.schoolId._id || ''
  return course.schoolId
}

const getEntityId = (entity) => {
  if (!entity) return ''
  if (typeof entity === 'object') return entity._id || ''
  return entity
}

const getStudentName = (student) => {
  if (!student) return 'Alumno'
  return `${student.lastName || ''}, ${student.firstName || ''}`.trim().replace(/^,\s*/, '') || student.documentNumber || 'Alumno'
}

const emptyNumericSlot = () => ({ id: null, score: '' })

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
        .map((item) => ({ id: item.id, score: String(item.score ?? '') }))

      while (slots.length < MIN_NUMERIC_SLOTS) {
        slots.push(emptyNumericSlot())
      }

      cells[key] = slots
    })
  })

  return cells
}

const CourseEvaluationsModal = ({ open, onClose, course }) => {
  const { authUser } = useAppContext()
  const [activeTab, setActiveTab] = useState(TAB_NUMERIC)

  const [enrollments, setEnrollments] = useState([])
  const [courseEvaluations, setCourseEvaluations] = useState([])
  const [rubricTemplates, setRubricTemplates] = useState([])
  const [checklistTemplates, setChecklistTemplates] = useState([])

  const [isLoadingData, setIsLoadingData] = useState(false)
  const [loadError, setLoadError] = useState('')

  const [selectedMonth, setSelectedMonth] = useState(0)
  const [numericCells, setNumericCells] = useState({})
  const [numericDeletedIds, setNumericDeletedIds] = useState([])
  const [numericMessage, setNumericMessage] = useState('')
  const [numericError, setNumericError] = useState('')
  const [isSavingNumeric, setIsSavingNumeric] = useState(false)
  const [numericNoteDrafts, setNumericNoteDrafts] = useState({})
  const [savingNumericNoteId, setSavingNumericNoteId] = useState('')

  const [rubricForm, setRubricForm] = useState({
    enrollmentId: '',
    templateId: '',
    date: new Date().toISOString().slice(0, 10),
    comments: '',
  })
  const [rubricSelections, setRubricSelections] = useState({})
  const [rubricMessage, setRubricMessage] = useState('')
  const [rubricError, setRubricError] = useState('')
  const [isSavingRubric, setIsSavingRubric] = useState(false)

  const [checklistForm, setChecklistForm] = useState({
    enrollmentId: '',
    templateId: '',
    date: new Date().toISOString().slice(0, 10),
    comments: '',
  })
  const [checklistSelections, setChecklistSelections] = useState({})
  const [checklistMessage, setChecklistMessage] = useState('')
  const [checklistError, setChecklistError] = useState('')
  const [isSavingChecklist, setIsSavingChecklist] = useState(false)

  const schoolId = useMemo(() => getSchoolId(course), [course])
  const courseYear = useMemo(() => Number(course?.year) || new Date().getFullYear(), [course])
  const classMonths = useMemo(() => normalizeMonthRange(course?.startMonth, course?.endMonth), [course?.startMonth, course?.endMonth])
  const userId = authUser?.id || authUser?._id || ''

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

  const rubricTemplate = useMemo(
    () => rubricTemplates.find((template) => template._id === rubricForm.templateId) || null,
    [rubricTemplates, rubricForm.templateId]
  )

  const checklistTemplate = useMemo(
    () => checklistTemplates.find((template) => template._id === checklistForm.templateId) || null,
    [checklistTemplates, checklistForm.templateId]
  )

  const enrollmentsOptions = useMemo(
    () => enrollments.map((enrollment) => ({
      enrollmentId: enrollment._id,
      studentId: getEntityId(enrollment.studentId),
      label: getStudentName(enrollment.studentId),
    })),
    [enrollments]
  )

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
          score: evaluation.score,
          monthLabel: monthIndex >= 0 ? MONTHS[monthIndex].label : '-',
          dateInput: date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : '',
          description: String(evaluation.comments || ''),
        }
      })
      .sort((a, b) => b.dateInput.localeCompare(a.dateInput))
  }, [courseEvaluations, enrollmentStudentNameById])

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
    if (classMonths.length > 0) {
      setSelectedMonth(classMonths[0].index)
    }
  }, [classMonths])

  useEffect(() => {
    if (!open || !course?._id) return

    const fetchData = async () => {
      setIsLoadingData(true)
      setLoadError('')
      setNumericMessage('')
      setNumericError('')
      setRubricMessage('')
      setRubricError('')
      setChecklistMessage('')
      setChecklistError('')
      setNumericCells({})
      setNumericDeletedIds([])

      try {
        const [enrollmentsRes, evaluationsRes, rubricRes, checklistRes] = await Promise.all([
          fetch(`${API_URL}/api/enrollments/course/${course._id}`),
          fetch(`${API_URL}/api/evaluations/course/${course._id}`),
          fetch(`${API_URL}/api/assessment-templates/school/${schoolId}/available?type=rubric`),
          fetch(`${API_URL}/api/assessment-templates/school/${schoolId}/available?type=checklist`),
        ])

        const enrollmentsData = await enrollmentsRes.json().catch(() => [])
        const evaluationsData = await evaluationsRes.json().catch(() => [])
        const rubricData = await rubricRes.json().catch(() => [])
        const checklistData = await checklistRes.json().catch(() => [])

        if (!enrollmentsRes.ok) throw new Error(enrollmentsData.error || 'No se pudieron cargar los alumnos del curso')
        if (!evaluationsRes.ok) throw new Error(evaluationsData.error || 'No se pudieron cargar las evaluaciones del curso')
        if (!rubricRes.ok) throw new Error(rubricData.error || 'No se pudieron cargar plantillas de rúbrica')
        if (!checklistRes.ok) throw new Error(checklistData.error || 'No se pudieron cargar plantillas de checklist')

        const activeEnrollments = Array.isArray(enrollmentsData) ? enrollmentsData : []
        const evaluationsList = Array.isArray(evaluationsData) ? evaluationsData : []
        const rubricList = Array.isArray(rubricData) ? rubricData : []
        const checklistList = Array.isArray(checklistData) ? checklistData : []

        setEnrollments(activeEnrollments)
        setCourseEvaluations(evaluationsList)
        setRubricTemplates(rubricList)
        setChecklistTemplates(checklistList)
        setNumericCells(buildNumericCells(evaluationsList, activeEnrollments, courseYear, classMonths))

        const defaultEnrollment = activeEnrollments[0]?._id || ''
        const defaultRubricTemplate = rubricList[0]?._id || ''
        const defaultChecklistTemplate = checklistList[0]?._id || ''

        setRubricForm((prev) => ({
          ...prev,
          enrollmentId: defaultEnrollment,
          templateId: defaultRubricTemplate,
        }))
        setChecklistForm((prev) => ({
          ...prev,
          enrollmentId: defaultEnrollment,
          templateId: defaultChecklistTemplate,
        }))
      } catch (error) {
        setLoadError(error.message || 'No se pudo cargar el módulo de evaluaciones')
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchData()
  }, [open, course?._id, schoolId, courseYear, classMonths])

  if (!open) return null

  const handleClose = () => {
    onClose?.()
  }

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

  const setNumericSlotScore = (enrollmentId, monthIndex, slotIndex, value) => {
    const key = getCellKey(enrollmentId, monthIndex)

    setNumericCells((prev) => {
      const currentSlots = prev[key] || Array.from({ length: MIN_NUMERIC_SLOTS }, () => emptyNumericSlot())
      const nextSlots = currentSlots.map((slot, index) => (index === slotIndex ? { ...slot, score: value } : slot))
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

          if (!trimmed) {
            if (slot?.id) deleteQueue.push(slot.id)
            continue
          }

          const score = Number(trimmed)
          if (Number.isNaN(score) || score < 1 || score > 10) {
            throw new Error('Las notas numéricas deben estar entre 1 y 10')
          }

          const day = Math.min(slotIndex + 1, 28)
          const date = new Date(courseYear, monthIndex, day)

          if (slot?.id) {
            const original = numericEvaluationsById[slot.id]
            const originalDate = original?.date ? new Date(original.date) : null
            const unchanged =
              original &&
              Number(original.score) === score &&
              originalDate &&
              originalDate.getFullYear() === date.getFullYear() &&
              originalDate.getMonth() === date.getMonth() &&
              originalDate.getDate() === date.getDate()

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
                courseId: course._id,
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

      const evaluationsRes = await fetch(`${API_URL}/api/evaluations/course/${course._id}`)
      const evaluationsData = await evaluationsRes.json().catch(() => [])
      if (!evaluationsRes.ok) throw new Error(evaluationsData.error || 'No se pudieron refrescar las evaluaciones')

      const refreshedEvaluations = Array.isArray(evaluationsData) ? evaluationsData : []
      setCourseEvaluations(refreshedEvaluations)
      setNumericCells(buildNumericCells(refreshedEvaluations, enrollments, courseYear, classMonths))
      setNumericDeletedIds([])
      setNumericMessage('Planilla mensual guardada correctamente')
    } catch (error) {
      setNumericError(error.message || 'No se pudo guardar la planilla mensual')
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
          date: new Date(draft.date),
          comments: String(draft.description || '').trim(),
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar la nota numérica')

      const evaluationsRes = await fetch(`${API_URL}/api/evaluations/course/${course._id}`)
      const evaluationsData = await evaluationsRes.json().catch(() => [])
      if (!evaluationsRes.ok) throw new Error(evaluationsData.error || 'No se pudieron refrescar las evaluaciones')

      const refreshedEvaluations = Array.isArray(evaluationsData) ? evaluationsData : []
      setCourseEvaluations(refreshedEvaluations)
      setNumericCells(buildNumericCells(refreshedEvaluations, enrollments, courseYear, classMonths))
      setNumericMessage('Fecha y descripción actualizadas correctamente')
    } catch (error) {
      setNumericError(error.message || 'No se pudo actualizar la nota numérica')
    } finally {
      setSavingNumericNoteId('')
    }
  }

  const submitRubricEvaluation = async (event) => {
    event.preventDefault()
    setRubricMessage('')
    setRubricError('')

    if (!userId) {
      setRubricError('No se pudo identificar el usuario autenticado')
      return
    }

    if (!rubricForm.enrollmentId || !rubricForm.templateId || !rubricForm.date) {
      setRubricError('Completá alumno, plantilla y fecha')
      return
    }

    const selectedEnrollment = enrollments.find((enrollment) => enrollment._id === rubricForm.enrollmentId)
    const studentId = getEntityId(selectedEnrollment?.studentId)
    if (!studentId) {
      setRubricError('No se pudo resolver el alumno seleccionado')
      return
    }

    const criteria = rubricTemplate?.criteria || []
    const missingCriteria = criteria.filter((criterion) => !rubricSelections[criterion.name])
    if (missingCriteria.length > 0) {
      setRubricError('Seleccioná un nivel para todos los criterios de la rúbrica')
      return
    }

    const rubricResults = criteria.map((criterion) => {
      const selectedLevelLabel = rubricSelections[criterion.name]
      const selectedLevel = (criterion.levels || []).find((level) => level.label === selectedLevelLabel)
      return {
        criterionName: criterion.name,
        selectedLevel: selectedLevelLabel,
        score: selectedLevel?.score ?? 0,
      }
    })

    setIsSavingRubric(true)
    try {
      const response = await fetch(`${API_URL}/api/evaluations/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollmentId: rubricForm.enrollmentId,
          courseId: course._id,
          studentId,
          templateId: rubricForm.templateId,
          name: rubricTemplate?.name || 'Evaluación por rúbrica',
          date: new Date(rubricForm.date),
          rubricResults,
          comments: rubricForm.comments.trim(),
          isRecovery: false,
          createdBy: userId,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar la evaluación por rúbrica')

      setRubricMessage('Evaluación por rúbrica guardada correctamente')
      setRubricSelections({})
    } catch (error) {
      setRubricError(error.message)
    } finally {
      setIsSavingRubric(false)
    }
  }

  const submitChecklistEvaluation = async (event) => {
    event.preventDefault()
    setChecklistMessage('')
    setChecklistError('')

    if (!userId) {
      setChecklistError('No se pudo identificar el usuario autenticado')
      return
    }

    if (!checklistForm.enrollmentId || !checklistForm.templateId || !checklistForm.date) {
      setChecklistError('Completá alumno, plantilla y fecha')
      return
    }

    const selectedEnrollment = enrollments.find((enrollment) => enrollment._id === checklistForm.enrollmentId)
    const studentId = getEntityId(selectedEnrollment?.studentId)
    if (!studentId) {
      setChecklistError('No se pudo resolver el alumno seleccionado')
      return
    }

    const items = checklistTemplate?.items || []
    if (items.length === 0) {
      setChecklistError('La plantilla seleccionada no tiene items')
      return
    }

    const checklistResults = items.map((item) => ({
      itemDescription: item.description,
      checked: !!checklistSelections[item.description],
    }))

    setIsSavingChecklist(true)
    try {
      const response = await fetch(`${API_URL}/api/evaluations/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollmentId: checklistForm.enrollmentId,
          courseId: course._id,
          studentId,
          templateId: checklistForm.templateId,
          name: checklistTemplate?.name || 'Evaluación checklist',
          date: new Date(checklistForm.date),
          checklistResults,
          comments: checklistForm.comments.trim(),
          isRecovery: false,
          createdBy: userId,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar la evaluación checklist')

      setChecklistMessage('Evaluación checklist guardada correctamente')
      setChecklistSelections({})
    } catch (error) {
      setChecklistError(error.message)
    } finally {
      setIsSavingChecklist(false)
    }
  }

  const renderNumericTab = () => {
    if (enrollments.length === 0) {
      return <p className="text-sm text-zinc-500">No hay alumnos activos en este curso.</p>
    }

    return (
      <div className="space-y-3">
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

          <button
            type="button"
            onClick={saveNumericSheet}
            disabled={isSavingNumeric}
            className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSavingNumeric ? <LoadingSpinner inline tone="light" size="sm" text="Guardando..." /> : 'Guardar notas'}
          </button>
        </div>

        <p className="text-xs text-zinc-500">
          Cargá notas para el mes seleccionado. Podés agregar varias notas por alumno con el botón +.
        </p>

        {numericError && <p className="text-sm text-red-600">{numericError}</p>}
        {numericMessage && <p className="text-sm text-emerald-600">{numericMessage}</p>}

        <div className="max-h-105 overflow-auto rounded-lg border border-zinc-200">
          <table className="min-w-full w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-zinc-50">
              <tr>
                <th className="border-b border-zinc-200 px-3 py-2 text-left text-xs font-semibold text-zinc-600">Alumno</th>
                <th className="border-b border-zinc-200 px-2 py-2 text-left text-xs font-semibold text-zinc-600">Notas del mes</th>
                <th className="border-b border-zinc-200 px-2 py-2 text-center text-xs font-semibold text-zinc-600">Promedio mes</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((enrollment) => {
                const slots = getSlots(enrollment._id, selectedMonth)
                const monthAverage = getMonthAverageForEnrollment(enrollment._id, selectedMonth)

                return (
                  <tr key={enrollment._id}>
                    <td className="border-b border-zinc-100 px-3 py-2 text-zinc-700">{getStudentName(enrollment.studentId)}</td>
                    <td className="border-b border-zinc-100 px-2 py-2">
                      <div className="flex flex-wrap items-center gap-1">
                        {slots.map((slot, slotIndex) => (
                          <div key={`${enrollment._id}-${selectedMonth}-${slotIndex}`} className="flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              max="10"
                              step="0.01"
                              value={slot.score}
                              onChange={(event) => setNumericSlotScore(enrollment._id, selectedMonth, slotIndex, event.target.value)}
                              className="w-12 rounded border border-zinc-300 px-1 py-0.5 text-center text-[11px] outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-200"
                              placeholder="-"
                            />
                            <button
                              type="button"
                              onClick={() => removeNumericSlot(enrollment._id, selectedMonth, slotIndex)}
                              className="h-5 w-5 rounded border border-zinc-300 text-[10px] text-zinc-600 hover:bg-zinc-100"
                              title="Quitar nota"
                            >
                              x
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addNumericSlot(enrollment._id, selectedMonth)}
                          className="h-5 w-5 rounded border border-zinc-300 text-[11px] text-zinc-600 hover:bg-zinc-100"
                          title="Agregar nota"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="border-b border-zinc-100 px-2 py-2 text-center text-xs font-medium text-zinc-700">
                      {monthAverage === null ? '-' : monthAverage.toFixed(2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-zinc-200">
          <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Resumen general de promedios mensuales</h4>
          </div>
          <div className="max-h-80 overflow-auto">
            <table className="min-w-230 w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-white">
                <tr>
                  <th className="border-b border-zinc-200 px-3 py-2 text-left text-xs font-semibold text-zinc-600">Alumno</th>
                  {classMonths.map((month) => (
                    <th key={`summary-${month.index}`} className="border-b border-zinc-200 px-2 py-2 text-center text-xs font-semibold text-zinc-600">{month.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enrollment) => (
                  <tr key={`summary-row-${enrollment._id}`}>
                    <td className="border-b border-zinc-100 px-3 py-2 text-zinc-700">{getStudentName(enrollment.studentId)}</td>
                    {classMonths.map((month) => {
                      const average = getMonthAverageForEnrollment(enrollment._id, month.index)
                      return (
                        <td key={`summary-${enrollment._id}-${month.index}`} className="border-b border-zinc-100 px-2 py-2 text-center text-xs text-zinc-700">
                          {average === null ? '-' : average.toFixed(2)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200">
          <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Notas numéricas cargadas</h4>
          </div>
          <div className="max-h-80 overflow-auto">
            {numericNotesHistory.length === 0 ? (
              <p className="px-3 py-3 text-sm text-zinc-500">Aún no hay notas numéricas registradas.</p>
            ) : (
              <table className="min-w-230 w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr>
                    <th className="border-b border-zinc-200 px-3 py-2 text-left text-xs font-semibold text-zinc-600">Alumno</th>
                    <th className="border-b border-zinc-200 px-2 py-2 text-center text-xs font-semibold text-zinc-600">Mes</th>
                    <th className="border-b border-zinc-200 px-2 py-2 text-center text-xs font-semibold text-zinc-600">Nota</th>
                    <th className="border-b border-zinc-200 px-2 py-2 text-left text-xs font-semibold text-zinc-600">Fecha</th>
                    <th className="border-b border-zinc-200 px-2 py-2 text-left text-xs font-semibold text-zinc-600">Descripción</th>
                    <th className="border-b border-zinc-200 px-2 py-2 text-center text-xs font-semibold text-zinc-600">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {numericNotesHistory.map((note) => {
                    const draft = numericNoteDrafts[note.id] || { date: note.dateInput, description: note.description }
                    const isSaving = savingNumericNoteId === note.id

                    return (
                      <tr key={note.id}>
                        <td className="border-b border-zinc-100 px-3 py-2 text-zinc-700">{note.studentName}</td>
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
      </div>
    )
  }

  const renderRubricTab = () => {
    return (
      <form onSubmit={submitRubricEvaluation} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-zinc-600">Alumno</label>
            <select
              value={rubricForm.enrollmentId}
              onChange={(event) => setRubricForm((prev) => ({ ...prev, enrollmentId: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            >
              <option value="">Seleccioná un alumno</option>
              {enrollmentsOptions.map((option) => (
                <option key={option.enrollmentId} value={option.enrollmentId}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">Plantilla de rúbrica</label>
            <select
              value={rubricForm.templateId}
              onChange={(event) => {
                setRubricForm((prev) => ({ ...prev, templateId: event.target.value }))
                setRubricSelections({})
              }}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            >
              <option value="">Seleccioná una plantilla</option>
              {rubricTemplates.map((template) => (
                <option key={template._id} value={template._id}>{template.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">Fecha</label>
            <input
              type="date"
              value={rubricForm.date}
              onChange={(event) => setRubricForm((prev) => ({ ...prev, date: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
          </div>
        </div>

        {rubricTemplate?.criteria?.length > 0 ? (
          <div className="rounded-lg border border-zinc-200 p-3">
            <p className="text-sm font-medium text-zinc-700">Criterios</p>
            <div className="mt-2 grid gap-3">
              {rubricTemplate.criteria.map((criterion) => (
                <div key={criterion.name}>
                  <label className="text-xs font-medium text-zinc-600">{criterion.name}</label>
                  <select
                    value={rubricSelections[criterion.name] || ''}
                    onChange={(event) => setRubricSelections((prev) => ({ ...prev, [criterion.name]: event.target.value }))}
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                  >
                    <option value="">Seleccioná nivel</option>
                    {(criterion.levels || []).map((level) => (
                      <option key={`${criterion.name}-${level.label}`} value={level.label}>{level.label} ({level.score ?? 0})</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Seleccioná una plantilla con criterios de rúbrica.</p>
        )}

        <div>
          <label className="text-xs font-medium text-zinc-600">Comentarios</label>
          <textarea
            rows={3}
            value={rubricForm.comments}
            onChange={(event) => setRubricForm((prev) => ({ ...prev, comments: event.target.value }))}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            placeholder="Observaciones de la evaluación"
          />
        </div>

        {rubricError && <p className="text-sm text-red-600">{rubricError}</p>}
        {rubricMessage && <p className="text-sm text-emerald-600">{rubricMessage}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSavingRubric}
            className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSavingRubric ? <LoadingSpinner inline tone="light" size="sm" text="Guardando..." /> : 'Guardar rúbrica'}
          </button>
        </div>
      </form>
    )
  }

  const renderChecklistTab = () => {
    return (
      <form onSubmit={submitChecklistEvaluation} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-zinc-600">Alumno</label>
            <select
              value={checklistForm.enrollmentId}
              onChange={(event) => setChecklistForm((prev) => ({ ...prev, enrollmentId: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            >
              <option value="">Seleccioná un alumno</option>
              {enrollmentsOptions.map((option) => (
                <option key={option.enrollmentId} value={option.enrollmentId}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">Plantilla checklist</label>
            <select
              value={checklistForm.templateId}
              onChange={(event) => {
                setChecklistForm((prev) => ({ ...prev, templateId: event.target.value }))
                setChecklistSelections({})
              }}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            >
              <option value="">Seleccioná una plantilla</option>
              {checklistTemplates.map((template) => (
                <option key={template._id} value={template._id}>{template.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">Fecha</label>
            <input
              type="date"
              value={checklistForm.date}
              onChange={(event) => setChecklistForm((prev) => ({ ...prev, date: event.target.value }))}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            />
          </div>
        </div>

        {checklistTemplate?.items?.length > 0 ? (
          <div className="rounded-lg border border-zinc-200 p-3">
            <p className="text-sm font-medium text-zinc-700">Items</p>
            <div className="mt-2 grid gap-2">
              {checklistTemplate.items.map((item) => (
                <label key={item.description} className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={!!checklistSelections[item.description]}
                    onChange={(event) => setChecklistSelections((prev) => ({ ...prev, [item.description]: event.target.checked }))}
                  />
                  {item.description}
                </label>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Seleccioná una plantilla con items de checklist.</p>
        )}

        <div>
          <label className="text-xs font-medium text-zinc-600">Comentarios</label>
          <textarea
            rows={3}
            value={checklistForm.comments}
            onChange={(event) => setChecklistForm((prev) => ({ ...prev, comments: event.target.value }))}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            placeholder="Observaciones de la evaluación"
          />
        </div>

        {checklistError && <p className="text-sm text-red-600">{checklistError}</p>}
        {checklistMessage && <p className="text-sm text-emerald-600">{checklistMessage}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSavingChecklist}
            className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSavingChecklist ? <LoadingSpinner inline tone="light" size="sm" text="Guardando..." /> : 'Guardar checklist'}
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-6xl rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Evaluaciones del curso</h2>
            <p className="text-sm text-zinc-500">{course?.name} · Ciclo {courseYear}</p>
          </div>
          <button
            onClick={handleClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
          >
            ×
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab(TAB_NUMERIC)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${activeTab === TAB_NUMERIC ? 'bg-zinc-800 text-white' : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-50'}`}
          >
            Nota numérica
          </button>
          <button
            type="button"
            onClick={() => setActiveTab(TAB_RUBRIC)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${activeTab === TAB_RUBRIC ? 'bg-zinc-800 text-white' : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-50'}`}
          >
            Rúbricas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab(TAB_CHECKLIST)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${activeTab === TAB_CHECKLIST ? 'bg-zinc-800 text-white' : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-50'}`}
          >
            Checklist
          </button>
        </div>

        {isLoadingData ? (
          <div className="py-8 text-center text-sm text-zinc-500">
            <LoadingSpinner inline size="sm" text="Cargando evaluaciones..." />
          </div>
        ) : loadError ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{loadError}</p>
        ) : (
          <div>
            {activeTab === TAB_NUMERIC && renderNumericTab()}
            {activeTab === TAB_RUBRIC && renderRubricTab()}
            {activeTab === TAB_CHECKLIST && renderChecklistTab()}
          </div>
        )}
      </div>
    </div>
  )
}

export default CourseEvaluationsModal
