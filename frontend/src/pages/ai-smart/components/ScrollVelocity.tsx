import { useRef, useLayoutEffect, useState, RefObject } from 'react';
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useVelocity,
  useAnimationFrame,
} from 'framer-motion';

function useElementWidth(ref: RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    function updateWidth() {
      if (ref.current) setWidth(ref.current.offsetWidth);
    }
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [ref]);
  return width;
}

function wrap(min: number, max: number, v: number) {
  const range = max - min;
  const mod = (((v - min) % range) + range) % range;
  return mod + min;
}

interface VelocityTextProps {
  children: React.ReactNode;
  baseVelocity?: number;
  scrollContainerRef?: RefObject<HTMLElement | null>;
  className?: string;
  damping?: number;
  stiffness?: number;
  numCopies?: number;
  velocityMapping?: { input: [number, number]; output: [number, number] };
  parallaxStyle?: React.CSSProperties;
  scrollerStyle?: React.CSSProperties;
}

function VelocityText({
  children,
  baseVelocity = 100,
  scrollContainerRef,
  className = '',
  damping = 50,
  stiffness = 400,
  numCopies = 6,
  velocityMapping = { input: [0, 1000], output: [0, 5] },
  parallaxStyle,
  scrollerStyle,
}: VelocityTextProps) {
  const baseX = useMotionValue(0);
  const scrollOptions = scrollContainerRef ? { container: scrollContainerRef } : {};
  const { scrollY } = useScroll(scrollOptions);
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping, stiffness });
  const velocityFactor = useTransform(
    smoothVelocity,
    velocityMapping.input,
    velocityMapping.output,
    { clamp: false }
  );

  const copyRef = useRef<HTMLSpanElement>(null);
  const copyWidth = useElementWidth(copyRef);

  const x = useTransform(baseX, (v) => {
    if (copyWidth === 0) return '0px';
    return `${wrap(-copyWidth, 0, v)}px`;
  });

  const directionFactor = useRef(1);
  useAnimationFrame((_t, delta) => {
    let moveBy = directionFactor.current * baseVelocity * (delta / 1000);
    if (velocityFactor.get() < 0) directionFactor.current = -1;
    else if (velocityFactor.get() > 0) directionFactor.current = 1;
    moveBy += directionFactor.current * moveBy * velocityFactor.get();
    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...parallaxStyle,
      }}
    >
      <motion.div
        style={{
          display: 'flex',
          whiteSpace: 'nowrap',
          x,
          ...scrollerStyle,
        }}
      >
        {Array.from({ length: numCopies }).map((_, i) => (
          <span className={className} key={i} ref={i === 0 ? copyRef : null}>
            {children}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

interface ScrollVelocityProps {
  scrollContainerRef?: RefObject<HTMLElement | null>;
  texts?: string[];
  velocity?: number;
  className?: string;
  damping?: number;
  stiffness?: number;
  numCopies?: number;
  velocityMapping?: { input: [number, number]; output: [number, number] };
  parallaxStyle?: React.CSSProperties;
  scrollerStyle?: React.CSSProperties;
}

export const ScrollVelocity = ({
  scrollContainerRef,
  texts = [],
  velocity = 100,
  className = '',
  damping = 50,
  stiffness = 400,
  numCopies = 6,
  velocityMapping = { input: [0, 1000], output: [0, 5] },
  parallaxStyle,
  scrollerStyle,
}: ScrollVelocityProps) => {
  return (
    <section>
      {texts.map((text, index) => (
        <VelocityText
          key={index}
          className={className}
          baseVelocity={index % 2 !== 0 ? -velocity : velocity}
          scrollContainerRef={scrollContainerRef}
          damping={damping}
          stiffness={stiffness}
          numCopies={numCopies}
          velocityMapping={velocityMapping}
          parallaxStyle={parallaxStyle}
          scrollerStyle={scrollerStyle}
        >
          {text}&nbsp;
        </VelocityText>
      ))}
    </section>
  );
};

export default ScrollVelocity;
