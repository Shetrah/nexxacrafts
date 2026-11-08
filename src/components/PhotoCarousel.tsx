import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

interface Photo {
  id: number;
  url: string;
  title: string;
  description: string;
}

const PhotoCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const photos: Photo[] = [
    {
      id: 1,
      url: "https://images.pexels.com/photos/3094799/pexels-photo-3094799.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750",
      title: "Creative Design Process",
      description: "Our team working on innovative design solutions"
    },
    {
      id: 2,
      url: "https://images.pexels.com/photos/6177607/pexels-photo-6177607.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750",
      title: "Professional Printing",
      description: "State-of-the-art printing equipment in action"
    },
    {
      id: 3,
      url: "https://images.pexels.com/photos/5698854/pexels-photo-5698854.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750",
      title: "Custom T-Shirt Design",
      description: "High-quality custom apparel printing"
    },
    {
      id: 4,
      url: "https://images.pexels.com/photos/7821954/pexels-photo-7821954.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750",
      title: "Banner Production",
      description: "Large format printing for events and promotions"
    },
    {
      id: 5,
      url: "https://images.pexels.com/photos/5947026/pexels-photo-5947026.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750",
      title: "Product Packaging",
      description: "Custom packaging design and printing services"
    },
    {
      id: 6,
      url: "https://images.pexels.com/photos/6375/quote-chalk-think-words.jpg?auto=compress&cs=tinysrgb&w=1260&h=750",
      title: "Brand Identity",
      description: "Complete branding solutions for businesses"
    }
  ];

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % photos.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + photos.length) % photos.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying, currentIndex]);

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Work in Action</h2>
          <div className="w-20 h-1 bg-secondary-600 mx-auto mb-6"></div>
          <p className="max-w-2xl mx-auto text-gray-600 text-lg">
            Take a look at our creative process and the quality work we deliver for our clients.
          </p>
        </div>

        <div className="relative max-w-6xl mx-auto">
          {/* Main carousel container */}
          <div className="relative h-96 md:h-[500px] lg:h-[600px] rounded-2xl overflow-hidden shadow-2xl">
            {/* Images */}
            <div className="relative w-full h-full">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                    index === currentIndex 
                      ? 'opacity-100 scale-100' 
                      : 'opacity-0 scale-105'
                  }`}
                >
                  <img
                    src={photo.url}
                    alt={photo.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  
                  {/* Content overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-white">
                    <h3 className="text-2xl md:text-3xl font-bold mb-2 transform translate-y-4 opacity-0 animate-slideUp">
                      {photo.title}
                    </h3>
                    <p className="text-lg md:text-xl text-gray-200 transform translate-y-4 opacity-0 animate-slideUp animation-delay-200">
                      {photo.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation arrows */}
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 group"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </button>

            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 group"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </button>

            {/* Play/Pause button */}
            <button
              onClick={togglePlayPause}
              className="absolute top-4 right-4 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 group"
              aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 group-hover:scale-110 transition-transform" />
              ) : (
                <Play className="w-5 h-5 group-hover:scale-110 transition-transform ml-0.5" />
              )}
            </button>
          </div>

          {/* Dots indicator */}
          <div className="flex justify-center mt-6 space-x-2">
            {photos.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'bg-primary-700 w-8' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Progress bar */}
          <div className="mt-4 w-full bg-gray-200 rounded-full h-1 overflow-hidden">
            <div 
              className={`h-full bg-primary-700 rounded-full transition-all duration-300 ${
                isPlaying ? 'animate-progress' : ''
              }`}
              style={{ 
                width: `${((currentIndex + 1) / photos.length) * 100}%`,
                animationDuration: isPlaying ? '5s' : '0s'
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default PhotoCarousel;