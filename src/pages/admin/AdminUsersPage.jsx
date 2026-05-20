import { useState } from 'react'
import { useAppContext } from '../../context/appContext'
import { useUsers } from '../../hooks/useUsers'
import UserTable from '../../components/admin/UserTable'
import EditUserModal from '../../components/admin/EditUserModal'
import LoadingSpinner from '../../components/common/LoadingSpinner'

const AdminUsersPage = () => {
  const { authUser } = useAppContext()
  const { users, isLoading, error, updateUser, deactivateUser, deleteUser } = useUsers()

  const [editingUser, setEditingUser] = useState(null)
  const [actionError, setActionError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const handleSave = async (id, data) => {
    setActionLoading(true)
    setActionError('')
    try {
      await updateUser(id, data)
      setEditingUser(null)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeactivate = async (id) => {
    try {
      await deactivateUser(id)
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteUser(id)
      setConfirmDelete(null)
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Panel de administración</h1>
        <p className="mt-1 text-sm text-zinc-500">Gestión de usuarios del sistema</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner text="Cargando usuarios..." size="lg" />
        </div>
      ) : (
        <UserTable
          users={users}
          onEdit={setEditingUser}
          onDeactivate={handleDeactivate}
          onDelete={(id) => setConfirmDelete(id)}
          currentUserId={authUser?.id}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => { setEditingUser(null); setActionError('') }}
          onSave={handleSave}
          isLoading={actionLoading}
          error={actionError}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-base font-semibold text-zinc-900">¿Eliminar usuario?</h2>
            <p className="mt-1 text-sm text-zinc-500">Esta acción no se puede deshacer.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default AdminUsersPage
