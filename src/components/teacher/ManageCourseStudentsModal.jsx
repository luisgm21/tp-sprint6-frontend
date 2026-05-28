import { useCallback, useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'
import LoadingSpinner from '../common/LoadingSpinner'
import { API_URL } from '../../config/env'
import { safeJson } from '../../util/safeJson'

const getSchoolId = (course) => {
  if (!course?.schoolId) return ''
  if (typeof course.schoolId === 'object') return course.schoolId._id || ''
  return course.schoolId
}

const normalizeKey = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')

const getEnrollmentStudent = (enrollment) => {
  const student = enrollment?.studentId
  if (!student || typeof student !== 'object') return null
  return student
}

const extractStudentsFromWorkbook = (arrayBuffer) => {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) throw new Error('El archivo no contiene hojas')

  const worksheet = workbook.Sheets[firstSheetName]
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

  const firstNameAliases = ['firstname', 'nombre', 'name']
  const lastNameAliases = ['lastname', 'apellido', 'surname']
  const documentAliases = ['documentnumber', 'documento', 'dni', 'documentoidentidad', 'doc']

  return rows
    .map((row) => {
      const normalizedEntries = Object.entries(row).map(([key, value]) => [normalizeKey(key), String(value || '').trim()])
      const normalizedRow = Object.fromEntries(normalizedEntries)

      const firstName = firstNameAliases.map((key) => normalizedRow[key]).find(Boolean) || ''
      const lastName = lastNameAliases.map((key) => normalizedRow[key]).find(Boolean) || ''
      const documentNumber = documentAliases.map((key) => normalizedRow[key]).find(Boolean) || ''

      return {
        firstName,
        lastName,
        documentNumber,
      }
    })
    .filter((student) => student.firstName || student.lastName || student.documentNumber)
}

