import { useState, useEffect, useRef } from 'react';

interface UseTypewriterOptions {
  text: string;
  speed?: number;
  enabled?: boolean;
  onComplete?: () => void;
}

export function useTypewriter({ text, speed = 6, enabled = true, onComplete }: UseTypewriterOptions) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    if (!enabled || !text) {
      setDisplayed('');
      setDone(false);
      indexRef.current = 0;
      return;
    }

    setDisplayed('');
    setDone(false);
    indexRef.current = 0;
    lastTimeRef.current = 0;

    const step = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const elapsed = timestamp - lastTimeRef.current;

      if (elapsed >= speed) {
        const chars = Math.max(1, Math.floor(elapsed / speed));
        const nextIndex = Math.min(indexRef.current + chars, text.length);
        indexRef.current = nextIndex;
        setDisplayed(text.slice(0, nextIndex));
        lastTimeRef.current = timestamp;

        if (nextIndex >= text.length) {
          setDone(true);
          onComplete?.();
          return;
        }
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [text, speed, enabled, onComplete]);

  return { displayed, done };
}
