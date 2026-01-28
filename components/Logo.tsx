import React from 'react';
import logoImage from '@/attached_assets/EDU_1766463322650.png';

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
      <img 
        src={logoImage} 
        alt="EduSuite Systems" 
        className={`${s.icon} object-contain`}
      />
      
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
  <img 
    src={logoImage} 
    alt="EduSuite" 
    className={`${className} object-contain`}
  />
);
