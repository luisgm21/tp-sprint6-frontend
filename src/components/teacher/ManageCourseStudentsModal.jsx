import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import LoadingSpinner from '../common/LoadingSpinner'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const getSchoolId = (course) => {
  if (!course?.schoolId) return ''
  if (typeof course.schoolId === 'object') return course.schoolId._id || ''
  return course.schoolId
}

const normalizeKey = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')

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

  const schoolId = useMemo(() => getSchoolId(course), [course])
  const year = useMemo(() => Number(course?.year) || new Date().getFullYear(), [course])

  if (!open) return null

  const resetMessages = () => {
    setManualError('')
    setManualSuccess('')
    setBulkError('')
    setBulkSuccess('')
  }

  const handleClose = () => {
    setShowExcelPopup(false)
    setExcelFile(null)
    resetMessages()
    onClose?.()
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
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo agregar el alumno')

      setFormData({ firstName: '', lastName: '', documentNumber: '' })
      setManualSuccess(data.alreadyEnrolled ? 'El alumno ya estaba inscripto en este curso.' : 'Alumno agregado al curso correctamente.')
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

      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo importar el Excel')

      setBulkResult(data)
      setBulkSuccess('Importación finalizada')
    } catch (error) {
      setBulkError(error.message)
    } finally {
      setIsSubmittingBulk(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
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
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-4">
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
