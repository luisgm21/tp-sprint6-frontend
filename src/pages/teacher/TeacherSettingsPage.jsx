import { useEffect, useMemo, useState } from 'react'
import { useAppContext } from '../../context/appContext'
import { updateUserSchema, zodToFieldErrors } from '../../validators/authValidators'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const defaultLevels = [
  { label: 'Excelente', score: 10 },
  { label: 'Bueno', score: 7 },
  { label: 'Regular', score: 5 },
  { label: 'Insuficiente', score: 1 },
]

const buildDefaultCriteria = () => [
  {
    name: '',
    levels: defaultLevels.map((level) => ({ ...level })),
  },
]

const buildEmptyForm = () => ({
  name: '',
  criteria: buildDefaultCriteria(),
})

const getCreatorId = (template) => {
  if (!template?.createdBy) return ''
  if (typeof template.createdBy === 'string') return template.createdBy
  return template.createdBy._id || template.createdBy.id || ''
}

const cloneCriteria = (criteria = []) => {
  if (!Array.isArray(criteria) || criteria.length === 0) return buildDefaultCriteria()
  return criteria.map((criterion) => ({
    name: criterion.name || '',
    levels: (criterion.levels || []).map((level) => ({
      label: level.label || '',
      score: Number(level.score) || 0,
    })),
  }))
}

