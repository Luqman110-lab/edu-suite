import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  textClassName?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  textClassName = ''
}) => {
  const sizes = {
    sm: { icon: 'w-10 h-10', text: 'text-sm', subtext: 'text-xs' },
    md: { icon: 'w-14 h-14', text: 'text-lg', subtext: 'text-sm' },
    lg: { icon: 'w-20 h-20', text: 'text-2xl', subtext: 'text-base' },
    xl: { icon: 'w-28 h-28', text: 'text-3xl', subtext: 'text-lg' }
  };

  const s = sizes[size];

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`${s.icon} bg-primary-500 rounded-full flex items-center justify-center text-white bg-blue-600`}>
        <svg className="w-3/5 h-3/5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </div>

      {showText && (
        <div className={`text-center mt-3 ${textClassName}`}>
          <h1 className={`font-bold tracking-tight ${s.text} text-gray-900 dark:text-white`}>
            EDUSUITE
          </h1>
          <p className={`font-semibold text-primary-500 ${s.subtext}`}>
            SYSTEMS
          </p>
        </div>
      )}
    </div>
  );
};

export const LogoIcon: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => (
  <div className={`${className} bg-primary-500 rounded-full flex items-center justify-center text-white bg-blue-600`}>
    <svg className="w-3/5 h-3/5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  </div>
);
