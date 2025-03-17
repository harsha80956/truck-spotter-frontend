import { Link, useLocation } from 'react-router-dom'
import MobileMenu from './MobileMenu'

const Navbar = () => {
  const location = useLocation()
  
  const isActive = (path: string) => {
    return location.pathname === path ? 'text-primary font-medium' : 'text-secondary hover:text-primary'
  }

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <span className="text-xl font-bold text-primary">TruckSpotter</span>
            </Link>
          </div>
          
          <div className="hidden md:block">
            <div className="flex items-center space-x-8">
              <Link to="/" className={`${isActive('/')} transition-colors duration-200`}>
                Home
              </Link>
              <Link to="/trip-planner" className={`${isActive('/trip-planner')} transition-colors duration-200`}>
                Trip Planner
              </Link>
              <Link to="/eld-logs" className={`${isActive('/eld-logs')} transition-colors duration-200`}>
                ELD Logs
              </Link>
              <Link to="/about" className={`${isActive('/about')} transition-colors duration-200`}>
                About
              </Link>
            </div>
          </div>
          
          <MobileMenu />
        </nav>
      </div>
    </header>
  )
}

export default Navbar 