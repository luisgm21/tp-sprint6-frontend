import { NavLink } from "react-router"

const defaultConfig = {
  brand: {
    label: "Mi Sitio",
    to: "/",
  },
  description: "Construyendo experiencias web limpias y funcionales.",
  email: "contacto@misitio.com",
  githubUrl: "https://github.com/luisgm",
  copy: "© 2026 Mi Sitio. Todos los derechos reservados.",
}

const Footer = ({ config = defaultConfig }) => {
  const { brand, description, email, githubUrl, copy } = config

  return (
    <footer className="mt-auto w-full border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <NavLink
            to={brand?.to || "/"}
            className="text-base font-medium tracking-wide text-zinc-800 transition-colors hover:text-zinc-950"
          >
            {brand?.label || "Marca"}
          </NavLink>
        </div>

        <div className="grid gap-3 text-sm text-zinc-600 sm:grid-cols-2">
          <p>{description}</p>
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <a
              href={`mailto:${email}`}
              className="transition-colors hover:text-zinc-900"
            >
              {email}
            </a>
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            >
              GitHub
            </a>
          </div>
        </div>

        <p className="text-xs text-zinc-500">{copy}</p>
      </div>
    </footer>
  )
}

export default Footer