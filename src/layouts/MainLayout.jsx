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
    links: [
      { to: homePath, label: "Inicio" },
      { to: "/teacher/settings", label: "Configuracion" },
    ],
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