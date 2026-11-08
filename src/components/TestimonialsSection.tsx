import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";

interface Testimonial {
  id: number;
  name: string;
  role: string;
  company: string;
  content: string;
  rating: number;
}

const TestimonialsSection: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const testimonials: Testimonial[] = [
    {
      id: 1,
      name: "Sarah Johnson",
      role: "Marketing Director",
      company: "Innovate Solutions",
      content:
        "Nexa Craft delivered exceptional quality for our corporate rebranding. Their attention to detail and quick turnaround exceeded our expectations. We received countless compliments on our new marketing materials.",
      rating: 5,
    },
    {
      id: 2,
      name: "Michael Chen",
      role: "Event Coordinator",
      company: "Global Conferences",
      content:
        "The team at NexaCraft was incredibly responsive and professional. They designed and printed 500 t-shirts and banners for our conference in record time, and the quality was outstanding. Will definitely use their services again!",
      rating: 5,
    },
    {
      id: 3,
      name: "David Okonkwo",
      role: "CEO",
      company: "Sunrise Enterprises",
      content:
        "I've worked with many printing companies over the years, but NexaCraft stands out for their consistent quality and excellent customer service. They truly understand our brand and always deliver outstanding results.",
      rating: 5,
    },
    {
      id: 4,
      name: "Walter",
      role: "Director",
      company: "Rebearth Solutions",
      content:
        "Partnering with NexaCraft to design our website [rebearthsolutions.co.ke](https://rebearthsolutions.co.ke) and brand our marketing materials was a seamless and rewarding experience. Their team perfectly captured our brand identity and delivered a clean, modern look that truly represents Rebearth Solutions.",
      rating: 5,
    },
    {
      id: 5,
      name: "Stephen Otieno",
      role: "Founder & Technical Lead",
      company: "STETECH SOLAR TECHNOLOGY",
      content:
        "NexaCraft did an exceptional job redesigning our website [stetechsolartechnology.co.ke](https://stetechsolartechnology.co.ke) and elevating our brand. Their team was responsive, creative, and truly understood the clean energy space. The new look has boosted our credibility and client engagement.",
      rating: 5,
    },
  ];

  const nextSlide = () => {
    setActiveIndex((current) => (current + 1) % testimonials.length);
  };

  const prevSlide = () => {
    setActiveIndex(
      (current) => (current - 1 + testimonials.length) % testimonials.length
    );
  };

  const startAutoplay = () => {
    if (intervalRef.current !== null) return;
    intervalRef.current = window.setInterval(nextSlide, 5000);
  };

  const stopAutoplay = () => {
    if (intervalRef.current === null) return;
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  useEffect(() => {
    startAutoplay();
    return () => stopAutoplay();
  }, []);

  const handleMouseEnter = () => {
    stopAutoplay();
  };

  const handleMouseLeave = () => {
    startAutoplay();
  };

  return (
    <section id="testimonials" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            What Our Clients Say
          </h2>
          <div className="w-20 h-1 bg-secondary-600 mx-auto mb-6"></div>
          <p className="max-w-2xl mx-auto text-gray-600 text-lg">
            Don't just take our word for it. Hear from our satisfied clients
            about their experience working with us.
          </p>
        </div>

        <div
          className="relative max-w-4xl mx-auto"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            >
              {testimonials.map((testimonial) => (
                <div key={testimonial.id} className="w-full flex-shrink-0 px-4">
                  <div className="bg-primary-50 rounded-xl p-8 shadow-lg relative">
                    <Quote className="absolute top-6 right-6 w-12 h-12 text-primary-200" />
                    <div className="mb-6 flex">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`w-5 h-5 ${i < testimonial.rating ? "text-yellow-400" : "text-gray-300"}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-gray-700 italic mb-6 leading-relaxed">
                      {testimonial.content}
                    </p>
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-primary-200 rounded-full flex items-center justify-center mr-4">
                        <span className="text-primary-700 font-bold text-lg">
                          {testimonial.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {testimonial.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {testimonial.role}, {testimonial.company}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 -ml-4 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center focus:outline-none z-10"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 -mr-4 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center focus:outline-none z-10"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-6 h-6 text-gray-600" />
          </button>

          <div className="flex justify-center mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`w-3 h-3 mx-1 rounded-full transition-all duration-300 ${
                  activeIndex === index ? "bg-primary-700 w-6" : "bg-gray-300"
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
