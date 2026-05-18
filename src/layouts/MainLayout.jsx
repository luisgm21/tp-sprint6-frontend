import { Outlet } from "react-router"
import Navbar from "../components/pageComponents/Navbar"
import Footer from "../components/pageComponents/Footer"

const MainLayout = () => {
  const navConfig = {
    brand: {
      label: "Minimal",
      to: "/",
    },
    links: [
      { to: "/", label: "Inicio" },
      { to: "/servicios", label: "Servicios" },
      { to: "/contacto", label: "Contacto" },
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