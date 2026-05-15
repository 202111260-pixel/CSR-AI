import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface ContainerScrollProps {
  titleComponent: React.ReactNode;
  children: React.ReactNode;
}

export function ContainerScroll({ titleComponent, children }: ContainerScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 0.9', 'end 0.2'],
  });

  const rotate = useTransform(scrollYProgress, [0, 0.4], [25, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.4], [0.78, 1]);
  const translateY = useTransform(scrollYProgress, [0, 0.4], [120, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.15], [0.4, 1]);
  const titleTranslate = useTransform(scrollYProgress, [0, 0.3], [60, 0]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.2], [0, 1]);
  const titleScale = useTransform(scrollYProgress, [0, 0.3], [0.92, 1]);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center py-8 md:py-16"
      style={{ perspective: '1200px' }}
    >
      {/* Title */}
      <motion.div
        style={{ translateY: titleTranslate, opacity: titleOpacity, scale: titleScale }}
        className="mx-auto max-w-5xl text-center w-full mb-8 md:mb-12"
      >
        {titleComponent}
      </motion.div>

      {/* Card — the Mac-like frame */}
      <motion.div
        style={{
          rotateX: rotate,
          scale,
          translateY,
          opacity,
          transformStyle: 'preserve-3d',
        }}
        className="relative mx-auto w-full max-w-[1000px]"
      >
        {/* Outer glow ring */}
        <div className="absolute -inset-[1px] rounded-[26px] bg-gradient-to-b from-white/[0.12] via-white/[0.04] to-transparent" />

        {/* Main card body */}
        <div className="relative rounded-[25px] bg-[#0a0a14] border border-white/[0.06] overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_60px_120px_-20px_rgba(0,0,0,0.8),0_0_80px_-10px_rgba(59,130,246,0.08)]">
          
          {/* MacOS chrome bar */}
          <div className="flex items-center px-4 py-3 bg-gradient-to-b from-[#1a1a28] to-[#12121e] border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57] shadow-[0_0_4px_rgba(255,95,87,0.3)]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e] shadow-[0_0_4px_rgba(254,188,46,0.3)]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840] shadow-[0_0_4px_rgba(40,200,64,0.3)]" />
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-1.5 opacity-30">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </div>
          </div>

          {/* Content area */}
          <div className="overflow-hidden">
            {children}
          </div>
        </div>

        {/* Bottom reflection */}
        <div className="absolute -bottom-12 left-[10%] right-[10%] h-12 bg-gradient-to-b from-white/[0.015] to-transparent rounded-b-[40px] blur-sm" />
      </motion.div>
    </div>
  );
}
