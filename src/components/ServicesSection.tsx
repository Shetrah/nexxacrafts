import React from 'react';
import { Printer, PaintBucket, Award, Layout, Gift, Shirt, Flag, Sticker, Code } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ icon, title, description }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 group border-t-4 border-primary-700 relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-700/5 via-transparent to-secondary-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      {/* Floating particles effect */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary-700/10 to-secondary-600/10 rounded-full -translate-y-10 translate-x-10 group-hover:animate-float"></div>
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-secondary-600/10 to-primary-700/10 rounded-full translate-y-8 -translate-x-8 group-hover:animate-float animation-delay-200"></div>
      
      <div className="relative z-10">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center mb-6 group-hover:bg-gradient-to-br group-hover:from-primary-200 group-hover:to-secondary-200 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-lg">
          <div className="text-primary-700 group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>
        </div>
        <h3 className="text-xl font-semibold mb-3 text-gray-800 group-hover:text-primary-700 transition-colors duration-300">{title}</h3>
        <p className="text-gray-600 group-hover:text-gray-700 transition-colors duration-300 leading-relaxed">{description}</p>
        
        {/* Get Quote button */}
        <div className="mt-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
          <Link
            to="/contact"
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-primary-700 to-secondary-600 text-white text-sm font-medium rounded-full hover:from-primary-800 hover:to-secondary-700 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
          >
            Get Quote
            <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
};

const ServicesSection: React.FC = () => {
  const services = [
    {
      icon: <Shirt className="w-8 h-8" />,
      title: "Corporate T-shirts",
      description: "Custom-designed corporate t-shirts for your team, events, or promotions with premium quality printing and comfortable fabrics."
    },
    {
      icon: <Flag className="w-8 h-8" />,
      title: "Banners & Signage",
      description: "Eye-catching banners and signage solutions for indoor and outdoor promotions, events, and brand visibility."
    },
    {
      icon: <Layout className="w-8 h-8" />,
      title: "Eulogy Programs",
      description: "Respectful and professionally designed memorial and funeral programs to honor your loved ones with dignity."
    },
    {
      icon: <Sticker className="w-8 h-8" />,
      title: "Stickers & Labels",
      description: "Custom stickers and labels in various shapes, sizes, and materials for product branding, promotions, or personal use."
    },
    {
      icon: <Gift className="w-8 h-8" />,
      title: "Branded Mugs",
      description: "High-quality ceramic mugs with your logo or custom design, perfect for corporate gifts or promotional items."
    },
    {
      icon: <Printer className="w-8 h-8" />,
      title: "Print Materials",
      description: "Business cards, flyers, brochures, and other print materials with exceptional quality, vibrant colors, and professional finishing."
    },
    {
      icon: <PaintBucket className="w-8 h-8" />,
      title: "Graphic Design",
      description: "Professional graphic design services including logos, branding packages, marketing materials, and creative solutions."
    },
    {
      icon: <Code className="w-8 h-8" />,
      title: "Web Design & Development",
      description: "Modern, responsive websites and web applications that showcase your brand and drive business growth online."
    },
    {
      icon: <Award className="w-8 h-8" />,
      title: "Brand Strategy",
      description: "Comprehensive brand strategy development to establish a strong visual identity and market presence for your business."
    }
  ];

  return (
    <section id="services" className="py-20 bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-br from-primary-700/5 to-secondary-600/5 rounded-full -translate-x-36 -translate-y-36"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-secondary-600/5 to-primary-700/5 rounded-full translate-x-48 translate-y-48"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 relative">
            Our Services
            <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-primary-700 to-secondary-600 rounded-full"></span>
          </h2>
          <div className="w-20 h-1 bg-gradient-to-r from-primary-700 to-secondary-600 mx-auto mb-6 rounded-full"></div>
          <p className="max-w-3xl mx-auto text-gray-600 text-lg leading-relaxed">
            From concept to creation, we provide comprehensive design, printing, web development, and branding solutions to help your business stand out in today's competitive market.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div key={index} className="animate-fadeInUp" style={{ animationDelay: `${index * 100}ms` }}>
              <ServiceCard 
                icon={service.icon}
                title={service.title}
                description={service.description}
              />
            </div>
          ))}
        </div>
        
        <div className="text-center mt-16">
          <Link 
            to="/contact" 
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-primary-700 to-secondary-600 hover:from-primary-800 hover:to-secondary-700 text-white font-semibold rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-xl group"
          >
            <span>Request a Custom Service</span>
            <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;