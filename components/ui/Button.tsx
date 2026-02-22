import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, HTMLMotionProps } from 'framer-motion';

function cn(...inputs: ClassValue[])
{
  return twMerge(clsx(inputs));
}

interface ButtonProps extends HTMLMotionProps<"button">
{
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  className,
  variant = 'primary',
  size = 'md',
  children,
  disabled,
  ...props
}) =>
{
  const variants = {
    primary: 'bg-brand-primary hover:bg-brand-primary/90 text-white shadow-lg shadow-brand-primary/25 border border-transparent',
    secondary: 'bg-bg-card hover:bg-brand-subtle text-text-primary border border-border',
    outline: 'bg-transparent hover:bg-brand-subtle text-text-primary border border-border',
    danger: 'bg-money-loss hover:bg-red-600 text-white shadow-lg shadow-red-500/25 border border-transparent',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg font-semibold',
  };

  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.03, y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      className={cn(
        'rounded-full transition-colors transition-transform duration-200 motion-reduce:transition-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default Button;