const RubricSection = ({
  title,
  subtitle,
  templates,
  selectedTemplateId,
  setSelectedTemplateId,
  formData,
  setFormData,
  isEditMode,
  setIsEditMode,
  isLoading,
  isSaving,
  error,
  success,
  onSave,
  disableEdition,
  emptyTemplatesMessage,
  sectionKey,
}) => {
  const setCriterionName = (criterionIndex, value) => {
    setFormData((prev) => ({
      ...prev,
      criteria: prev.criteria.map((criterion, index) => (
        index === criterionIndex ? { ...criterion, name: value } : criterion
      )),
    }))
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
  }

  const addCriterion = () => {
    setFormData((prev) => ({
      ...prev,
      criteria: [
        ...prev.criteria,
        {
          name: '',
          levels: defaultLevels.map((level) => ({ ...level })),
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

  const resetToCreateMode = () => {
    setIsEditMode(false)
    setSelectedTemplateId('')
    setFormData(buildEmptyForm())
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
        </div>
        {isLoading && <p className="text-xs text-zinc-500">Cargando plantillas...</p>}
      </div>

      <div className="mb-4">
        <label className="text-sm font-medium text-zinc-700" htmlFor={`${sectionKey}-template-select`}>
          Plantilla seleccionada
        </label>
        <div className="mt-1 flex gap-2">
          <select
            id={`${sectionKey}-template-select`}
            value={selectedTemplateId}
            onChange={(event) => setSelectedTemplateId(event.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            disabled={disableEdition || isLoading || templates.length === 0}
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
            disabled={disableEdition}
            className="shrink-0 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Nueva
          </button>
        </div>
        {!isLoading && templates.length === 0 && (
          <p className="mt-2 text-xs text-zinc-500">{emptyTemplatesMessage}</p>
        )}
      </div>

      <form onSubmit={onSave}>
        <div>
          <label className="text-sm font-medium text-zinc-700" htmlFor={`${sectionKey}-template-name`}>
            Nombre de la plantilla
          </label>
          <input
            id={`${sectionKey}-template-name`}
            type="text"
            value={formData.name}
            onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Rubrica de exposicion oral"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            disabled={disableEdition}
          />
        </div>

        <div className="mt-4 space-y-3">
          {formData.criteria.map((criterion, criterionIndex) => (
            <article key={`${sectionKey}-criterion-${criterionIndex}`} className="rounded-md border border-zinc-200 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={criterion.name}
                  onChange={(event) => setCriterionName(criterionIndex, event.target.value)}
                  placeholder={`Criterio ${criterionIndex + 1} (ej: Contenido)`}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                  disabled={disableEdition}
                />
                <button
                  type="button"
                  onClick={() => removeCriterion(criterionIndex)}
                  disabled={disableEdition || formData.criteria.length <= 1}
                  className="shrink-0 rounded-md border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Quitar
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {criterion.levels.map((level, levelIndex) => (
                  <div key={`${sectionKey}-criterion-${criterionIndex}-level-${levelIndex}`} className="rounded border border-zinc-100 bg-zinc-50 p-2">
                    <label className="text-xs font-medium text-zinc-600">Nivel</label>
                    <input
                      type="text"
                      value={level.label}
                      onChange={(event) => setCriterionLevel(criterionIndex, levelIndex, 'label', event.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                      disabled={disableEdition}
                    />

                    <label className="mt-2 block text-xs font-medium text-zinc-600">Puntaje</label>
                    <input
                      type="number"
                      value={level.score}
                      onChange={(event) => setCriterionLevel(criterionIndex, levelIndex, 'score', event.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                      disabled={disableEdition}
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
            disabled={disableEdition}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Agregar criterio
          </button>

          <button
            type="submit"
            disabled={disableEdition || isSaving}
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
    </section>
  )
}

const TeacherSettingsPage = () => {
  const { authUser, token, logout, updateAuthUser } = useAppContext()
  const [activeTab, setActiveTab] = useState('profile')
  const [activeRubricTab, setActiveRubricTab] = useState('general')
  const [profileData, setProfileData] = useState({ name: '', email: '' })
  const [profileFieldErrors, setProfileFieldErrors] = useState({})
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  const [schools, setSchools] = useState([])
  const [selectedSchoolId, setSelectedSchoolId] = useState('')
  const [isLoadingSchools, setIsLoadingSchools] = useState(true)
  const [schoolsError, setSchoolsError] = useState('')

  const [generalTemplates, setGeneralTemplates] = useState([])
  const [generalSelectedTemplateId, setGeneralSelectedTemplateId] = useState('')
  const [generalFormData, setGeneralFormData] = useState(buildEmptyForm())
  const [generalIsEditMode, setGeneralIsEditMode] = useState(false)
  const [generalLoading, setGeneralLoading] = useState(false)
  const [generalSaving, setGeneralSaving] = useState(false)
  const [generalError, setGeneralError] = useState('')
  const [generalSuccess, setGeneralSuccess] = useState('')

  const [schoolTemplates, setSchoolTemplates] = useState([])
  const [schoolSelectedTemplateId, setSchoolSelectedTemplateId] = useState('')
  const [schoolFormData, setSchoolFormData] = useState(buildEmptyForm())
  const [schoolIsEditMode, setSchoolIsEditMode] = useState(false)
  const [schoolLoading, setSchoolLoading] = useState(false)
  const [schoolSaving, setSchoolSaving] = useState(false)
  const [schoolError, setSchoolError] = useState('')
  const [schoolSuccess, setSchoolSuccess] = useState('')

  const hasSchools = schools.length > 0
  const authUserId = authUser?.id || authUser?._id || ''

  const selectedSchool = useMemo(
    () => schools.find((school) => school._id === selectedSchoolId) || null,
    [schools, selectedSchoolId]
  )

  const selectedGeneralTemplate = useMemo(
    () => generalTemplates.find((template) => template._id === generalSelectedTemplateId) || null,
    [generalTemplates, generalSelectedTemplateId]
  )

  const selectedSchoolTemplate = useMemo(
    () => schoolTemplates.find((template) => template._id === schoolSelectedTemplateId) || null,
    [schoolTemplates, schoolSelectedTemplateId]
  )

  const filterOwnTemplates = (templates) => {
    return (Array.isArray(templates) ? templates : []).filter(
      (template) => getCreatorId(template) === authUserId
    )
  }

  useEffect(() => {
    setProfileData({
      name: authUser?.name || '',
      email: authUser?.email || '',
    })
  }, [authUser?.name, authUser?.email])

  const fetchSchools = async () => {
    setIsLoadingSchools(true)
    setSchoolsError('')
    try {
      const response = await fetch(`${API_URL}/api/schools/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json().catch(() => [])
      if (response.status === 401 || response.status === 403) {
        logout()
        return
      }
      if (!response.ok) throw new Error(data.error || 'No se pudieron cargar tus colegios')

      setSchools(Array.isArray(data) ? data : [])
      if (Array.isArray(data) && data.length > 0) {
        setSelectedSchoolId((current) => current || data[0]._id)
      } else {
        setSelectedSchoolId('')
      }
    } catch (error) {
      setSchoolsError(error.message)
    } finally {
      setIsLoadingSchools(false)
    }
  }

  const fetchGeneralTemplates = async () => {
    setGeneralLoading(true)
    setGeneralError('')
    try {
      const response = await fetch(`${API_URL}/api/assessment-templates/global?type=rubric`)
      const data = await response.json().catch(() => [])
      if (!response.ok) throw new Error(data.error || 'No se pudieron cargar las rubricas generales')

      const own = filterOwnTemplates(data)
      setGeneralTemplates(own)

      const saved = localStorage.getItem('selected-general-rubric-template') || ''
      const exists = own.some((template) => template._id === saved)
      setGeneralSelectedTemplateId(exists ? saved : '')
    } catch (error) {
      setGeneralError(error.message)
    } finally {
      setGeneralLoading(false)
    }
  }

  const fetchSchoolTemplates = async (schoolId) => {
    if (!schoolId) {
      setSchoolTemplates([])
      setSchoolSelectedTemplateId('')
      return
    }

    setSchoolLoading(true)
    setSchoolError('')
    try {
      const response = await fetch(`${API_URL}/api/assessment-templates/school/${schoolId}?type=rubric`)
      const data = await response.json().catch(() => [])
      if (!response.ok) throw new Error(data.error || 'No se pudieron cargar las rubricas del colegio')

      const own = filterOwnTemplates(data)
      setSchoolTemplates(own)

      const saved = localStorage.getItem(`selected-rubric-template:${schoolId}`) || ''
      const exists = own.some((template) => template._id === saved)
      setSchoolSelectedTemplateId(exists ? saved : '')
    } catch (error) {
      setSchoolError(error.message)
    } finally {
      setSchoolLoading(false)
    }
  }

  useEffect(() => {
    fetchSchools()
    fetchGeneralTemplates()
  }, [])

  useEffect(() => {
    fetchSchoolTemplates(selectedSchoolId)
    setSchoolFormData(buildEmptyForm())
    setSchoolIsEditMode(false)
    setSchoolSuccess('')
  }, [selectedSchoolId, authUser?.id])

  useEffect(() => {
    if (!selectedGeneralTemplate) return
    setGeneralFormData({
      name: selectedGeneralTemplate.name || '',
      criteria: cloneCriteria(selectedGeneralTemplate.criteria),
    })
    setGeneralIsEditMode(true)
    setGeneralSuccess('')
    setGeneralError('')
    localStorage.setItem('selected-general-rubric-template', selectedGeneralTemplate._id)
  }, [selectedGeneralTemplate])

  useEffect(() => {
    if (!selectedSchoolTemplate) return
    setSchoolFormData({
      name: selectedSchoolTemplate.name || '',
      criteria: cloneCriteria(selectedSchoolTemplate.criteria),
    })
    setSchoolIsEditMode(true)
    setSchoolSuccess('')
    setSchoolError('')
    localStorage.setItem(`selected-rubric-template:${selectedSchoolId}`, selectedSchoolTemplate._id)
  }, [selectedSchoolTemplate, selectedSchoolId])

  const validateForm = (formData, requireSchoolId = false) => {
    if (requireSchoolId && !selectedSchoolId) return 'Selecciona un colegio'
    if (!formData.name.trim()) return 'El nombre de la plantilla es obligatorio'
    if (formData.criteria.length === 0) return 'Agrega al menos un criterio'

    for (const criterion of formData.criteria) {
      if (!criterion.name.trim()) return 'Cada criterio debe tener nombre'
      if (!criterion.levels || criterion.levels.length === 0) return 'Cada criterio debe tener niveles'

      for (const level of criterion.levels) {
        if (!String(level.label || '').trim()) return 'Todos los niveles deben tener etiqueta'
        if (Number.isNaN(Number(level.score))) return 'Todos los niveles deben tener puntaje numérico'
      }
    }

    return ''
  }

  const saveTemplate = async ({
    section,
    formData,
    isEditMode,
    selectedTemplateId,
    schoolId,
  }) => {
    const payload = {
      schoolId: schoolId || null,
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

    if (section === 'general') {
      await fetchGeneralTemplates()
      setGeneralSuccess(isEditMode ? 'Rubrica general actualizada correctamente' : 'Rubrica general creada correctamente')
      setGeneralError('')
      if (!isEditMode && data?._id) setGeneralSelectedTemplateId(data._id)
    }

    if (section === 'school') {
      await fetchSchoolTemplates(schoolId)
      setSchoolSuccess(isEditMode ? 'Rubrica del colegio actualizada correctamente' : 'Rubrica del colegio creada correctamente')
      setSchoolError('')
      if (!isEditMode && data?._id) setSchoolSelectedTemplateId(data._id)
    }
  }

  const handleSaveGeneral = async (event) => {
    event.preventDefault()
    setGeneralError('')
    setGeneralSuccess('')

    const validationError = validateForm(generalFormData, false)
    if (validationError) {
      setGeneralError(validationError)
      return
    }

    setGeneralSaving(true)
    try {
      await saveTemplate({
        section: 'general',
        formData: generalFormData,
        isEditMode: generalIsEditMode,
        selectedTemplateId: generalSelectedTemplateId,
        schoolId: null,
      })
    } catch (error) {
      setGeneralError(error.message)
    } finally {
      setGeneralSaving(false)
    }
  }

  const handleSaveSchool = async (event) => {
    event.preventDefault()
    setSchoolError('')
    setSchoolSuccess('')

    const validationError = validateForm(schoolFormData, true)
    if (validationError) {
      setSchoolError(validationError)
      return
    }

    setSchoolSaving(true)
    try {
      await saveTemplate({
        section: 'school',
        formData: schoolFormData,
        isEditMode: schoolIsEditMode,
        selectedTemplateId: schoolSelectedTemplateId,
        schoolId: selectedSchoolId,
      })
    } catch (error) {
      setSchoolError(error.message)
    } finally {
      setSchoolSaving(false)
    }
  }

  const handleProfileChange = (event) => {
    const { name, value } = event.target
    setProfileData((prev) => ({ ...prev, [name]: value }))
    setProfileFieldErrors((prev) => ({ ...prev, [name]: '' }))
    setProfileError('')
    setProfileSuccess('')
  }

  const handleSaveProfile = async (event) => {
    event.preventDefault()
    setProfileError('')
    setProfileSuccess('')

    const payload = {
      name: profileData.name,
      email: profileData.email,
      role: authUser?.role || 'teacher',
    }

    const validationResult = updateUserSchema.safeParse(payload)
    if (!validationResult.success) {
      setProfileFieldErrors(zodToFieldErrors(validationResult.error))
      return
    }

    if (!authUserId) {
      setProfileError('No se pudo identificar al usuario logueado')
      return
    }

    setIsSavingProfile(true)
    try {
      const response = await fetch(`${API_URL}/api/users/update/${authUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: payload.name.trim(),
          email: payload.email.trim(),
          role: payload.role,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (response.status === 401 || response.status === 403) {
        logout()
        return
      }

      if (!response.ok) {
        throw new Error(data.error || 'No se pudieron actualizar tus datos')
      }

      updateAuthUser({
        ...authUser,
        name: data?.name || payload.name.trim(),
        email: data?.email || payload.email.trim(),
      })

      setProfileSuccess('Tus datos se actualizaron correctamente')
      setProfileFieldErrors({})
    } catch (error) {
      setProfileError(error.message)
    } finally {
      setIsSavingProfile(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Configuracion</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Gestiona tu perfil docente y tus plantillas de rubrica desde pestañas separadas.
        </p>
      </header>

      <div className="mb-5 inline-flex w-full max-w-xl rounded-lg border border-zinc-200 bg-white p-1 shadow-sm" role="tablist" aria-label="Pestañas de configuración">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'profile'}
          onClick={() => setActiveTab('profile')}
          className={`w-full rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-zinc-800 text-white' : 'text-zinc-700 hover:bg-zinc-100'}`}
        >
          Mis datos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'rubrics'}
          onClick={() => setActiveTab('rubrics')}
          className={`w-full rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'rubrics' ? 'bg-zinc-800 text-white' : 'text-zinc-700 hover:bg-zinc-100'}`}
        >
          Rubricas
        </button>
      </div>

      <div className="space-y-5">
        {activeTab === 'profile' && (
          <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm" role="tabpanel" aria-label="Pestaña Mis datos">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-zinc-900">Mis datos</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Actualiza tu nombre y correo electronico para mantener tu perfil al dia.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4" noValidate>
            <div>
              <label className="text-sm font-medium text-zinc-700" htmlFor="profile-name">
                Nombre
              </label>
              <input
                id="profile-name"
                name="name"
                type="text"
                value={profileData.name}
                onChange={handleProfileChange}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                disabled={isSavingProfile}
              />
              {profileFieldErrors.name && (
                <p className="mt-1 text-xs text-red-600">{profileFieldErrors.name}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-700" htmlFor="profile-email">
                Email
              </label>
              <input
                id="profile-email"
                name="email"
                type="email"
                value={profileData.email}
                onChange={handleProfileChange}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                disabled={isSavingProfile}
              />
              {profileFieldErrors.email && (
                <p className="mt-1 text-xs text-red-600">{profileFieldErrors.email}</p>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-zinc-500">Rol actual: {authUser?.role === 'admin' ? 'Administrador' : 'Docente'}</p>
              <button
                type="submit"
                disabled={isSavingProfile}
                className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingProfile ? 'Guardando...' : 'Guardar datos'}
              </button>
            </div>

            {profileError && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {profileError}
              </p>
            )}

            {profileSuccess && (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {profileSuccess}
              </p>
            )}
          </form>
          </section>
        )}

        {activeTab === 'rubrics' && (
          <section className="space-y-4" role="tabpanel" aria-label="Pestaña Rubricas">
            <div className="inline-flex w-full max-w-md rounded-lg border border-zinc-200 bg-white p-1 shadow-sm" role="tablist" aria-label="Subpestañas de rúbricas">
              <button
                type="button"
                role="tab"
                aria-selected={activeRubricTab === 'general'}
                onClick={() => setActiveRubricTab('general')}
                className={`w-full rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeRubricTab === 'general' ? 'bg-zinc-800 text-white' : 'text-zinc-700 hover:bg-zinc-100'}`}
              >
                Generales
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeRubricTab === 'school'}
                onClick={() => setActiveRubricTab('school')}
                className={`w-full rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeRubricTab === 'school' ? 'bg-zinc-800 text-white' : 'text-zinc-700 hover:bg-zinc-100'}`}
              >
                Por colegio
              </button>
            </div>

            {activeRubricTab === 'general' && (
              <div>
                <RubricSection
                  title="Rubricas generales"
                  subtitle="Estas plantillas no dependen de un colegio en particular."
                  templates={generalTemplates}
                  selectedTemplateId={generalSelectedTemplateId}
                  setSelectedTemplateId={setGeneralSelectedTemplateId}
                  formData={generalFormData}
                  setFormData={setGeneralFormData}
                  isEditMode={generalIsEditMode}
                  setIsEditMode={setGeneralIsEditMode}
                  isLoading={generalLoading}
                  isSaving={generalSaving}
                  error={generalError}
                  success={generalSuccess}
                  onSave={handleSaveGeneral}
                  disableEdition={false}
                  emptyTemplatesMessage="No tienes rubricas generales creadas."
                  sectionKey="general"
                />
              </div>
            )}

            {activeRubricTab === 'school' && (
              <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                {schoolsError && (
                  <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {schoolsError}
                  </p>
                )}

                {!isLoadingSchools && !hasSchools && (
                  <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    Aun no tenes colegios creados. Crea un colegio desde Inicio para habilitar la seccion por colegio.
                  </p>
                )}

                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-zinc-900">Rubricas por colegio</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Selecciona un colegio y modifica sus plantillas de rubrica.
                  </p>
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium text-zinc-700" htmlFor="settings-school-select">
                    Colegio
                  </label>
                  <select
                    id="settings-school-select"
                    value={selectedSchoolId}
                    onChange={(event) => setSelectedSchoolId(event.target.value)}
                    disabled={isLoadingSchools || !hasSchools}
                    className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                  >
                    {isLoadingSchools ? (
                      <option value="">Cargando colegios...</option>
                    ) : !hasSchools ? (
                      <option value="">Sin colegios creados</option>
                    ) : (
                      schools.map((school) => (
                        <option key={school._id} value={school._id}>
                          {school.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <RubricSection
                  title={selectedSchool ? `Seccion de ${selectedSchool.name}` : 'Seccion de colegio'}
                  subtitle="Solo se muestran las rubricas creadas por el docente logueado para este colegio."
                  templates={schoolTemplates}
                  selectedTemplateId={schoolSelectedTemplateId}
                  setSelectedTemplateId={setSchoolSelectedTemplateId}
                  formData={schoolFormData}
                  setFormData={setSchoolFormData}
                  isEditMode={schoolIsEditMode}
                  setIsEditMode={setSchoolIsEditMode}
                  isLoading={schoolLoading}
                  isSaving={schoolSaving}
                  error={schoolError}
                  success={schoolSuccess}
                  onSave={handleSaveSchool}
                  disableEdition={!hasSchools}
                  emptyTemplatesMessage="No tienes rubricas creadas para este colegio."
                  sectionKey="school"
                />
              </section>
            )}
          </section>
        )}
      </div>
    </main>
  )
}

export default TeacherSettingsPage
