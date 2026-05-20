import { useEffect, useMemo, useState } from 'react'
import { useAppContext } from '../../context/appContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const buildDefaultCriteria = () => ([
  {
    name: '',
    levels: [
      { label: 'Excelente', score: 10 },
      { label: 'Bueno', score: 7 },
      { label: 'Regular', score: 5 },
      { label: 'Insuficiente', score: 1 },
    ],
  },
])

const buildEmptyForm = () => ({
  name: '',
  criteria: buildDefaultCriteria(),
})

const getCreatorId = (template) => {
  if (!template?.createdBy) return ''
  if (typeof template.createdBy === 'string') return template.createdBy
  return template.createdBy._id || template.createdBy.id || ''
}

const TeacherSettingsPage = () => {
  const { authUser, token, logout } = useAppContext()

  const [schools, setSchools] = useState([])
  const [selectedSchoolId, setSelectedSchoolId] = useState('')
  const [templates, setTemplates] = useState([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')

  const [formData, setFormData] = useState(buildEmptyForm())
  const [isEditMode, setIsEditMode] = useState(false)

  const [isLoadingSchools, setIsLoadingSchools] = useState(true)
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const selectedTemplate = useMemo(
    () => templates.find((template) => template._id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  )
  const hasSchools = schools.length > 0

  useEffect(() => {
    const fetchSchools = async () => {
      setIsLoadingSchools(true)
      setError('')
      try {
        const response = await fetch(`${API_URL}/api/schools/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json().catch(() => [])
        if (response.status === 401 || response.status === 403) {
          logout()
          return
        }
        if (!response.ok) throw new Error(data.error || 'No se pudieron cargar las escuelas')

        setSchools(data)
        if (data.length > 0) {
          setSelectedSchoolId(data[0]._id)
        } else {
          setSelectedSchoolId('')
        }
      } catch (fetchError) {
        setError(fetchError.message)
      } finally {
        setIsLoadingSchools(false)
      }
    }

    fetchSchools()
  }, [token, logout])

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!selectedSchoolId) {
        setTemplates([])
        setSelectedTemplateId('')
        return
      }

      setIsLoadingTemplates(true)
      setError('')
      try {
        const response = await fetch(`${API_URL}/api/assessment-templates/school/${selectedSchoolId}?type=rubric`)
        const data = await response.json().catch(() => [])
        if (!response.ok) throw new Error(data.error || 'No se pudieron cargar las plantillas')

        const ownTemplates = (Array.isArray(data) ? data : []).filter(
          (template) => getCreatorId(template) === authUser?.id
        )

        setTemplates(ownTemplates)

        const savedSelectedTemplateId = localStorage.getItem(`selected-rubric-template:${selectedSchoolId}`) || ''
        const existsInResult = ownTemplates.some((template) => template._id === savedSelectedTemplateId)
        setSelectedTemplateId(existsInResult ? savedSelectedTemplateId : '')
      } catch (fetchError) {
        setError(fetchError.message)
      } finally {
        setIsLoadingTemplates(false)
      }
    }

    fetchTemplates()
    setFormData(buildEmptyForm())
    setIsEditMode(false)
  }, [selectedSchoolId, authUser?.id])

  useEffect(() => {
    if (!selectedTemplate) return

    setFormData({
      name: selectedTemplate.name || '',
      criteria: (selectedTemplate.criteria || []).length > 0
        ? selectedTemplate.criteria.map((criterion) => ({
          name: criterion.name || '',
          levels: (criterion.levels || []).map((level) => ({
            label: level.label || '',
            score: Number(level.score) || 0,
          })),
        }))
        : buildDefaultCriteria(),
    })
    setIsEditMode(true)
    localStorage.setItem(`selected-rubric-template:${selectedSchoolId}`, selectedTemplate._id)
  }, [selectedTemplate, selectedSchoolId])

  const setField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError('')
    setSuccess('')
  }

  const setCriterionName = (criterionIndex, value) => {
    setFormData((prev) => ({
      ...prev,
      criteria: prev.criteria.map((criterion, index) => (
        index === criterionIndex ? { ...criterion, name: value } : criterion
      )),
    }))
    setError('')
    setSuccess('')
  }

  const setCriterionLevel = (criterionIndex, levelIndex, field, value) => {
    setFormData((prev) => ({
      ...prev,
      criteria: prev.criteria.map((criterion, currentCriterionIndex) => {
        if (currentCriterionIndex !== criterionIndex) return criterion

        return {
          ...criterion,
          levels: criterion.levels.map((level, currentLevelIndex) => {
            if (currentLevelIndex !== levelIndex) return level
            if (field === 'score') return { ...level, [field]: Number(value) }
            return { ...level, [field]: value }
          }),
        }
      }),
    }))
    setError('')
    setSuccess('')
  }

  const addCriterion = () => {
    setFormData((prev) => ({
      ...prev,
      criteria: [
        ...prev.criteria,
        {
          name: '',
          levels: [
            { label: 'Excelente', score: 10 },
            { label: 'Bueno', score: 7 },
            { label: 'Regular', score: 5 },
            { label: 'Insuficiente', score: 1 },
          ],
        },
      ],
    }))
  }

  const removeCriterion = (criterionIndex) => {
    setFormData((prev) => ({
      ...prev,
      criteria: prev.criteria.filter((_, index) => index !== criterionIndex),
    }))
  }

  const validateForm = () => {
    if (!selectedSchoolId) return 'Selecciona una escuela'
    if (!formData.name.trim()) return 'El nombre de la plantilla es obligatorio'
    if (formData.criteria.length === 0) return 'Agrega al menos un criterio'

    for (const criterion of formData.criteria) {
      if (!criterion.name.trim()) return 'Cada criterio debe tener nombre'
      if (!criterion.levels || criterion.levels.length === 0) {
        return 'Cada criterio debe tener niveles'
      }

      for (const level of criterion.levels) {
        if (!String(level.label || '').trim()) return 'Todos los niveles deben tener etiqueta'
        if (Number.isNaN(Number(level.score))) return 'Todos los niveles deben tener puntaje numérico'
      }
    }

    return ''
  }

  const resetToCreateMode = () => {
    setIsEditMode(false)
    setSelectedTemplateId('')
    setFormData(buildEmptyForm())
    setError('')
    setSuccess('')
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    const payload = {
      schoolId: selectedSchoolId,
      name: formData.name.trim(),
      type: 'rubric',
      criteria: formData.criteria.map((criterion) => ({
        name: criterion.name.trim(),
        levels: criterion.levels.map((level) => ({
          label: String(level.label || '').trim(),
          score: Number(level.score),
        })),
      })),
      createdBy: authUser?.id,
    }

    setIsSaving(true)
    try {
      const endpoint = isEditMode && selectedTemplateId
        ? `${API_URL}/api/assessment-templates/update/${selectedTemplateId}`
        : `${API_URL}/api/assessment-templates/create`
      const method = isEditMode && selectedTemplateId ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar la plantilla')

      setSuccess(isEditMode ? 'Plantilla actualizada correctamente' : 'Plantilla creada correctamente')

      const refreshResponse = await fetch(`${API_URL}/api/assessment-templates/school/${selectedSchoolId}?type=rubric`)
      const refreshData = await refreshResponse.json().catch(() => [])
      const ownTemplates = (Array.isArray(refreshData) ? refreshData : []).filter(
        (template) => getCreatorId(template) === authUser?.id
      )
      setTemplates(ownTemplates)

      if (!isEditMode && data?._id) {
        setSelectedTemplateId(data._id)
      }
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Configuracion</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Crea, selecciona y edita plantillas de rubricas para tus clases.
        </p>
      </header>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        {!isLoadingSchools && !hasSchools && (
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Aun no tenes colegios creados. Crea un colegio desde Inicio para poder gestionar plantillas de rubricas.
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-zinc-700" htmlFor="settings-school-select">
              Escuela
            </label>
            <select
              id="settings-school-select"
              value={selectedSchoolId}
              onChange={(event) => setSelectedSchoolId(event.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              disabled={isLoadingSchools}
            >
              {isLoadingSchools ? (
                <option>Cargando escuelas...</option>
              ) : schools.length === 0 ? (
                <option value="">No hay escuelas disponibles</option>
              ) : (
                schools.map((school) => (
                  <option key={school._id} value={school._id}>
                    {school.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700" htmlFor="settings-template-select">
              Plantilla de rubrica seleccionada
            </label>
            <div className="mt-1 flex gap-2">
              <select
                id="settings-template-select"
                value={selectedTemplateId}
                onChange={(event) => setSelectedTemplateId(event.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                disabled={isLoadingTemplates || templates.length === 0}
              >
                <option value="">Selecciona una plantilla</option>
                {templates.map((template) => (
                  <option key={template._id} value={template._id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={resetToCreateMode}
                className="shrink-0 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Nueva
              </button>
            </div>
          </div>
        </div>
      </section>

      <form onSubmit={handleSave} className="mt-5 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-zinc-900">
            {isEditMode ? 'Editar plantilla' : 'Crear plantilla'}
          </h2>
          {isLoadingTemplates && <p className="text-xs text-zinc-500">Actualizando plantillas...</p>}
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-700" htmlFor="template-name">
            Nombre de la plantilla
          </label>
          <input
            id="template-name"
            type="text"
            value={formData.name}
            onChange={(event) => setField('name', event.target.value)}
            placeholder="Rubrica de exposicion oral"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
          />
        </div>

        <div className="mt-4 space-y-3">
          {formData.criteria.map((criterion, criterionIndex) => (
            <article key={`criterion-${criterionIndex}`} className="rounded-md border border-zinc-200 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={criterion.name}
                  onChange={(event) => setCriterionName(criterionIndex, event.target.value)}
                  placeholder={`Criterio ${criterionIndex + 1} (ej: Contenido)`}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                />
                <button
                  type="button"
                  onClick={() => removeCriterion(criterionIndex)}
                  disabled={formData.criteria.length <= 1}
                  className="shrink-0 rounded-md border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Quitar
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {criterion.levels.map((level, levelIndex) => (
                  <div key={`criterion-${criterionIndex}-level-${levelIndex}`} className="rounded border border-zinc-100 bg-zinc-50 p-2">
                    <label className="text-xs font-medium text-zinc-600">Nivel</label>
                    <input
                      type="text"
                      value={level.label}
                      onChange={(event) => setCriterionLevel(criterionIndex, levelIndex, 'label', event.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                    />

                    <label className="mt-2 block text-xs font-medium text-zinc-600">Puntaje</label>
                    <input
                      type="number"
                      value={level.score}
                      onChange={(event) => setCriterionLevel(criterionIndex, levelIndex, 'score', event.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                    />
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={addCriterion}
            disabled={!hasSchools}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Agregar criterio
          </button>

          <button
            type="submit"
            disabled={isSaving || !selectedSchoolId || !hasSchools}
            className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? 'Guardando...' : isEditMode ? 'Guardar cambios' : 'Crear plantilla'}
          </button>
        </div>

        {error && (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {success && (
          <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </p>
        )}
      </form>
    </main>
  )
}

export default TeacherSettingsPage