const ManageCourseStudentsModal = ({ open, onClose, course }) => {
  const [formData, setFormData] = useState({ firstName: '', lastName: '', documentNumber: '' })
  const [manualError, setManualError] = useState('')
  const [manualSuccess, setManualSuccess] = useState('')
  const [isSubmittingManual, setIsSubmittingManual] = useState(false)

  const [showExcelPopup, setShowExcelPopup] = useState(false)
  const [excelFile, setExcelFile] = useState(null)
  const [bulkError, setBulkError] = useState('')
  const [bulkSuccess, setBulkSuccess] = useState('')
  const [bulkResult, setBulkResult] = useState(null)
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false)

  const [enrollments, setEnrollments] = useState([])
  const [isLoadingEnrollments, setIsLoadingEnrollments] = useState(false)
  const [enrollmentsError, setEnrollmentsError] = useState('')
  const [dropError, setDropError] = useState('')
  const [dropSuccess, setDropSuccess] = useState('')
  const [droppingStudentId, setDroppingStudentId] = useState('')
  const [editingStudentId, setEditingStudentId] = useState('')
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', documentNumber: '' })
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false)

  const schoolId = useMemo(() => getSchoolId(course), [course])
  const year = useMemo(() => Number(course?.year) || new Date().getFullYear(), [course])

  const loadCourseEnrollments = useCallback(async () => {
    if (!course?._id) return

    setIsLoadingEnrollments(true)
    setEnrollmentsError('')

    try {
      const response = await fetch(`${API_URL}/api/enrollments/course/${course._id}`)
      const data = await safeJson(response, [])
      if (!response.ok) throw new Error(data.error || 'No se pudieron cargar los alumnos del curso')
      setEnrollments(Array.isArray(data) ? data : [])
    } catch (error) {
      setEnrollmentsError(error.message)
    } finally {
      setIsLoadingEnrollments(false)
    }
  }, [course?._id])

  useEffect(() => {
    if (!open) return
    loadCourseEnrollments()
  }, [open, loadCourseEnrollments])

  const resetMessages = () => {
    setManualError('')
    setManualSuccess('')
    setBulkError('')
    setBulkSuccess('')
    setDropError('')
    setDropSuccess('')
    setEditError('')
    setEditSuccess('')
  }

  const handleClose = () => {
    setShowExcelPopup(false)
    setExcelFile(null)
    setDroppingStudentId('')
    setEditingStudentId('')
    setEditForm({ firstName: '', lastName: '', documentNumber: '' })
    resetMessages()
    onClose?.()
  }

  const startEditingStudent = (student) => {
    if (!student?._id) return

    setEditError('')
    setEditSuccess('')
    setEditingStudentId(student._id)
    setEditForm({
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      documentNumber: student.documentNumber || '',
    })
  }

  const cancelEditingStudent = () => {
    setEditingStudentId('')
    setEditForm({ firstName: '', lastName: '', documentNumber: '' })
    setEditError('')
  }

  const handleEditFormChange = (event) => {
    const { name, value } = event.target
    setEditForm((prev) => ({ ...prev, [name]: value }))
    setEditError('')
    setEditSuccess('')
  }

  const handleSaveStudentEdit = async () => {
    if (!editingStudentId) return

    const payload = {
      firstName: editForm.firstName.trim(),
      lastName: editForm.lastName.trim(),
      documentNumber: editForm.documentNumber.trim(),
    }

    if (!payload.firstName || !payload.lastName || !payload.documentNumber) {
      setEditError('Completá nombre, apellido y documento para guardar')
      return
    }

    setEditError('')
    setEditSuccess('')
    setIsSubmittingEdit(true)

    try {
      const response = await fetch(`${API_URL}/api/students/update/${editingStudentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await safeJson(response, {})
      if (!response.ok) throw new Error(data.error || 'No se pudieron guardar los cambios del alumno')

      setEditSuccess('Datos del alumno actualizados correctamente.')
      setEditingStudentId('')
      setEditForm({ firstName: '', lastName: '', documentNumber: '' })
      await loadCourseEnrollments()
    } catch (error) {
      setEditError(error.message)
    } finally {
      setIsSubmittingEdit(false)
    }
  }

  const handleDropStudent = async (enrollment) => {
    const student = getEnrollmentStudent(enrollment)
    const studentId = student?._id
    if (!studentId) return

    const fullName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'este alumno'
    const result = await Swal.fire({
      title: '¿Quitar alumno?',
      text: `Se dará de baja a "${fullName}" de este curso.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#991b1b',
      cancelButtonColor: '#d4d4d8',
      confirmButtonText: 'Quitar',
      cancelButtonText: 'Cancelar',
    })
    if (!result.isConfirmed) return

    setDropError('')
    setDropSuccess('')
    setDroppingStudentId(studentId)

    try {
      const response = await fetch(`${API_URL}/api/enrollments/course/${course._id}/student/${studentId}/drop`, {
        method: 'PATCH',
      })

      const data = await safeJson(response, {})
      if (!response.ok) throw new Error(data.error || 'No se pudo quitar el alumno del curso')

      setDropSuccess('Alumno quitado del curso correctamente.')
      await loadCourseEnrollments()
    } catch (error) {
      setDropError(error.message)
    } finally {
      setDroppingStudentId('')
    }
  }

  const handleManualChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setManualError('')
    setManualSuccess('')
  }

  const handleManualSubmit = async (event) => {
    event.preventDefault()
    setManualError('')
    setManualSuccess('')

    const payload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      documentNumber: formData.documentNumber.trim(),
    }

    if (!payload.firstName || !payload.lastName || !payload.documentNumber) {
      setManualError('Completá nombre, apellido y documento')
      return
    }

    setIsSubmittingManual(true)
    try {
      const response = await fetch(`${API_URL}/api/enrollments/course/${course._id}/add-student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          year,
          student: payload,
        }),
      })
      const data = await safeJson(response, {})
      if (!response.ok) throw new Error(data.error || 'No se pudo agregar el alumno')

      setFormData({ firstName: '', lastName: '', documentNumber: '' })
      setManualSuccess(data.alreadyEnrolled ? 'El alumno ya estaba inscripto en este curso.' : 'Alumno agregado al curso correctamente.')
      await loadCourseEnrollments()
    } catch (error) {
      setManualError(error.message)
    } finally {
      setIsSubmittingManual(false)
    }
  }

  const downloadTemplate = () => {
    const rows = [
      { Nombre: 'Juan', Apellido: 'Perez', Documento: '12345678' },
      { Nombre: 'Ana', Apellido: 'Gomez', Documento: '87654321' },
    ]

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Alumnos')
    XLSX.writeFile(workbook, 'plantilla_alumnos.xlsx')
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null
    setExcelFile(file)
    setBulkError('')
    setBulkSuccess('')
    setBulkResult(null)
  }

  const handleBulkSubmit = async (event) => {
    event.preventDefault()
    setBulkError('')
    setBulkSuccess('')
    setBulkResult(null)

    if (!excelFile) {
      setBulkError('Seleccioná un archivo Excel')
      return
    }

    setIsSubmittingBulk(true)
    try {
      const arrayBuffer = await excelFile.arrayBuffer()
      const students = extractStudentsFromWorkbook(arrayBuffer)

      if (students.length === 0) {
        throw new Error('No se encontraron filas válidas en el archivo')
      }

      const response = await fetch(`${API_URL}/api/enrollments/course/${course._id}/add-students-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, year, students }),
      })

      const data = await safeJson(response, {})
      if (!response.ok) throw new Error(data.error || 'No se pudo importar el Excel')

      setBulkResult(data)
      setBulkSuccess('Importación finalizada')
      await loadCourseEnrollments()
    } catch (error) {
      setBulkError(error.message)
    } finally {
      setIsSubmittingBulk(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Gestionar alumnos del curso</h2>
            <p className="text-sm text-zinc-500">{course?.name}</p>
          </div>
          <button
            onClick={handleClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
          >
            ×
          </button>
        </div>

        <section className="rounded-lg border border-zinc-200 p-4">
          <h3 className="text-sm font-semibold text-zinc-800">Alumnos asociados</h3>
          <div className="mt-3 space-y-2">
            {isLoadingEnrollments ? <p className="text-sm text-zinc-500">Cargando alumnos...</p> : null}
            {enrollmentsError ? <p className="text-sm text-red-600">{enrollmentsError}</p> : null}
            {dropError ? <p className="text-sm text-red-600">{dropError}</p> : null}
            {dropSuccess ? <p className="text-sm text-emerald-600">{dropSuccess}</p> : null}
            {editError ? <p className="text-sm text-red-600">{editError}</p> : null}
            {editSuccess ? <p className="text-sm text-emerald-600">{editSuccess}</p> : null}

            {!isLoadingEnrollments && !enrollmentsError && enrollments.length === 0 ? (
              <p className="text-sm text-zinc-500">Todavía no hay alumnos asociados a este curso.</p>
            ) : null}

            {!isLoadingEnrollments && !enrollmentsError && enrollments.length > 0 ? (
              <ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
                {enrollments.map((enrollment) => {
                  const student = getEnrollmentStudent(enrollment)
                  if (!student) return null

                  const studentId = student._id || ''
                  const fullName = `${student.firstName || ''} ${student.lastName || ''}`.trim()
                  const isEditing = editingStudentId === studentId

                  return (
                    <li
                      key={enrollment._id || `${studentId}-${student.documentNumber || 'student'}`}
                      className="rounded-md border border-zinc-200 px-3 py-2"
                    >
                      {!isEditing ? (
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-zinc-800">{fullName || 'Alumno sin nombre'}</p>
                            <p className="text-xs text-zinc-500">Documento: {student.documentNumber || 'Sin documento'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isSubmittingEdit || droppingStudentId === studentId}
                              onClick={() => startEditingStudent(student)}
                              className="rounded-md border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              disabled={droppingStudentId === studentId || isSubmittingEdit}
                              onClick={() => handleDropStudent(enrollment)}
                              className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {droppingStudentId === studentId ? 'Quitando...' : 'Quitar'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <input
                              name="firstName"
                              value={editForm.firstName}
                              onChange={handleEditFormChange}
                              placeholder="Nombre"
                              className="rounded-md border border-zinc-300 px-2 py-1.5 text-xs outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                              disabled={isSubmittingEdit}
                            />
                            <input
                              name="lastName"
                              value={editForm.lastName}
                              onChange={handleEditFormChange}
                              placeholder="Apellido"
                              className="rounded-md border border-zinc-300 px-2 py-1.5 text-xs outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                              disabled={isSubmittingEdit}
                            />
                            <input
                              name="documentNumber"
                              value={editForm.documentNumber}
                              onChange={handleEditFormChange}
                              placeholder="Documento"
                              className="rounded-md border border-zinc-300 px-2 py-1.5 text-xs outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
                              disabled={isSubmittingEdit}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={cancelEditingStudent}
                              disabled={isSubmittingEdit}
                              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveStudentEdit}
                              disabled={isSubmittingEdit}
                              className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {isSubmittingEdit ? 'Guardando...' : 'Guardar'}
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </div>
        </section>

        <section className="mt-4 rounded-lg border border-zinc-200 p-4">
          <h3 className="text-sm font-semibold text-zinc-800">Agregar alumno individual</h3>
          <form onSubmit={handleManualSubmit} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              name="firstName"
              placeholder="Nombre"
              value={formData.firstName}
              onChange={handleManualChange}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              required
            />
            <input
              name="lastName"
              placeholder="Apellido"
              value={formData.lastName}
              onChange={handleManualChange}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              required
            />
            <input
              name="documentNumber"
              placeholder="Documento"
              value={formData.documentNumber}
              onChange={handleManualChange}
              className="sm:col-span-2 rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              required
            />
            {manualError && <p className="sm:col-span-2 text-sm text-red-600">{manualError}</p>}
            {manualSuccess && <p className="sm:col-span-2 text-sm text-emerald-600">{manualSuccess}</p>}
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingManual}
                className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmittingManual ? <LoadingSpinner inline tone="light" size="sm" text="Guardando..." /> : 'Agregar alumno'}
              </button>
            </div>
          </form>
        </section>

        <section className="mt-4 rounded-lg border border-zinc-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-zinc-800">Carga masiva por Excel</h3>
              <p className="text-xs text-zinc-500">Subí un archivo con Nombre, Apellido y Documento</p>
            </div>
            <button
              type="button"
              onClick={() => setShowExcelPopup(true)}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Abrir popup Excel
            </button>
          </div>
          {bulkSuccess && <p className="mt-2 text-sm text-emerald-600">{bulkSuccess}</p>}
          {bulkResult && (
            <p className="mt-1 text-xs text-zinc-600">
              Total: {bulkResult.total} | Alumnos nuevos: {bulkResult.createdStudents} | Inscripciones nuevas: {bulkResult.createdEnrollments} | Ya inscriptos: {bulkResult.alreadyEnrolled} | Errores: {bulkResult.errors}
            </p>
          )}
        </section>

        {showExcelPopup && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/45 px-4">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-zinc-900">Importar alumnos por Excel</h3>
                  <p className="text-sm text-zinc-500">Descargá la plantilla y luego subí el archivo completo.</p>
                </div>
                <button
                  onClick={() => setShowExcelPopup(false)}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleBulkSubmit} className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    Descargar plantilla
                  </button>
                  <label className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer">
                    Elegir archivo
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-zinc-500">{excelFile ? excelFile.name : 'Sin archivo seleccionado'}</span>
                </div>

                {bulkError && <p className="text-sm text-red-600">{bulkError}</p>}

                {bulkResult?.results?.some((item) => item.status === 'error') && (
                  <div className="max-h-40 overflow-y-auto rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                    {bulkResult.results
                      .filter((item) => item.status === 'error')
                      .slice(0, 10)
                      .map((item, index) => (
                        <p key={`${item.documentNumber}-${index}`}>
                          {item.firstName} {item.lastName} ({item.documentNumber || 'sin documento'}): {item.error}
                        </p>
                      ))}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowExcelPopup(false)}
                    className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingBulk}
                    className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmittingBulk ? <LoadingSpinner inline tone="light" size="sm" text="Importando..." /> : 'Importar alumnos'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ManageCourseStudentsModal
