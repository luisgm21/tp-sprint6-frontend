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

const getTemplateId = (template) => {
  if (!template) return ''
  if (typeof template === 'object') return template._id || ''
  return template
}

const getStudentName = (student) => {
  if (!student) return 'Alumno'
  return `${student.lastName || ''}, ${student.firstName || ''}`.trim().replace(/^,\s*/, '') || student.documentNumber || 'Alumno'
}

const emptyNumericSlot = () => ({ id: null, score: '' })

const buildNumericCells = (evaluations, enrollments, year) => {
  const grouped = {}

  ;(Array.isArray(evaluations) ? evaluations : []).forEach((evaluation) => {
    if (evaluation?.isRecovery) return
    if (evaluation?.templateId?.type !== 'numeric') return
    if (!evaluation?.date) return

    const date = new Date(evaluation.date)
    if (Number.isNaN(date.getTime()) || date.getFullYear() !== year) return

    const enrollmentId = getTemplateId(evaluation.enrollmentId)
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
    MONTHS.forEach((month) => {
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
  const [numericTemplates, setNumericTemplates] = useState([])
  const [rubricTemplates, setRubricTemplates] = useState([])
  const [checklistTemplates, setChecklistTemplates] = useState([])

  const [isLoadingData, setIsLoadingData] = useState(false)
  const [loadError, setLoadError] = useState('')

  const [numericTemplateId, setNumericTemplateId] = useState('')
  const [numericCells, setNumericCells] = useState({})
  const [numericDeletedIds, setNumericDeletedIds] = useState([])
  const [numericMessage, setNumericMessage] = useState('')
  const [numericError, setNumericError] = useState('')
  const [isSavingNumeric, setIsSavingNumeric] = useState(false)

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

  const userId = authUser?.id || authUser?._id || ''

  const numericEvaluationsById = useMemo(() => {
    const map = {}
    courseEvaluations.forEach((evaluation) => {
      if (evaluation?.isRecovery) return
      if (evaluation?.templateId?.type !== 'numeric') return
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
      studentId: getTemplateId(enrollment.studentId),
      label: getStudentName(enrollment.studentId),
    })),
    [enrollments]
  )

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
        const [enrollmentsRes, evaluationsRes, numericRes, rubricRes, checklistRes] = await Promise.all([
          fetch(`${API_URL}/api/enrollments/course/${course._id}`),
          fetch(`${API_URL}/api/evaluations/course/${course._id}`),
          fetch(`${API_URL}/api/assessment-templates/school/${schoolId}/available?type=numeric`),
          fetch(`${API_URL}/api/assessment-templates/school/${schoolId}/available?type=rubric`),
          fetch(`${API_URL}/api/assessment-templates/school/${schoolId}/available?type=checklist`),
        ])

        const enrollmentsData = await enrollmentsRes.json().catch(() => [])
        const evaluationsData = await evaluationsRes.json().catch(() => [])
        const numericData = await numericRes.json().catch(() => [])
        const rubricData = await rubricRes.json().catch(() => [])
        const checklistData = await checklistRes.json().catch(() => [])

        if (!enrollmentsRes.ok) throw new Error(enrollmentsData.error || 'No se pudieron cargar los alumnos del curso')
        if (!evaluationsRes.ok) throw new Error(evaluationsData.error || 'No se pudieron cargar las evaluaciones del curso')
        if (!numericRes.ok) throw new Error(numericData.error || 'No se pudieron cargar plantillas numéricas')
        if (!rubricRes.ok) throw new Error(rubricData.error || 'No se pudieron cargar plantillas de rúbrica')
        if (!checklistRes.ok) throw new Error(checklistData.error || 'No se pudieron cargar plantillas de checklist')

        const activeEnrollments = Array.isArray(enrollmentsData) ? enrollmentsData : []
        setEnrollments(activeEnrollments)
        setCourseEvaluations(Array.isArray(evaluationsData) ? evaluationsData : [])
        setNumericTemplates(Array.isArray(numericData) ? numericData : [])
        setRubricTemplates(Array.isArray(rubricData) ? rubricData : [])
        setChecklistTemplates(Array.isArray(checklistData) ? checklistData : [])
        setNumericCells(buildNumericCells(evaluationsData, activeEnrollments, courseYear))

        const defaultEnrollment = activeEnrollments[0]?._id || ''
        const defaultNumericTemplate = (Array.isArray(numericData) ? numericData[0]?._id : '') || ''
        const defaultRubricTemplate = (Array.isArray(rubricData) ? rubricData[0]?._id : '') || ''
        const defaultChecklistTemplate = (Array.isArray(checklistData) ? checklistData[0]?._id : '') || ''

        setNumericTemplateId(defaultNumericTemplate)
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
  }, [open, course?._id, schoolId])

  if (!open) return null

  const handleClose = () => {
    onClose?.()
  }

  const setNumericSlotScore = (enrollmentId, monthIndex, slotIndex, value) => {
    const key = `${enrollmentId}-${monthIndex}`
    setNumericCells((prev) => {
      const currentSlots = prev[key] || Array.from({ length: MIN_NUMERIC_SLOTS }, () => emptyNumericSlot())
      const nextSlots = currentSlots.map((slot, index) => (index === slotIndex ? { ...slot, score: value } : slot))
      return { ...prev, [key]: nextSlots }
    })
    setNumericMessage('')
    setNumericError('')
  }

  const addNumericSlot = (enrollmentId, monthIndex) => {
    const key = `${enrollmentId}-${monthIndex}`
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
    const key = `${enrollmentId}-${monthIndex}`
    setNumericCells((prev) => {
      const currentSlots = prev[key] || []
      if (currentSlots.length <= 1) return prev

      const removedSlot = currentSlots[slotIndex]
      if (removedSlot?.id) {
        setNumericDeletedIds((deleted) => [...new Set([...deleted, removedSlot.id])])
      }

      const nextSlots = currentSlots.filter((_, index) => index !== slotIndex)
      while (nextSlots.length < MIN_NUMERIC_SLOTS) {
        nextSlots.push(emptyNumericSlot())
      }

      return { ...prev, [key]: nextSlots }
    })
    setNumericMessage('')
    setNumericError('')
  }

  const saveNumericSheet = async () => {
    setNumericMessage('')
    setNumericError('')

    if (!numericTemplateId) {
      setNumericError('Seleccioná una plantilla numérica para guardar la planilla mensual')
      return
    }

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
        const studentId = getTemplateId(enrollment?.studentId)
        if (!studentId) continue

        for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
          const slot = slots[slotIndex]
          const trimmedValue = String(slot?.score || '').trim()

          if (!trimmedValue) {
            if (slot?.id) deleteQueue.push(slot.id)
            continue
          }

          const score = Number(trimmedValue)
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
                templateId: numericTemplateId,
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

      setCourseEvaluations(Array.isArray(evaluationsData) ? evaluationsData : [])
      setNumericCells(buildNumericCells(evaluationsData, enrollments, courseYear))
      setNumericDeletedIds([])
      setNumericMessage('Planilla mensual guardada correctamente')
    } catch (error) {
      setNumericError(error.message || 'No se pudo guardar la planilla mensual')
    } finally {
      setIsSavingNumeric(false)
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
    const studentId = getTemplateId(selectedEnrollment?.studentId)
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
    const studentId = getTemplateId(selectedEnrollment?.studentId)
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
          <div className="min-w-64">
            <label htmlFor="numericTemplateId" className="text-xs font-medium text-zinc-600">Plantilla numérica</label>
            <select
              id="numericTemplateId"
              value={numericTemplateId}
              onChange={(event) => setNumericTemplateId(event.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            >
              <option value="">Seleccioná una plantilla</option>
              {numericTemplates.map((template) => (
                <option key={template._id} value={template._id}>{template.name}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={saveNumericSheet}
            disabled={isSavingNumeric}
            className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSavingNumeric ? <LoadingSpinner inline tone="light" size="sm" text="Guardando..." /> : 'Guardar planilla mensual'}
          </button>
        </div>

        <p className="text-xs text-zinc-500">
          Cada mes permite varias notas por alumno. Usá + para agregar y x para quitar espacios.
        </p>

        {numericError && <p className="text-sm text-red-600">{numericError}</p>}
        {numericMessage && <p className="text-sm text-emerald-600">{numericMessage}</p>}

        <div className="max-h-105 overflow-auto rounded-lg border border-zinc-200">
          <table className="min-w-230 w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-zinc-50">
              <tr>
                <th className="border-b border-zinc-200 px-3 py-2 text-left text-xs font-semibold text-zinc-600">Alumno</th>
                {MONTHS.map((month) => (
                  <th key={month.index} className="border-b border-zinc-200 px-1 py-2 text-center text-xs font-semibold text-zinc-600">{month.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {enrollments.map((enrollment) => (
                <tr key={enrollment._id}>
                  <td className="border-b border-zinc-100 px-3 py-2 text-zinc-700">{getStudentName(enrollment.studentId)}</td>
                  {MONTHS.map((month) => {
                    const key = `${enrollment._id}-${month.index}`
                    const slots = numericCells[key] || Array.from({ length: MIN_NUMERIC_SLOTS }, () => emptyNumericSlot())

                    return (
                      <td key={key} className="border-b border-zinc-100 px-1 py-1 align-top">
                        <div className="flex flex-col gap-1">
                          {slots.map((slot, slotIndex) => (
                            <div key={`${key}-${slotIndex}`} className="flex items-center gap-1">
                              <input
                                type="number"
                                min="1"
                                max="10"
                                step="0.01"
                                value={slot.score}
                                onChange={(event) => setNumericSlotScore(enrollment._id, month.index, slotIndex, event.target.value)}
                                className="w-12 rounded border border-zinc-300 px-1 py-0.5 text-center text-[11px] outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-200"
                                placeholder="-"
                              />
                              <button
                                type="button"
                                onClick={() => removeNumericSlot(enrollment._id, month.index, slotIndex)}
                                className="h-5 w-5 rounded border border-zinc-300 text-[10px] text-zinc-600 hover:bg-zinc-100"
                                title="Quitar nota"
                              >
                                x
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addNumericSlot(enrollment._id, month.index)}
                            className="h-5 rounded border border-zinc-300 text-[11px] text-zinc-600 hover:bg-zinc-100"
                            title="Agregar nota"
                          >
                            +
                          </button>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
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
            Nota numérica mensual
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
