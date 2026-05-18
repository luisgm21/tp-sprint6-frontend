import { NavLink } from "react-router"

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
  const { brand, links = [] } = config

  return (
    <header className="w-full border-b border-zinc-200 bg-zinc-50">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <NavLink
          to={brand?.to || "/"}
          className="text-base font-medium tracking-wide text-zinc-800 transition-colors hover:text-zinc-950"
        >
          {brand?.label || "Marca"}
        </NavLink>

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
      </nav>
    </header>
  )
}

export default Navbar