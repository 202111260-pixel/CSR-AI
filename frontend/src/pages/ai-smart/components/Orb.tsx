import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Color, Triangle } from 'ogl';

interface OrbProps {
  hue?: number;
  hoverIntensity?: number;
  rotateOnHover?: boolean;
  forceHoverState?: boolean;
  backgroundColor?: string;
}

const vertexShader = `
attribute vec2 uv;
attribute vec2 position;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform float uHue;
uniform float uHover;
uniform float uHoverIntensity;
uniform vec2 uResolution;

varying vec2 vUv;

vec3 hsl2rgb(vec3 c) {
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}

void main() {
  vec2 uv = vUv - 0.5;
  uv.x *= uResolution.x / uResolution.y;

  float dist = length(uv);
  float angle = atan(uv.y, uv.x);

  float hue = uHue / 360.0 + sin(uTime * 0.2 + angle * 2.0) * 0.05;
  float saturation = 0.7 + uHover * uHoverIntensity * 0.3;
  float lightness = 0.4 + sin(dist * 8.0 - uTime * 1.5) * 0.15 + uHover * 0.05;

  float orb = smoothstep(0.55 + uHover * 0.05, 0.0, dist);
  orb *= 1.0 + sin(uTime * 2.0 + angle * 3.0) * 0.1 * (1.0 + uHover * uHoverIntensity);

  vec3 color = hsl2rgb(vec3(hue, saturation, lightness));
  float alpha = orb * 0.85;

  gl_FragColor = vec4(color * orb, alpha);
}
`;

export default function Orb({
  hue = 0,
  hoverIntensity = 0.5,
  rotateOnHover = true,
  forceHoverState = false,
  backgroundColor = 'transparent',
}: OrbProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const rendererRef = useRef<Renderer | null>(null);
  const programRef = useRef<Program | null>(null);
  const hoverRef = useRef(forceHoverState ? 1.0 : 0.0);
  const isHoveringRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({ alpha: true, antialias: true });
    rendererRef.current = renderer;
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    container.appendChild(gl.canvas);

    const geometry = new Triangle(gl);

    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uHue: { value: hue },
        uHover: { value: hoverRef.current },
        uHoverIntensity: { value: hoverIntensity },
        uResolution: { value: [gl.canvas.width, gl.canvas.height] },
      },
      transparent: true,
    });
    programRef.current = program;

    const mesh = new Mesh(gl, { geometry, program });

    const resize = () => {
      if (!container || !renderer) return;
      renderer.setSize(container.offsetWidth, container.offsetHeight);
      if (program.uniforms.uResolution) {
        program.uniforms.uResolution.value = [container.offsetWidth, container.offsetHeight];
      }
    };
    resize();
    window.addEventListener('resize', resize);

    let startTime = performance.now();
    const animate = (now: number) => {
      animFrameRef.current = requestAnimationFrame(animate);
      const elapsed = (now - startTime) / 1000;

      if (program.uniforms.uTime) program.uniforms.uTime.value = elapsed;

      // Smooth hover transition
      const targetHover = forceHoverState || isHoveringRef.current ? 1.0 : 0.0;
      hoverRef.current += (targetHover - hoverRef.current) * 0.05;
      if (program.uniforms.uHover) program.uniforms.uHover.value = hoverRef.current;

      renderer.render({ scene: mesh });
    };
    animFrameRef.current = requestAnimationFrame(animate);

    const onMouseEnter = () => { isHoveringRef.current = true; };
    const onMouseLeave = () => { isHoveringRef.current = false; };

    if (rotateOnHover) {
      container.addEventListener('mouseenter', onMouseEnter);
      container.addEventListener('mouseleave', onMouseLeave);
    }

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
      container.removeEventListener('mouseenter', onMouseEnter);
      container.removeEventListener('mouseleave', onMouseLeave);
      if (gl.canvas.parentNode === container) {
        container.removeChild(gl.canvas);
      }
      renderer.gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [hue, hoverIntensity, rotateOnHover, forceHoverState]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        background: backgroundColor,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    />
  );
}
