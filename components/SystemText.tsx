import React from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
  variant?: 'normal' | 'glitch' | 'warning' | 'success';
  size?: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '4xl';
}

export const SystemText: React.FC<Props> = ({ children, className = '', variant = 'normal', size = 'base' }) => {
  let baseClass = "font-mono uppercase tracking-widest";
  
  const sizeClasses = {
    'sm': 'text-xs',
    'base': 'text-sm',
    'lg': 'text-lg font-bold',
    'xl': 'text-xl font-bold',
    '2xl': 'text-2xl font-black',
    '4xl': 'text-4xl font-black'
  };

  const variantClasses = {
    'normal': 'text-blue-400 drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]',
    'glitch': 'text-white animate-pulse',
    'warning': 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]',
    'success': 'text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]'
  };

  return (
    <div className={`${baseClass} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
};
