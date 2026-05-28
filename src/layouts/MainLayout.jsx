import { Outlet } from "react-router"
import Navbar from "../components/pageComponents/Navbar"
import Footer from "../components/pageComponents/Footer"
import { useAppContext } from "../context/appContext"

const MainLayout = () => {
  const { isAuthenticated, authUser } = useAppContext()

  const homePath = !isAuthenticated
    ? "/login"
    : authUser?.role === "admin"
      ? "/admin/users"
      : "/teacher/dashboard"

  const navConfig = {
    brand: {
      label: "Minimal",
      to: homePath,
    },
    links: isAuthenticated
      ? [
          { to: homePath, label: "Inicio" },
          ...(authUser?.role === "teacher" ? [{ to: "/teacher/settings", label: "Configuracion" }] : []),
        ]
      : [{ to: homePath, label: "Inicio" }],
  }

  return (
    <div className="min-h-screen w-full flex flex-col">
      <Navbar config={navConfig} />
        <Outlet />
      <Footer />
    </div>
  )
}

export default MainLayout