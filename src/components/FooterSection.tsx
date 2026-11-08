import React from "react";
import {
  Facebook,
  Instagram,
  Twitter,
  ArrowUp,
  MessageCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import StatsCounter from "./StatsCounter";

const FooterSection: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <>
      <StatsCounter />
      <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white pt-16 pb-8 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-primary-700/10 to-secondary-600/10 rounded-full -translate-x-32 -translate-y-32"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-tl from-secondary-600/10 to-primary-700/10 rounded-full translate-x-40 translate-y-40"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <div className="group">
              <div className="flex items-center space-x-3 mb-6">
                <img
                  src="/Nexa Logo.png"
                  alt="nexxacrafts Logo"
                  className="h-10 w-auto transition-all duration-300 group-hover:scale-110 bg-white rounded-lg p-1"
                  style={{
                    filter: "drop-shadow(0 2px 8px rgba(3, 65, 252, 0.3))",
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                  }}
                />
              </div>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Professional graphic design, printing, web development, and
                branding solutions for all your business needs. Where design
                comes to life.
              </p>
              <div className="flex space-x-4">
                <SocialLink
                  href="https://www.facebook.com/shetrahgrafix"
                  icon={<Facebook className="w-5 h-5" />}
                />
                <SocialLink href="#" icon={<Instagram className="w-5 h-5" />} />
                <SocialLink
                  href="https://x.com/shennel_oduor?t=Bu-wFiUNzLIYgddSDJt4qA&s=08"
                  icon={<Twitter className="w-5 h-5" />}
                />
                <SocialLink
                  href="https://wa.me/message/SCQ7POKM6TQ5N1"
                  icon={<MessageCircle className="w-5 h-5" />}
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-6 relative inline-block group">
                Quick Links
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary-700 to-secondary-600 transition-all duration-300 group-hover:w-full"></span>
              </h3>
              <ul className="space-y-3">
                <FooterRouteLink to="/" text="Home" />
                <FooterRouteLink to="/services" text="Services" />
                <FooterRouteLink to="/portfolio" text="Portfolio" />
                <FooterRouteLink to="/about" text="About Us" />
                <FooterRouteLink to="/" text="Testimonials" />
                <FooterRouteLink to="/contact" text="Contact" />
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-6 relative inline-block group">
                Services
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary-700 to-secondary-600 transition-all duration-300 group-hover:w-full"></span>
              </h3>
              <ul className="space-y-3">
                <FooterRouteLink to="/services" text="Corporate T-shirts" />
                <FooterRouteLink to="/services" text="Banners & Signage" />
                <FooterRouteLink to="/services" text="Eulogy Programs" />
                <FooterRouteLink to="/services" text="Stickers & Labels" />
                <FooterRouteLink to="/services" text="Branded Mugs" />
                <FooterRouteLink to="/services" text="Web Development" />
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-6 relative inline-block group">
                Contact Us
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-primary-700 to-secondary-600 transition-all duration-300 group-hover:w-full"></span>
              </h3>
              <ul className="space-y-4 text-gray-400">
                <ContactItem icon="📞" text="+254 795 333 004" />
                <ContactItem icon="✉️" text="info@nexacraft.co.ke" />
                <ContactItem icon="📍" text="Siaya, Kenya" />
                <ContactItem icon="🕒" text="Mon-Fri: 8am - 6pm" />
              </ul>

              {/* Get Quote Button */}
              <div className="mt-6">
                <Link
                  to="/contact"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary-700 to-secondary-600 hover:from-primary-800 hover:to-secondary-700 text-white font-semibold rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                >
                  Get Quote
                  <svg
                    className="w-4 h-4 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-8 mt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} nexxacrafts. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <a
                href="#"
                className="text-gray-500 hover:text-white transition-colors text-sm hover:underline"
              >
                Privacy Policy
              </a>
              <a
                href="#"
                className="text-gray-500 hover:text-white transition-colors text-sm hover:underline"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </div>

        <button
          onClick={scrollToTop}
          className="fixed right-6 bottom-6 p-4 bg-gradient-to-r from-primary-700 to-secondary-600 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-110 transition-all duration-300 focus:outline-none group z-50"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
        </button>
      </footer>
    </>
  );
};

const SocialLink: React.FC<{ href: string; icon: React.ReactNode }> = ({
  href,
  icon,
}) => (
  <a
    href={href}
    className="text-gray-400 hover:text-white transition-all duration-300 transform hover:scale-110 hover:rotate-6 p-2 rounded-full hover:bg-gradient-to-r hover:from-primary-700/20 hover:to-secondary-600/20"
  >
    {icon}
  </a>
);

const FooterRouteLink: React.FC<{ to: string; text: string }> = ({
  to,
  text,
}) => (
  <li>
    <Link
      to={to}
      className="text-gray-400 hover:text-white transition-all duration-300 hover:translate-x-2 inline-block relative group"
    >
      {text}
      <span className="absolute left-0 bottom-0 w-0 h-0.5 bg-gradient-to-r from-primary-700 to-secondary-600 transition-all duration-300 group-hover:w-full"></span>
    </Link>
  </li>
);

const ContactItem: React.FC<{ icon: string; text: string }> = ({
  icon,
  text,
}) => (
  <li className="flex items-start group">
    <span className="mr-3 group-hover:scale-110 transition-transform duration-300">
      {icon}
    </span>
    <span className="group-hover:text-white transition-colors duration-300">
      {text}
    </span>
  </li>
);

export default FooterSection;
