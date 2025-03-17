import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const MobileMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path ? 'text-primary font-medium' : 'text-secondary';
  };
  
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };
  
  return (
    <div className="md:hidden">
      <button
        onClick={toggleMenu}
        className="flex items-center p-2 rounded-md hover:bg-gray-100 focus:outline-none"
        aria-label="Toggle menu"
      >
        <svg
          className="w-6 h-6 text-secondary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute top-16 left-0 right-0 bg-white shadow-md z-50">
          <div className="flex flex-col py-2">
            <Link
              to="/"
              className={`${isActive('/')} px-4 py-3 hover:bg-gray-50`}
              onClick={() => setIsOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/trip-planner"
              className={`${isActive('/trip-planner')} px-4 py-3 hover:bg-gray-50`}
              onClick={() => setIsOpen(false)}
            >
              Trip Planner
            </Link>
            <Link
              to="/eld-logs"
              className={`${isActive('/eld-logs')} px-4 py-3 hover:bg-gray-50`}
              onClick={() => setIsOpen(false)}
            >
              ELD Logs
            </Link>
            <Link
              to="/about"
              className={`${isActive('/about')} px-4 py-3 hover:bg-gray-50`}
              onClick={() => setIsOpen(false)}
            >
              About
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileMenu; 