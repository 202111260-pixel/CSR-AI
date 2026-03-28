'use client';
import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

interface TracingBeamProps {
  children: React.ReactNode;
  className?: string;
}

export function TracingBeam({ children, className = '' }: TracingBeamProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start center', 'end center'],
  });

  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (ref.current) setHeight(ref.current.offsetHeight);
  }, []);

  const y1 = useSpring(useTransform(scrollYProgress, [0, 1], [0, height]), {
    stiffness: 400, damping: 80,
  });
  const y2 = useSpring(useTransform(scrollYProgress, [0, 1], [0, height - 80]), {
    stiffness: 400, damping: 80,
  });

  return (
    <div ref={ref} className={`relative flex gap-10 ${className}`}>
      {/* Beam track — left side */}
      <div className="flex flex-col items-center flex-shrink-0 pt-2" style={{ width: 24 }}>
        {/* Top dot */}
        <div className="w-3 h-3 rounded-full border border-white/20 flex items-center justify-center flex-shrink-0 z-10" style={{ background: 'rgba(99,102,241,0.15)' }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#6366f1' }} />
        </div>

        {/* SVG track */}
        <div className="flex-1 relative" style={{ width: 2 }}>
          {/* Background track */}
          <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
          {/* Animated fill */}
          <svg
            viewBox={`0 0 2 ${height}`}
            width="2"
            height="100%"
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
          >
            <defs>
              <motion.linearGradient id="beam-gradient" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={y1} y2={y2}>
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
                <stop offset="20%" stopColor="#6366f1" stopOpacity="1" />
                <stop offset="60%" stopColor="#3b82f6" stopOpacity="1" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
              </motion.linearGradient>
            </defs>
            <rect x="0" y="0" width="2" height={height} fill="url(#beam-gradient)" rx="1" />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-10">
        {children}
      </div>
    </div>
  );
}
