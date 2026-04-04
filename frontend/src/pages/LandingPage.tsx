import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { motion } from 'framer-motion';
import { StaggeredMenu } from './landing/components/StaggeredMenu';
import { PrimaryHeroSection } from './landing/sections/PrimaryHeroSection';
import { HeroSection } from './landing/sections/HeroSection';
import { ShowcaseSection } from './landing/sections/ShowcaseSection';
import { FAQSection } from './landing/sections/FAQSection';
import Stepper, { Step } from './landing/components/Stepper';
import Marquee from 'react-fast-marquee';
import { SiReact, SiTypescript, SiNodedotjs, SiExpress, SiPostgresql, SiPrisma, SiTailwindcss, SiVite, SiJsonwebtokens, SiZod, SiGithub } from 'react-icons/si';
import { TbBrandFramerMotion } from 'react-icons/tb';
import { BiChart } from 'react-icons/bi';
import { FaLeaf, FaShieldAlt, FaLock } from 'react-icons/fa';
import api from '../services/api';

// Disable browser scroll restoration at module load time (before any render)
if (typeof window !== 'undefined' && 'scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}


export default function LandingPage() {
  const lenisRef = useRef<Lenis | null>(null);

  // Runs synchronously before browser paint — resets scroll before user sees anything
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  return (
    <div className="landing-page min-h-screen antialiased" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <StaggeredMenu
        isFixed
        position="right"
        logoText="nion®"
        menuButtonColor="#1A201A"
        openMenuButtonColor="#ffffff"
        changeMenuColorOnOpen={true}
        colors={['#B9C3AF', '#4A7C3F', '#2D5A27']}
        accentColor="#2D5A27"
        displayItemNumbering
        displaySocials
        items={[
          { label: 'Home',      ariaLabel: 'Go to home',         link: '/landing' },
          { label: 'Dashboard', ariaLabel: 'Open dashboard',     link: '/dashboard' },
          { label: 'Projects',  ariaLabel: 'Browse projects',    link: '/projects' },
          { label: 'Partners',  ariaLabel: 'View partners',      link: '/partners' },
          { label: 'Reports',   ariaLabel: 'View reports',       link: '/reports/general' },
          { label: 'Sign In',   ariaLabel: 'Sign in to account', link: '/login' },
        ]}
        socialItems={[
          { label: 'GitHub',   link: 'https://github.com' },
          { label: 'LinkedIn', link: 'https://linkedin.com' },
          { label: 'Twitter',  link: 'https://twitter.com' },
        ]}
      />

      {/* Section 1 — Primary Hero (BounceCards) */}
      <PrimaryHeroSection />

      {/* Section 2 — Hero (Threads + Globe) */}
      <div className="relative" style={{ background: '#FFFFFF' }}>
        <HeroSection />
      </div>

      {/* Section 3 — Showcase */}
      <ShowcaseSection />

      {/* Section 3 — FAQ */}
      <section style={{ background: '#fff', padding: '100px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px', display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 80, alignItems: 'start' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            style={{ position: 'sticky', top: 100 }}
          >
            <h2 style={{ fontFamily: "'Caveat', cursive", fontSize: 'clamp(3rem, 5vw, 4.5rem)', fontWeight: 700, color: '#1a1a1a', lineHeight: 1.1, margin: 0 }}>
              Frequently asked<br />questions
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <FAQSection />
          </motion.div>
        </div>
      </section>

      {/* Section 4 — Contact (Stepper) */}
      <ContactSection />
    </div>
  );
}

/* ── Contact Section with Stepper ───────────────────────────────────────── */
function ContactSection() {
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [message, setMessage] = useState('');
  const [status,  setStatus]  = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleSubmit() {
    if (!email.trim()) return;
    setStatus('loading');
    try {
      await api.post('/contact', {
        email:   email.trim(),
        name:    name.trim()    || undefined,
        message: message.trim() || undefined,
      });
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: '12px 16px',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: 8,
    fontFamily: "'Geist Mono', monospace",
  };

  const green = '#4ade80';
  const greenDim = 'rgba(74,222,128,0.5)';

  return (
    <section style={{ background: '#000', padding: '100px 0 80px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }}>

        {/* LEFT — Stepper form + decorative shapes */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{ position: 'relative' }}
        >
          {/* ── Decorative elements (outside form, overflow visible) ── */}

          {/* Top-left: curved arrow sweeping down into form */}
          <motion.svg
            initial={{ opacity: 0, pathLength: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.5 }}
            width="90" height="90" viewBox="0 0 90 90" fill="none"
            style={{ position: 'absolute', top: -70, left: -50, pointerEvents: 'none', overflow: 'visible' }}
          >
            <path d="M18 8 C 22 42, 52 55, 72 72" stroke={green} strokeWidth="2" strokeLinecap="round" fill="none" strokeDasharray="5 4" />
            <path d="M63 76 L72 72 L68 62" stroke={green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </motion.svg>

          {/* Top-right: sparkle 4-point star */}
          <motion.svg
            animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            width="32" height="32" viewBox="0 0 32 32" fill="none"
            style={{ position: 'absolute', top: -50, right: -10, pointerEvents: 'none', overflow: 'visible' }}
          >
            <path d="M16 1 L18 12 L29 16 L18 20 L16 31 L14 20 L3 16 L14 12 Z" fill={greenDim} stroke={green} strokeWidth="0.8" />
          </motion.svg>

          {/* Right: vertical dashed line with arrow tip */}
          <motion.svg
            initial={{ opacity: 0, scaleY: 0 }}
            whileInView={{ opacity: 1, scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            width="16" height="120" viewBox="0 0 16 120" fill="none"
            style={{ position: 'absolute', top: 20, right: -52, pointerEvents: 'none', overflow: 'visible', transformOrigin: 'top' }}
          >
            <line x1="8" y1="0" x2="8" y2="100" stroke={green} strokeWidth="1.5" strokeDasharray="5 5" strokeLinecap="round" />
            <path d="M3 95 L8 105 L13 95" stroke={green} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </motion.svg>

          {/* Bottom-left: curved arrow going up-right */}
          <motion.svg
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.7 }}
            width="80" height="70" viewBox="0 0 80 70" fill="none"
            style={{ position: 'absolute', bottom: -60, left: -40, pointerEvents: 'none', overflow: 'visible' }}
          >
            <path d="M12 62 C 18 38, 44 22, 68 12" stroke={green} strokeWidth="2" strokeLinecap="round" fill="none" strokeDasharray="5 4" />
            <path d="M58 8 L68 12 L64 22" stroke={green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </motion.svg>

          {/* Bottom-right: spinning circle with dot */}
          <motion.svg
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            width="44" height="44" viewBox="0 0 44 44" fill="none"
            style={{ position: 'absolute', bottom: -40, right: -30, pointerEvents: 'none', overflow: 'visible' }}
          >
            <circle cx="22" cy="22" r="18" stroke={greenDim} strokeWidth="1.5" strokeDasharray="6 5" strokeLinecap="round" />
            <circle cx="22" cy="4" r="3" fill={green} />
          </motion.svg>

          {/* Floating dots */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{ position: 'absolute', top: -20, right: -32, width: 7, height: 7, borderRadius: '50%', background: green, pointerEvents: 'none' }}
          />
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            style={{ position: 'absolute', top: 80, right: -44, width: 5, height: 5, borderRadius: '50%', background: greenDim, pointerEvents: 'none' }}
          />

          {/* ── Form ── */}
          {status === 'success' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14, padding: '48px 8px' }}
            >
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p style={{ color: '#4ade80', fontSize: 18, fontWeight: 700, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>Sent successfully!</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>We'll reach out to you shortly at your email address.</p>
              <button
                onClick={() => { setStatus('idle'); setName(''); setEmail(''); setMessage(''); }}
                style={{ marginTop: 4, background: 'none', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)', borderRadius: 8, padding: '8px 18px', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
              >
                Send another
              </button>
            </motion.div>
          ) : (
            <Stepper
              backButtonText="Back"
              nextButtonText="Continue"
              onFinalStepCompleted={handleSubmit}
              nextButtonProps={{ disabled: status === 'loading' }}
            >
              {/* Step 1 — Name */}
              <Step>
                <p style={labelStyle}>Step 1 of 3</p>
                <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 600, margin: '0 0 6px', fontFamily: "'DM Sans', sans-serif" }}>
                  What's your name?
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: '0 0 20px', fontFamily: "'DM Sans', sans-serif" }}>
                  Optional — helps us address you personally
                </p>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Mohammed Al-Abri"
                  style={inputStyle}
                  autoFocus
                />
              </Step>

              {/* Step 2 — Email */}
              <Step>
                <p style={labelStyle}>Step 2 of 3</p>
                <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 600, margin: '0 0 6px', fontFamily: "'DM Sans', sans-serif" }}>
                  What's your email?
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: '0 0 20px', fontFamily: "'DM Sans', sans-serif" }}>
                  We'll send you access details at this address
                </p>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@company.com"
                  style={inputStyle}
                  autoFocus
                />
              </Step>

              {/* Step 3 — Message */}
              <Step>
                <p style={labelStyle}>Step 3 of 3</p>
                <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 600, margin: '0 0 6px', fontFamily: "'DM Sans', sans-serif" }}>
                  Tell us about your organization
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: '0 0 20px', fontFamily: "'DM Sans', sans-serif" }}>
                  Optional — what sector are you in and what do you need?
                </p>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="e.g. Private company in the education sector, looking for a tool to manage CSR initiatives..."
                  rows={4}
                  style={{ ...inputStyle, resize: 'none', minHeight: 110 }}
                  autoFocus
                />
                {status === 'error' && (
                  <p style={{ color: '#f87171', fontSize: 13, margin: '10px 0 0', fontFamily: "'DM Sans', sans-serif" }}>
                    Something went wrong, please try again.
                  </p>
                )}
              </Step>
            </Stepper>
          )}

        </motion.div>

        {/* RIGHT — heading */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          style={{ position: 'sticky', top: 100 }}
        >
          {/* Small label above heading */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            {/* tiny arrow pointing left toward form */}
            <svg width="36" height="14" viewBox="0 0 36 14" fill="none">
              <path d="M36 7 L6 7" stroke="#4ade80" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="3 3" />
              <path d="M10 3 L4 7 L10 11" stroke="#4ade80" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>
              Get in touch
            </span>
          </div>

          <h2 style={{ fontFamily: "'Caveat', cursive", fontSize: 'clamp(3rem, 5vw, 4.5rem)', fontWeight: 700, color: '#fff', lineHeight: 1.1, margin: '0 0 20px' }}>
            Interested in<br />joining the<br />platform?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 15, lineHeight: 1.8, maxWidth: 340, margin: '0 0 36px' }}>
            Leave your email and we'll get in touch to discuss how the platform can serve your organization.
          </p>

          {/* Trust badges */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {['Vision 2040 Aligned', 'Arabic & English support', 'AI-Powered insights'].map(text => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#4ade80', fontSize: 10 }}>✦</span>
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 17, fontFamily: "'Caveat', cursive" }}>{text}</span>
              </div>
            ))}
          </div>
        </motion.div>

      </div>

      {/* Tech stack marquee */}
      <div style={{ marginTop: 80, borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '18px 0', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(to right, #000, transparent)', zIndex: 2, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(to left, #000, transparent)', zIndex: 2, pointerEvents: 'none' }} />
        <Marquee speed={38} gradient={false} pauseOnHover>
          {([
            { name: 'React',         Icon: SiReact },
            { name: 'TypeScript',    Icon: SiTypescript },
            { name: 'Node.js',       Icon: SiNodedotjs },
            { name: 'Express',       Icon: SiExpress },
            { name: 'PostgreSQL',    Icon: SiPostgresql },
            { name: 'Prisma',        Icon: SiPrisma },
            { name: 'Tailwind CSS',  Icon: SiTailwindcss },
            { name: 'Framer Motion', Icon: TbBrandFramerMotion },
            { name: 'Vite',          Icon: SiVite },
            { name: 'GitHub Models', Icon: SiGithub },
            { name: 'JWT',           Icon: SiJsonwebtokens },
            { name: 'Zod',           Icon: SiZod },
            { name: 'Recharts',      Icon: BiChart },
            { name: 'Leaflet',       Icon: FaLeaf },
            { name: 'Helmet',        Icon: FaShieldAlt },
            { name: 'bcrypt',        Icon: FaLock },
          ] as { name: string; Icon: React.ComponentType<{ size?: number; color?: string }> }[]).map(({ name, Icon }) => (
            <div key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, margin: '0 28px' }}>
              <Icon size={16} color="#4ade80" />
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, letterSpacing: '0.04em', fontFamily: "'Geist Mono', monospace" }}>{name}</span>
            </div>
          ))}
        </Marquee>
      </div>

      {/* Footer line */}
      <div style={{ maxWidth: 1200, margin: '60px auto 0', padding: '32px 48px 0', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: 13, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>CSR Platform © 2026 — Sultanate of Oman</p>
        <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: 13, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>Powered by GitHub Models AI</p>
      </div>
    </section>
  );
}
