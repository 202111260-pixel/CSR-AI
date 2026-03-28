import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Transition, TargetAndTransition, Variant } from 'framer-motion';

interface RotatingTextProps {
  texts: string[];
  mainClassName?: string;
  staggerFrom?: 'first' | 'last' | 'center';
  initial?: TargetAndTransition;
  animate?: TargetAndTransition;
  exit?: TargetAndTransition;
  staggerDuration?: number;
  splitLevelClassName?: string;
  transition?: Transition;
  rotationInterval?: number;
  onRotate?: (index: number) => void;
  repeatSingle?: boolean;
}

export default function RotatingText({
  texts,
  mainClassName = 'px-2 bg-cyan-300 text-black overflow-hidden py-1 justify-center rounded-lg',
  staggerFrom = 'last',
  initial = { y: '100%' },
  animate = { y: 0 },
  exit = { y: '-120%' },
  staggerDuration = 0.025,
  splitLevelClassName = 'overflow-hidden pb-1',
  transition = { type: 'spring', damping: 30, stiffness: 400 },
  rotationInterval = 2000,
  onRotate,
  repeatSingle = true,
}: RotatingTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [repeatKey, setRepeatKey] = useState(0);

  const rotate = useCallback(() => {
    if (texts.length > 1) {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % texts.length;
        onRotate?.(next);
        return next;
      });
    } else if (repeatSingle) {
      // For single texts, just update key to re-trigger animation
      setRepeatKey((prev) => prev + 1);
    }
  }, [texts.length, onRotate, repeatSingle]);

  useEffect(() => {
    const interval = setInterval(rotate, rotationInterval);
    return () => clearInterval(interval);
  }, [rotate, rotationInterval]);

  if (!texts.length) return null;

  const currentText = texts[currentIndex] || '';
  const characters = currentText.split('');

  const getStaggerDelay = (index: number, total: number) => {
    if (staggerFrom === 'first') {
      return index * staggerDuration;
    }
    if (staggerFrom === 'center') {
      const center = (total - 1) / 2;
      return Math.abs(index - center) * staggerDuration;
    }
    // 'last'
    return (total - 1 - index) * staggerDuration;
  };

  return (
    <span className={`inline-flex ${mainClassName}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={`${currentIndex}-${repeatKey}`}
          className="inline-flex"
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {characters.map((char, index) => (
            <span key={`${currentIndex}-${index}`} className={splitLevelClassName}>
              <motion.span
                className="inline-block"
                variants={{
                  initial: initial as Variant,
                  animate: animate as Variant,
                  exit: exit as Variant,
                }}
                transition={{
                  ...transition,
                  delay: getStaggerDelay(index, characters.length),
                }}
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            </span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
