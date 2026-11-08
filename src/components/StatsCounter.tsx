import React, { useState, useEffect, useRef } from "react";
import { Users, Package, Star, Award } from "lucide-react";

interface StatItemProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  suffix?: string;
}

const StatItem: React.FC<StatItemProps> = ({
  icon,
  value,
  label,
  suffix = "",
}) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.5 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      const currentValue = Math.min(Math.floor(increment * currentStep), value);
      setCount(currentValue);

      if (currentStep >= steps) {
        clearInterval(timer);
        setCount(value);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [isVisible, value]);

  return (
    <div ref={elementRef} className="text-center group">
      <div className="w-16 h-16 mx-auto mb-4 bg-secondary-100 rounded-full flex items-center justify-center group-hover:bg-secondary-200 transition-colors duration-300">
        <div className="text-secondary-600 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
      </div>
      <div className="text-3xl md:text-4xl font-bold text-white mb-2">
        {count.toLocaleString()}
        {suffix}
      </div>
      <div className="text-gray-300 text-sm md:text-base font-medium">
        {label}
      </div>
    </div>
  );
};

const StatsCounter: React.FC = () => {
  const stats = [
    {
      icon: <Star className="w-8 h-8" />,
      value: 250,
      label: "Happy Clients",
      suffix: "+",
    },
    {
      icon: <Package className="w-8 h-8" />,
      value: 1500,
      label: "Products Delivered",
      suffix: "+",
    },
    {
      icon: <Award className="w-8 h-8" />,
      value: 15,
      label: "Services Offered",
    },
    {
      icon: <Users className="w-8 h-8" />,
      value: 98,
      label: "Client Satisfaction",
      suffix: "%",
    },
  ];

  return (
    <section className="py-16 bg-gradient-to-r from-primary-800 to-primary-900">
      <div className="container mx-auto px-4">
        {/* Stats Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Our Achievements
          </h2>
          <div className="w-20 h-1 bg-secondary-600 mx-auto mb-6"></div>
          <p className="text-gray-200 text-lg max-w-2xl mx-auto">
            Numbers that speak for our commitment to excellence and quality
            service delivery
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat, index) => (
            <StatItem
              key={index}
              icon={stat.icon}
              value={stat.value}
              label={stat.label}
              suffix={stat.suffix}
            />
          ))}
        </div>

        {/* Our Clients Section */}
        <div className="mt-20">
          <h3 className="text-2xl md:text-3xl font-semibold text-white text-center mb-10">
            Our Clients & Partners
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            <a
              href="https://rebearthsolutions.co.ke"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <img
                src="/clients/Rebearth.jpeg"
                alt="Rebearth Solutions"
                className="h-12 md:h-16 object-contain grayscale hover:grayscale-0 transition duration-300"
              />
            </a>
            <a
              href="https://stetechsolartechnology.co.ke"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <img
                src="/clients/stetech solar.png"
                alt="STETECH Solar Technology"
                className="h-12 md:h-16 object-contain grayscale hover:grayscale-0 transition duration-300"
              />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsCounter;
