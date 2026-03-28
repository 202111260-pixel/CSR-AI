import React, { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { BackgroundLines } from '../components/BackgroundLines';
import createGlobe from 'cobe';

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1], delay },
});

export function HeroSection() {
  return (
    <section className="relative flex flex-col overflow-hidden" style={{ minHeight: '100vh' }}>
      {/* Subtle noise texture for depth */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: '128px 128px',
        }}
      />

      {/* Soft radial glow accents */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-[20%] h-[360px] w-[360px] rounded-full bg-[#A8B89A]/20 blur-[140px]" />
        <div className="absolute right-[15%] bottom-[30%] h-[280px] w-[280px] rounded-full bg-[#C8D830]/8 blur-[120px]" />
      </div>

      {/* Navbar spacer */}
      <div className="h-20 lg:h-24 shrink-0" />

      {/* ── HERO CONTENT ── */}
      <div className="flex-1 flex items-end justify-center pb-4">
        <div className="w-full max-w-[900px] mx-auto px-6 sm:px-8 text-center">
            <BackgroundLines className="rounded-2xl" svgOptions={{ duration: 8 }} lineColor="#0a0a0a">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex items-center justify-center gap-2.5 mb-5"
              >
                <span className="w-[5px] h-[5px] rounded-full bg-[#1A201A]/50" />
                <span className="text-[13px] font-medium text-[#1A201A]/45 tracking-wide">
                  AI-Powered
                </span>
              </motion.div>

              {/* Title */}
              <div className="relative">
                <motion.h1
                  {...fadeUp(0.4)}
                  className="relative z-10 text-[#1A201A] leading-[1.12] tracking-[-0.01em]"
                  style={{
                    fontFamily: "'Caveat', 'Parisienne', cursive",
                    fontSize: 'clamp(2.8rem, 5.5vw, 5.2rem)',
                    fontWeight: 700,
                  }}
                >
                  Meets Redefining
                  <br />
                  CSR with Intelligence
                </motion.h1>
              </div>
            </BackgroundLines>
        </div>
      </div>

      {/* ── Globe — half visible at bottom of section ── */}
      <div className="relative flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 1.0 }}
          className="relative h-60 w-full flex items-center justify-center md:h-60"
        >
          <Globe className="absolute -bottom-80 md:-bottom-72" />
        </motion.div>
      </div>


      {/* ── Hand-drawn charts ── */}
      <HandDrawnCharts />
    </section>
  );
}


/* ── Hand-drawn floating charts ── */
const CAVEAT: CSSProperties = { fontFamily: "'Caveat', cursive" };
const GLASS: CSSProperties = {
  background: 'rgba(255,255,255,0.55)',
  border: '1px solid rgba(30,40,20,0.12)',
  backdropFilter: 'blur(10px)',
  borderRadius: 14,
  padding: '10px 12px',
};

function HandDrawnCharts() {
  return (
    <>
      {/* ── Chart 1 : Line — top-left ── */}
      <motion.div
        className="absolute z-20 hidden lg:block"
        style={{ top: '14%', left: '4%' }}
        initial={{ opacity: 0, x: -24, rotate: -5 }}
        animate={{ opacity: 1, x: 0,  rotate: -5 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 1.5 }}
      >
        {/* arrow label */}
        <div style={{ ...CAVEAT, color: 'rgba(30,40,20,0.55)', fontSize: 13, fontWeight: 700, marginBottom: 4, marginLeft: 6 }}>
          impact rising ↗
        </div>
        <div style={{ ...GLASS, width: 162 }}>
          <svg width="138" height="68" viewBox="0 0 138 68" fill="none">
            {/* faint grid */}
            {[16, 32, 48, 64].map(y => (
              <line key={y} x1="0" y1={y} x2="138" y2={y} stroke="rgba(30,40,20,0.08)" strokeWidth="1" />
            ))}
            {/* area fill */}
            <path
              d="M 4 58 C 18 54 26 46 38 42 C 50 38 58 44 70 34 C 82 24 94 16 110 10 L 134 6 L 134 64 L 4 64 Z"
              fill="rgba(45,90,39,0.08)"
            />
            {/* main line — slightly wobbly */}
            <path
              d="M 4 58 C 18 54 26 46 38 42 C 50 38 58 44 70 34 C 82 24 94 16 110 10 L 134 6"
              stroke="rgba(45,90,39,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            />
            {/* dots at key points */}
            {[[4,58],[38,42],[70,34],[110,10],[134,6]].map(([x,y],i) => (
              <circle key={i} cx={x} cy={y} r={i===4?3.5:2} fill={i===4?'#2D5A27':'rgba(45,90,39,0.5)'} />
            ))}
            {/* hand-drawn arrow to peak */}
            <path d="M 118 22 Q 128 14 132 9" stroke="rgba(45,90,39,0.55)" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M 129 6 L 133 10 L 136 5" stroke="rgba(45,90,39,0.55)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            {/* peak label */}
            <text x="82" y="12" style={CAVEAT} fontSize="9" fill="rgba(45,90,39,0.8)">peak</text>
          </svg>
          <p style={{ ...CAVEAT, color: 'rgba(30,40,20,0.45)', fontSize: 11, marginTop: 2 }}>quarterly growth</p>
        </div>
      </motion.div>

      {/* ── Chart 2 : Bar — top-right ── */}
      <motion.div
        className="absolute z-20 hidden lg:block"
        style={{ top: '14%', right: '4%' }}
        initial={{ opacity: 0, x: 24, rotate: 5 }}
        animate={{ opacity: 1, x: 0,  rotate: 5 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 1.8 }}
      >
        {/* arrow label */}
        <div style={{ ...CAVEAT, color: 'rgba(30,40,20,0.55)', fontSize: 13, fontWeight: 700, marginBottom: 4, textAlign: 'right', marginRight: 6 }}>
          ← budget spread
        </div>
        <div style={{ ...GLASS, width: 148 }}>
          <svg width="124" height="64" viewBox="0 0 124 64" fill="none">
            {/* baseline */}
            <line x1="0" y1="60" x2="124" y2="60" stroke="rgba(30,40,20,0.12)" strokeWidth="1" />
            {/* bars */}
            {[
              { x: 6,  h: 28, accent: true },
              { x: 24, h: 42 },
              { x: 42, h: 20 },
              { x: 60, h: 52, accent: true },
              { x: 78, h: 36 },
              { x: 96, h: 44 },
            ].map((b, i) => (
              <g key={i}>
                <rect
                  x={b.x} y={60 - b.h} width={14} height={b.h} rx={3}
                  fill={b.accent ? 'rgba(45,90,39,0.55)' : 'rgba(45,90,39,0.18)'}
                />
                {/* slightly wobbly top edge illusion */}
                <line x1={b.x} y1={60 - b.h} x2={b.x+14} y2={60 - b.h - 0.8} stroke="rgba(45,90,39,0.2)" strokeWidth="1" />
              </g>
            ))}
            {/* hand-drawn arrow pointing at tallest bar */}
            <path d="M 58 10 Q 62 6 66 10" stroke="rgba(45,90,39,0.55)" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M 63 7 L 66 11 L 70 8" stroke="rgba(45,90,39,0.55)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <text x="30" y="9" style={CAVEAT} fontSize="9" fill="rgba(45,90,39,0.8)">highest</text>
          </svg>
          <p style={{ ...CAVEAT, color: 'rgba(30,40,20,0.45)', fontSize: 11, marginTop: 2 }}>budget by category</p>
        </div>
      </motion.div>

      {/* ── Stat Badge — left ── */}
      <motion.div
        className="absolute z-20 hidden lg:block"
        style={{ top: '37%', left: '4%' }}
        initial={{ opacity: 0, x: -20, rotate: -6 }}
        animate={{ opacity: 1, x: 0,  rotate: -6 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 2.0 }}
      >
        <div style={{ ...GLASS, width: 142 }}>
          <p style={{ ...CAVEAT, color: 'rgba(30,40,20,0.5)', fontSize: 11 }}>total beneficiaries</p>
          <p style={{ color: '#1A201A', fontSize: 32, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1px' }}>2,847</p>
          <svg width="90" height="12" viewBox="0 0 90 12" fill="none">
            <path d="M 2 9 Q 25 5 45 8 Q 65 11 88 6" stroke="rgba(45,90,39,0.6)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <p style={{ ...CAVEAT, color: 'rgba(30,40,20,0.4)', fontSize: 10, marginTop: 2 }}>across 11 governorates</p>
        </div>
      </motion.div>

      {/* ── Avatar Stack — right ── */}
      <motion.div
        className="absolute z-20 hidden lg:block"
        style={{ top: '38%', right: '4%' }}
        initial={{ opacity: 0, x: 20, rotate: -4 }}
        animate={{ opacity: 1, x: 0,  rotate: -4 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 2.1 }}
      >
        <div style={{ ...CAVEAT, color: 'rgba(30,40,20,0.55)', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
          48 teams active ↗
        </div>
        <div style={{ ...GLASS, width: 140 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
            {(['#b91c1c','#7c3aed','#1d4ed8','#15803d'] as string[]).map((c, i) => (
              <div key={i} style={{
                width: 28, height: 28, borderRadius: '50%', background: c,
                border: '2px solid rgba(200,210,185,0.9)', marginLeft: i === 0 ? 0 : -10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: 'sans-serif', zIndex: 4 - i,
              }}>
                {['A','M','S','K'][i]}
              </div>
            ))}
            <span style={{ ...CAVEAT, color: 'rgba(30,40,20,0.65)', fontSize: 13, marginLeft: 8 }}>+44</span>
          </div>
          <svg width="116" height="8" viewBox="0 0 116 8" fill="none">
            <path d="M 2 6 Q 35 3 58 5 Q 82 7 114 4" stroke="rgba(45,90,39,0.4)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p style={{ ...CAVEAT, color: 'rgba(30,40,20,0.4)', fontSize: 11, marginTop: 3 }}>team members</p>
        </div>
      </motion.div>

      {/* ── Progress Ring — left bottom ── */}
      <motion.div
        className="absolute z-20 hidden lg:block"
        style={{ top: '66%', left: '4%' }}
        initial={{ opacity: 0, x: -20, rotate: -5 }}
        animate={{ opacity: 1, x: 0,  rotate: -5 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 2.35 }}
      >
        <div style={{ ...CAVEAT, color: 'rgba(30,40,20,0.5)', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>budget utilized</div>
        <div style={{ ...GLASS, width: 116, display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="26" r="20" stroke="rgba(30,40,20,0.1)" strokeWidth="6" />
            <circle cx="26" cy="26" r="20" stroke="rgba(45,90,39,0.85)" strokeWidth="6"
              strokeDasharray="100 126" strokeDashoffset="31" strokeLinecap="round"
              transform="rotate(-90 26 26)" />
            <text x="26" y="30" textAnchor="middle" style={CAVEAT} fontSize="11" fontWeight="700" fill="rgba(30,40,20,0.9)">78%</text>
          </svg>
          <p style={{ ...CAVEAT, color: 'rgba(30,40,20,0.4)', fontSize: 10, lineHeight: 1.4 }}>of annual<br />budget</p>
        </div>
      </motion.div>

    </>
  );
}

/* ── Globe (cobe) ── */
function Globe({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let phi = 0;
    if (!canvasRef.current) return;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 600 * 2,
      height: 600 * 2,
      phi: 0,
      theta: 0,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.3, 0.3, 0.3],
      markerColor: [0.4, 0.7, 1.0],
      glowColor: [0.12, 0.12, 0.12],
      markers: [
        { location: [23.588, 58.3829], size: 0.08 },
        { location: [17.0151, 54.0924], size: 0.05 },
        { location: [24.4675, 56.741], size: 0.04 },
        { location: [22.9333, 57.5333], size: 0.04 },
      ],
      onRender: (state: Record<string, number>) => {
        state.phi = phi;
        phi += 0.01;
      },
    });

    return () => {
      globe.destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 600, height: 600, maxWidth: '100%', aspectRatio: 1 }}
      className={className}
    />
  );
}
