import React, { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { motion } from 'framer-motion';
import { StaggeredMenu } from './landing/components/StaggeredMenu';
import { HeroSection } from './landing/sections/HeroSection';
import { ShowcaseSection } from './landing/sections/ShowcaseSection';
import { FAQSection } from './landing/sections/FAQSection';
import api from '../services/api';

export default function LandingPage() {
  const lenisRef = useRef<Lenis | null>(null);

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
          { label: 'Home',      ariaLabel: 'Go to home',        link: '/landing' },
          { label: 'Dashboard', ariaLabel: 'Open dashboard',    link: '/dashboard' },
          { label: 'Projects',  ariaLabel: 'Browse projects',   link: '/projects' },
          { label: 'Partners',  ariaLabel: 'View partners',     link: '/partners' },
          { label: 'Reports',   ariaLabel: 'View reports',      link: '/reports/general' },
          { label: 'Sign In',   ariaLabel: 'Sign in to account',link: '/login' },
        ]}
        socialItems={[
          { label: 'GitHub',   link: 'https://github.com' },
          { label: 'LinkedIn', link: 'https://linkedin.com' },
          { label: 'Twitter',  link: 'https://twitter.com' },
        ]}
      />

      {/* Section 1 — Hero */}
      <div className="relative" style={{ background: '#FFFFFF' }}>
        <HeroSection />
      </div>

      {/* Section 2 — Showcase */}
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

      {/* Section 4 — Contact */}
      <ContactSection />
    </div>
  );
}

/* ── Contact Section ── */
function ContactSection() {
  const [email, setEmail]     = useState('');
  const [name, setName]       = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus]   = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    try {
      await api.post('/contact', { email: email.trim(), name: name.trim() || undefined, message: message.trim() || undefined });
      setStatus('success');
      setEmail(''); setName(''); setMessage('');
    } catch {
      setStatus('error');
    }
  }

  const input: React.CSSProperties = {
    width: '100%', background: '#111', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, padding: '13px 16px', color: '#fff', fontSize: 14,
    outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box',
  };

  return (
    <section style={{ background: '#000', padding: '100px 0 80px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }}>

        {/* LEFT — heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <h2 style={{ fontFamily: "'Caveat', cursive", fontSize: 'clamp(3rem, 5vw, 4.5rem)', fontWeight: 700, color: '#fff', lineHeight: 1.1, margin: '0 0 20px' }}>
            Interested in<br />joining the<br />platform?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, lineHeight: 1.7, maxWidth: 360, margin: 0 }}>
            اترك بريدك الإلكتروني وسنتواصل معك لمناقشة كيف يمكن للمنصة أن تخدم مؤسستك.
          </p>
        </motion.div>

        {/* RIGHT — form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {status === 'success' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12, padding: '40px 0' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p style={{ color: '#4ade80', fontSize: 18, fontWeight: 700, margin: 0 }}>تم الإرسال بنجاح!</p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: 0 }}>سنتواصل معك على بريدك الإلكتروني قريباً.</p>
              <button onClick={() => setStatus('idle')} style={{ marginTop: 8, background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', borderRadius: 8, padding: '8px 18px', fontSize: 13, cursor: 'pointer' }}>
                إرسال آخر
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                    الاسم (اختياري)
                  </label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="اسمك"
                    style={input}
                  />
                </div>
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                    البريد الإلكتروني *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    style={input}
                  />
                </div>
              </div>

              <div>
                <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                  رسالة (اختياري)
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="أخبرنا عن مؤسستك أو استفسارك..."
                  rows={4}
                  style={{ ...input, resize: 'vertical', minHeight: 100 }}
                />
              </div>

              {status === 'error' && (
                <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>حدث خطأ، يرجى المحاولة مرة أخرى.</p>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                style={{
                  background: status === 'loading' ? 'rgba(124,58,237,0.5)' : '#7c3aed',
                  color: '#fff', fontWeight: 700, fontSize: 15,
                  padding: '14px 32px', borderRadius: 10, border: 'none',
                  cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s', alignSelf: 'flex-start',
                }}
              >
                {status === 'loading' ? 'جارٍ الإرسال...' : 'تواصل معنا →'}
              </button>
            </form>
          )}
        </motion.div>
      </div>

      {/* footer line */}
      <div style={{ maxWidth: 1200, margin: '60px auto 0', padding: '0 48px', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, margin: 0 }}>CSR Platform © 2026 — Sultanate of Oman</p>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, margin: 0 }}>Powered by GitHub Models AI</p>
      </div>
    </section>
  );
}
