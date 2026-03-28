import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface BlurFadeProps {
  children: ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  className?: string;
  blur?: number;
  distance?: number;
}

export function BlurFade({
  children,
  delay = 0,
  direction = 'up',
  className,
  blur = 10,
  distance = 30,
}: BlurFadeProps) {
  const directionMap = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance },
  };

  return (
    <motion.div
      initial={{
        opacity: 0,
        filter: `blur(${blur}px)`,
        ...directionMap[direction],
      }}
      whileInView={{
        opacity: 1,
        filter: 'blur(0px)',
        x: 0,
        y: 0,
      }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
