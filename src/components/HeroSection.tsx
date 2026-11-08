import React from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const HeroSection: React.FC = () => {
  return (
    <section 
      id="home" 
      className="relative h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 via-primary-800 to-secondary-700 overflow-hidden"
    >
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-2 h-2 bg-white rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-1 h-1 bg-secondary-300 rounded-full animate-pulse animation-delay-200"></div>
        <div className="absolute bottom-32 left-20 w-3 h-3 bg-white/50 rounded-full animate-bounce-slow"></div>
        <div className="absolute top-60 left-1/3 w-1 h-1 bg-white rounded-full animate-pulse animation-delay-400"></div>
        <div className="absolute bottom-40 right-1/4 w-2 h-2 bg-secondary-300 rounded-full animate-pulse"></div>
      </div>
      
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full bg-repeat" 
             style={{ backgroundImage: "url('https://images.pexels.com/photos/3094799/pexels-photo-3094799.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750')", backgroundSize: "200px" }}>
        </div>
      </div>
      
      {/* Floating geometric shapes */}
      <div className="absolute top-1/4 left-1/4 w-20 h-20 border-2 border-white/20 rounded-lg rotate-45 animate-float"></div>
      <div className="absolute bottom-1/4 right-1/4 w-16 h-16 border-2 border-secondary-300/30 rounded-full animate-float animation-delay-200"></div>
      <div className="absolute top-1/3 right-1/3 w-12 h-12 bg-gradient-to-br from-white/10 to-secondary-300/20 rounded-lg rotate-12 animate-float animation-delay-400"></div>
      
      <div className="container mx-auto px-4 z-10 relative">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center mb-6 animate-fadeInUp">
            <Sparkles className="w-8 h-8 text-secondary-300 mr-3 animate-pulse" />
            <span className="text-secondary-200 font-medium text-lg">Premium Design & Printing Services</span>
            <Sparkles className="w-8 h-8 text-secondary-300 ml-3 animate-pulse" />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight animate-fadeInUp animation-delay-200">
            Bringing Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary-300 to-secondary-500 animate-glow">Vision</span> to Life
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-100 mb-10 animate-fadeInUp animation-delay-400 leading-relaxed max-w-3xl mx-auto">
            Professional graphic design, printing and branding services tailored to elevate your business and make lasting impressions
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12 animate-fadeInUp animation-delay-600">
            <Link
              to="/services"
              className="group px-10 py-4 bg-gradient-to-r from-secondary-600 to-secondary-700 hover:from-secondary-700 hover:to-secondary-800 text-white font-semibold rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-2xl flex items-center justify-center"
            >
              <span>Explore Our Services</span>
              <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              to="/contact"
              className="group px-10 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-full hover:bg-white hover:text-primary-700 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl flex items-center justify-center"
            >
              <span>Get a Quote</span>
              <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </Link>
          </div>
          
          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center items-center gap-8 text-white/80 animate-fadeInUp animation-delay-800">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-secondary-400 rounded-full mr-2 animate-pulse"></div>
              <span className="text-sm font-medium">250+ Happy Clients</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-secondary-400 rounded-full mr-2 animate-pulse animation-delay-200"></div>
              <span className="text-sm font-medium">1500+ Products Delivered</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-secondary-400 rounded-full mr-2 animate-pulse animation-delay-400"></div>
              <span className="text-sm font-medium">98% Satisfaction Rate</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
        <a href="#services" aria-label="Scroll down" className="group">
          <div className="w-12 h-12 rounded-full border-2 border-white/50 flex items-center justify-center group-hover:border-white group-hover:bg-white/10 transition-all duration-300">
            <ChevronDown className="w-6 h-6 text-white group-hover:scale-110 transition-transform duration-300" />
          </div>
        </a>
      </div>
    </section>
  );
};

export default HeroSection;