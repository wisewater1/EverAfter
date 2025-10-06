import React from 'react';

interface WheelOfSamsaraIconProps {
  className?: string;
  size?: number;
}

const WheelOfSamsaraIcon: React.FC<WheelOfSamsaraIconProps> = ({ className = '', size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />

      <circle
        cx="12"
        cy="12"
        r="6"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />

      <circle
        cx="12"
        cy="12"
        r="2"
        fill="currentColor"
      />

      <line
        x1="12"
        y1="2"
        x2="12"
        y2="6"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <line
        x1="12"
        y1="18"
        x2="12"
        y2="22"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <line
        x1="2"
        y1="12"
        x2="6"
        y2="12"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <line
        x1="18"
        y1="12"
        x2="22"
        y2="12"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <line
        x1="4.93"
        y1="4.93"
        x2="7.76"
        y2="7.76"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <line
        x1="16.24"
        y1="16.24"
        x2="19.07"
        y2="19.07"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <line
        x1="4.93"
        y1="19.07"
        x2="7.76"
        y2="16.24"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <line
        x1="16.24"
        y1="7.76"
        x2="19.07"
        y2="4.93"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
};

export default WheelOfSamsaraIcon;
