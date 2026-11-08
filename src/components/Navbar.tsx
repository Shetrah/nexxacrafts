import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import DigitalClock from './DigitalClock';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav 
      className={`fixed w-full z-50 transition-all duration-500 ${
        isScrolled || location.pathname !== '/' 
          ? 'bg-white/95 backdrop-blur-md shadow-lg py-2' 
          : 'bg-transparent py-4'
      }`}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <img 
                src="/Nexa Logo.png" 
                alt="nexxacrafts Logo" 
                className="h-12 w-auto transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-lg bg-white rounded-lg p-1"
                style={{ 
                  filter: 'drop-shadow(0 2px 8px rgba(3, 65, 252, 0.3))',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)'
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-primary-700/20 to-secondary-600/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
            </div>
          </Link>

          {/* Digital Clock - Desktop */}
          <div className="hidden lg:block">
            <DigitalClock />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8 items-center">
            <NavLink to="/" isScrolled={isScrolled} currentPath={location.pathname}>Home</NavLink>
            <NavLink to="/services" isScrolled={isScrolled} currentPath={location.pathname}>Services</NavLink>
            <NavLink to="/portfolio" isScrolled={isScrolled} currentPath={location.pathname}>Portfolio</NavLink>
            <NavLink to="/about" isScrolled={isScrolled} currentPath={location.pathname}>About</NavLink>
            <NavLink to="/contact" isScrolled={isScrolled} currentPath={location.pathname}>Contact</NavLink>
            
            {/* Get Quote Button - Desktop */}
            <Link
              to="/contact"
              className="ml-4 px-6 py-2 bg-gradient-to-r from-primary-700 to-secondary-600 hover:from-primary-800 hover:to-secondary-700 text-white font-semibold rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
            >
              Get Quote
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button 
              onClick={toggleMenu}
              aria-label="Toggle menu"
              className="p-2 focus:outline-none group"
            >
              {isOpen ? (
                <X className={`h-6 w-6 transition-all duration-300 group-hover:rotate-90 ${
                  isScrolled || location.pathname !== '/' ? 'text-gray-900' : 'text-white'
                }`} />
              ) : (
                <Menu className={`h-6 w-6 transition-all duration-300 group-hover:scale-110 ${
                  isScrolled || location.pathname !== '/' ? 'text-gray-900' : 'text-white'
                }`} />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden mt-4 py-4 bg-white/95 backdrop-blur-md rounded-xl shadow-xl animate-fadeIn border border-gray-100">
            <div className="flex flex-col space-y-4 px-4">
              {/* Mobile Digital Clock */}
              <div className="flex justify-center mb-2">
                <DigitalClock />
              </div>
              <MobileNavLink to="/" onClick={toggleMenu}>Home</MobileNavLink>
              <MobileNavLink to="/services" onClick={toggleMenu}>Services</MobileNavLink>
              <MobileNavLink to="/portfolio" onClick={toggleMenu}>Portfolio</MobileNavLink>
              <MobileNavLink to="/about" onClick={toggleMenu}>About</MobileNavLink>
              <MobileNavLink to="/contact" onClick={toggleMenu}>Contact</MobileNavLink>
              
              {/* Mobile Get Quote Button */}
              <div className="pt-2">
                <Link
                  to="/contact"
                  onClick={toggleMenu}
                  className="block text-center px-6 py-3 bg-gradient-to-r from-primary-700 to-secondary-600 hover:from-primary-800 hover:to-secondary-700 text-white font-semibold rounded-full transition-all duration-300 transform hover:scale-105"
                >
                  Get Quote
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

interface NavLinkProps {
  to: string;
  isScrolled: boolean;
  currentPath: string;
  children: React.ReactNode;
}

const NavLink: React.FC<NavLinkProps> = ({ to, isScrolled, currentPath, children }) => {
  const isHome = currentPath === '/';
  const isActive = currentPath === to;
  
  return (
    <Link
      to={to}
      className={`font-medium transition-all duration-300 relative group ${
        isScrolled || !isHome
          ? 'text-gray-800 hover:text-primary-700'
          : 'text-white hover:text-secondary-200'
      } ${isActive ? 'text-primary-700' : ''}`}
    >
      {children}
      <span className={`absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-primary-700 to-secondary-600 transition-all duration-300 group-hover:w-full ${
        isActive ? 'w-full' : ''
      }`}></span>
      <span className="absolute inset-0 bg-gradient-to-r from-primary-700/10 to-secondary-600/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 scale-110"></span>
    </Link>
  );
};

interface MobileNavLinkProps {
  to: string;
  onClick: () => void;
  children: React.ReactNode;
}

const MobileNavLink: React.FC<MobileNavLinkProps> = ({ to, onClick, children }) => {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="text-gray-800 hover:text-primary-700 font-medium py-3 px-4 transition-all duration-300 rounded-lg hover:bg-gradient-to-r hover:from-primary-700/10 hover:to-secondary-600/10 hover:shadow-md transform hover:scale-105 relative group"
    >
      {children}
      <span className="absolute left-0 top-0 w-1 h-0 bg-gradient-to-b from-primary-700 to-secondary-600 transition-all duration-300 group-hover:h-full rounded-r-full"></span>
    </Link>
  );
};

export default Navbar;