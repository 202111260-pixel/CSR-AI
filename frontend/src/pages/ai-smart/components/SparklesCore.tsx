import { useId, useMemo, useEffect, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { ISourceOptions } from "@tsparticles/engine";

interface SparklesCoreProps {
  background?: string;
  minSize?: number;
  maxSize?: number;
  particleDensity?: number;
  className?: string;
  particleColor?: string;
  speed?: number;
}

export function SparklesCore({
  background = "transparent",
  minSize = 0.4,
  maxSize = 1,
  particleDensity = 1200,
  className = "",
  particleColor = "#FFFFFF",
  speed = 1,
}: SparklesCoreProps) {
  const [init, setInit] = useState(false);
  const generatedId = useId();

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setInit(true));
  }, []);

  const options: ISourceOptions = useMemo(
    () => ({
      background: { color: { value: background } },
      fullScreen: { enable: false },
      fpsLimit: 120,
      interactivity: {
        events: {
          onClick: { enable: true, mode: "push" },
          onHover: { enable: false },
        },
        modes: {
          push: { quantity: 4 },
        },
      },
      particles: {
        color: { value: particleColor },
        move: {
          enable: true,
          direction: "none",
          outModes: { default: "out" },
          random: false,
          speed: speed,
          straight: false,
        },
        number: {
          density: { enable: true, width: 400, height: 400 },
          value: particleDensity,
        },
        opacity: {
          value: { min: 0.1, max: 1 },
          animation: {
            enable: true,
            speed: 1,
            startValue: "random",
            destroy: "none",
          },
        },
        size: {
          value: { min: minSize, max: maxSize },
        },
        shape: { type: "circle" },
      },
      detectRetina: true,
    }),
    [background, particleColor, particleDensity, minSize, maxSize, speed]
  );

  if (!init) return null;

  return <Particles id={generatedId} className={className} options={options} />;
}
