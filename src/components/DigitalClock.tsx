import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const DigitalClock: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="flex items-center space-x-3 bg-gradient-to-r from-primary-700/10 to-secondary-600/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
      <div className="flex items-center space-x-2">
        <Clock className="w-4 h-4 text-primary-700 animate-pulse-slow" />
        <div className="text-right">
          <div className="text-sm font-bold text-gray-800 font-mono tracking-wider">
            {formatTime(time)}
          </div>
          <div className="text-xs text-gray-600 font-medium">
            {formatDate(time)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigitalClock;