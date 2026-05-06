'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  variant?: 'light' | 'dark';
}

const sizes = {
  sm: { icon: 'w-8 h-8', text: 'text-base', iconSize: 'w-4 h-4' },
  md: { icon: 'w-10 h-10', text: 'text-xl', iconSize: 'w-5 h-5' },
  lg: { icon: 'w-12 h-12', text: 'text-2xl', iconSize: 'w-6 h-6' },
  xl: { icon: 'w-16 h-16', text: 'text-3xl', iconSize: 'w-8 h-8' },
};

export function Logo({
  size = 'md',
  showText = true,
  className = '',
  variant = 'dark',
}: LogoProps) {
  const s = sizes[size];
  const goColor = variant === 'light' ? 'text-white' : 'text-gray-800';
  const subtitleColor = variant === 'light' ? 'text-gray-300' : 'text-gray-500';

  return (
    <Link href="/" className={`flex items-center gap-3 group ${className}`}>
      <div className={`${s.icon} relative`}>
        <svg viewBox="0 0 48 48" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#15803d" />
              <stop offset="50%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
            <linearGradient id="logoGradDark" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#166534" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>
          </defs>

          {/* Main organic leaf shape */}
          <motion.path
            d="M24 4C24 4 10 14 10 28C10 38 15 42 24 44C33 42 38 38 38 28C38 14 24 4 24 4Z"
            fill="url(#logoGrad)"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          />

          {/* Leaf vein */}
          <motion.path
            d="M24 10C24 10 24 26 24 40"
            stroke="#166534"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          />

          {/* Side veins */}
          <motion.path
            d="M24 18C20 20 14 22 14 22"
            stroke="#166534"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          />
          <motion.path
            d="M24 18C28 20 34 22 34 22"
            stroke="#166534"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 0.6 }}
          />
          <motion.path
            d="M24 28C20 30 16 32 16 32"
            stroke="#166534"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 0.7 }}
          />
          <motion.path
            d="M24 28C28 30 32 32 32 32"
            stroke="#166534"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 0.8 }}
          />

          {/* Highlight */}
          <motion.ellipse
            cx="18"
            cy="18"
            rx="4"
            ry="8"
            fill="rgba(255,255,255,0.3)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`${s.text} font-black tracking-tight`}>
            <span className="text-green-600">Nature</span>
            <span className={goColor}>Go</span>
          </span>
          <span className={`text-[8px] tracking-[0.2em] uppercase -mt-1 ${subtitleColor}`}>
            Organic
          </span>
        </div>
      )}
    </Link>
  );
}

export function LogoIcon({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const s = sizes[size];

  return (
    <div className={`${s.icon} relative ${className}`}>
      <svg viewBox="0 0 48 48" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logoGradIcon" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#15803d" />
            <stop offset="50%" stopColor="#16a34a" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <motion.path
          d="M24 4C24 4 10 14 10 28C10 38 15 42 24 44C33 42 38 38 38 28C38 14 24 4 24 4Z"
          fill="url(#logoGradIcon)"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        />
        <path
          d="M24 10C24 10 24 26 24 40"
          stroke="#166534"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="18" cy="18" rx="4" ry="8" fill="rgba(255,255,255,0.3)" />
      </svg>
    </div>
  );
}
