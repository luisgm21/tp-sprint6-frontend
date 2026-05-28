import { NavLink, useNavigate } from "react-router"
import { useAppContext } from "../../context/appContext"

const defaultConfig = {
  brand: {
    label: "Mi Sitio",
    to: "/",
  },
  links: [
    { to: "/", label: "Inicio" },
    { to: "/about", label: "Nosotros" },
    { to: "/contact", label: "Contacto" },
  ],
}

const Navbar = ({ config = defaultConfig }) => {
  const navigate = useNavigate()
  const { authUser, isAuthenticated, logout, isDarkMode, toggleDarkMode } = useAppContext()
  const { brand, links = [] } = config

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="w-full border-b border-zinc-200 bg-zinc-50">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <NavLink
          to={brand?.to || "/"}
          className="text-base font-medium tracking-wide text-zinc-800 transition-colors hover:text-zinc-950"
        >
          {brand?.label || "Marca"}
        </NavLink>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleDarkMode}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            aria-label={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
            title={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
          >
            {isDarkMode ? 'Claro' : 'Oscuro'}
          </button>

          <ul className="flex items-center gap-1 sm:gap-2">
            {links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) =>
                    [
                      "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-zinc-200 text-zinc-900"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                    ].join(" ")
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>

          {isAuthenticated && (
            <div className="flex items-center gap-2 border-l border-zinc-300 pl-3">
              <span className="max-w-36 truncate text-sm font-medium text-zinc-700" title={authUser?.name || 'Usuario'}>
                {authUser?.name || 'Usuario'}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  )
}

export default Navbar