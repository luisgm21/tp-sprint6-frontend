const ROLE_LABELS = {
  user: 'Usuario',
  student: 'Estudiante',
  teacher: 'Docente',
  admin: 'Administrador',
}

const ROLE_BADGE = {
  user: 'bg-zinc-100 text-zinc-700',
  student: 'bg-blue-100 text-blue-700',
  teacher: 'bg-amber-100 text-amber-700',
  admin: 'bg-purple-100 text-purple-700',
}

const UserTable = ({ users, onEdit, onDeactivate, onDelete, currentUserId }) => {
  if (users.length === 0) {
    return <p className="py-8 text-center text-sm text-zinc-500">No hay usuarios registrados.</p>
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
          <tr>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Rol</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 bg-white">
          {users.map((user) => (
            <tr key={user._id} className="hover:bg-zinc-50 transition-colors">
              <td className="px-4 py-3 font-medium text-zinc-900">{user.name}</td>
              <td className="px-4 py-3 text-zinc-600">{user.email}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[user.role] || ROLE_BADGE.user}`}>
                  {ROLE_LABELS[user.role] || user.role}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${user.isDeleted ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                  {user.isDeleted ? 'Inactivo' : 'Activo'}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onEdit(user)}
                    className="rounded px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
                  >
                    Editar
                  </button>
                  {!user.isDeleted && user._id !== currentUserId && (
                    <button
                      onClick={() => onDeactivate(user._id)}
                      className="rounded px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                    >
                      Desactivar
                    </button>
                  )}
                  {user._id !== currentUserId && (
                    <button
                      onClick={() => onDelete(user._id)}
                      className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default UserTable
