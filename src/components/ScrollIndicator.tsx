import React, { useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ScrollIndicatorProps {
  children: React.ReactNode;
  className?: string;
}

export default function ScrollIndicator({ children, className = '' }: ScrollIndicatorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftIndicator, setShowLeftIndicator] = useState(false);
  const [showRightIndicator, setShowRightIndicator] = useState(false);

  const checkScroll = () => {
    const element = scrollRef.current;
    if (!element) return;

    const isScrollable = element.scrollWidth > element.clientWidth;
    const isAtStart = element.scrollLeft <= 5;
    const isAtEnd = element.scrollLeft + element.clientWidth >= element.scrollWidth - 5;

    setShowLeftIndicator(isScrollable && !isAtStart);
    setShowRightIndicator(isScrollable && !isAtEnd);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);

    const element = scrollRef.current;
    if (element) {
      element.addEventListener('scroll', checkScroll);
    }

    return () => {
      window.removeEventListener('resize', checkScroll);
      if (element) {
        element.removeEventListener('scroll', checkScroll);
      }
    };
  }, [children]);

  const scroll = (direction: 'left' | 'right') => {
    const element = scrollRef.current;
    if (!element) return;

    const scrollAmount = 200;
    const newScrollLeft = direction === 'left'
      ? element.scrollLeft - scrollAmount
      : element.scrollLeft + scrollAmount;

    element.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  };

  return (
    <div className="relative">
      {showLeftIndicator && (
        <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pointer-events-none">
          <div className="bg-gradient-to-r from-gray-900 via-gray-900/90 to-transparent pl-2 pr-8 py-2 pointer-events-auto">
            <button
              onClick={() => scroll('left')}
              className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded-full shadow-lg transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        className={`overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900 ${className}`}
      >
        {children}
      </div>

      {showRightIndicator && (
        <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center pointer-events-none">
          <div className="bg-gradient-to-l from-gray-900 via-gray-900/90 to-transparent pr-2 pl-8 py-2 pointer-events-auto">
            <button
              onClick={() => scroll('right')}
              className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded-full shadow-lg transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
