import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

/* ═══════════════════════════════════════════════════
   Aceternity-style Navbar Menu
   White / professional — rich dropdown panels
   ═══════════════════════════════════════════════════ */

const transition = {
  type: 'spring',
  mass: 0.5,
  damping: 11.5,
  stiffness: 100,
  restDelta: 0.001,
  restSpeed: 0.001,
};

const FONT = { fontFamily: "'DM Sans', sans-serif" };

/* ── Menu Container ── */
function Menu({
  setActive,
  children,
}: {
  setActive: (item: string | null) => void;
  children: React.ReactNode;
}) {
  return (
    <nav
      onMouseLeave={() => setActive(null)}
      className="relative rounded-full border border-black/[0.06] bg-white/80 backdrop-blur-2xl shadow-[0_1px_24px_rgba(0,0,0,0.06)] flex items-center justify-center gap-0.5 px-3 py-2.5"
    >
      {children}
    </nav>
  );
}

/* ── MenuItem ── */
function MenuItem({
  setActive,
  active,
  item,
  children,
  href,
  highlight,
}: {
  setActive: (item: string | null) => void;
  active: string | null;
  item: string;
  children?: React.ReactNode;
  href?: string;
  highlight?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <div onMouseEnter={() => setActive(item)} className="relative">
      <motion.button
        onClick={() => { if (href) navigate(href); }}
        className={`cursor-pointer text-[13px] font-semibold px-4 py-1.5 rounded-full transition-all duration-200 ${
          highlight
            ? 'bg-[#1A201A] text-white hover:bg-[#2D5A27]'
            : 'text-[#3A3F2F] hover:text-[#1A201A] hover:bg-black/[0.04]'
        }`}
        style={FONT}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {item}
      </motion.button>
      <AnimatePresence>
        {active === item && children && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 10 }}
            transition={transition}
          >
            <div className="absolute top-[calc(100%+1.2rem)] left-1/2 -translate-x-1/2">
              <motion.div
                transition={transition}
                layoutId="active-dropdown"
                className="bg-white rounded-2xl overflow-hidden border border-black/[0.06] shadow-[0_20px_70px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.03)]"
              >
                <motion.div layout className="w-max h-full p-5">
                  {children}
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── FeatureCard — icon + title + description ── */
function FeatureCard({
  icon,
  title,
  description,
  href,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  accent: string;
}) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(href)}
      className="flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-200 hover:bg-black/[0.02] group cursor-pointer w-full"
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
        style={{ background: `${accent}12`, border: `1px solid ${accent}20` }}
      >
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-bold text-[#1A201A] group-hover:text-[#2D5A27] transition-colors" style={FONT}>
          {title}
        </p>
        <p className="text-[11px] text-[#6B7260] leading-relaxed mt-0.5" style={FONT}>
          {description}
        </p>
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════════════
   SVG Icons (inline, small)
   ═══════════════════════════════════════════════════ */
const icons = {
  projects: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  add: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  ),
  map: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  ),
  archive: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  ),
  general: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  impact: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  financial: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  ),
  warning: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  mission: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  ),
  team: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  sdg: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  ),
  shield: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  rocket: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" />
    </svg>
  ),
  lightbulb: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" /><path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14" />
    </svg>
  ),
  partners: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.42 4.58a5.4 5.4 0 00-7.65 0l-.77.78-.77-.78a5.4 5.4 0 00-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z" />
    </svg>
  ),
};

/* ═══════════════════════════════════════════════════
   LandingNavbar — Main assembled component
   ═══════════════════════════════════════════════════ */

export function LandingNavbar() {
  const [active, setActive] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const lastScrollY = useRef(0);
  const accum = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY.current;
      lastScrollY.current = y;

      setScrolled(y > 20);

      if ((delta > 0 && accum.current < 0) || (delta < 0 && accum.current > 0)) {
        accum.current = 0;
      }
      accum.current += delta;

      if (accum.current > 50 && y > 100) {
        setVisible(false);
        setActive(null);
      } else if (accum.current < -30 || y <= 50) {
        setVisible(true);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{
        y: visible ? 0 : -100,
        opacity: visible ? 1 : 0,
      }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-4 inset-x-0 max-w-[720px] mx-auto z-50 hidden md:block px-4"
      style={{
        filter: scrolled ? 'drop-shadow(0 4px 20px rgba(0,0,0,0.06))' : 'none',
      }}
    >
      <Menu setActive={setActive}>
        {/* ── Logo ── */}
        <a href="/landing" className="flex items-center mr-2 pl-1 pr-3">
          <img src="/logo2.png" alt="CSR" className="w-6 h-6 object-contain" />
        </a>

        {/* ── About Us ── */}
        <MenuItem setActive={setActive} active={active} item="About">
          <div className="grid grid-cols-[200px_1fr] gap-5" style={{ width: 520 }}>
            {/* Left — Brand statement */}
            <div className="bg-gradient-to-br from-[#2D5A27] to-[#1A3518] rounded-xl p-5 flex flex-col justify-between text-white">
              <div>
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center mb-3">
                  <img src="/logo2.png" alt="CSR" className="w-5 h-5 object-contain brightness-0 invert" />
                </div>
                <h3 className="text-[15px] font-black leading-tight" style={FONT}>
                  CSR Platform
                </h3>
                <p className="text-[11px] text-white/70 mt-2 leading-relaxed" style={FONT}>
                  Empowering Oman's social responsibility through data-driven impact management.
                </p>
              </div>
              <div className="flex items-center gap-1.5 mt-4">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80] shadow-[0_0_6px_#4ade80]" />
                <span className="text-[10px] text-white/50" style={FONT}>Live Platform</span>
              </div>
            </div>

            {/* Right — Feature cards */}
            <div className="flex flex-col gap-0.5">
              <FeatureCard
                icon={icons.mission}
                title="Our Mission"
                description="Track, measure, and optimize CSR initiatives across Oman's 11 governorates."
                href="/landing"
                accent="#2D5A27"
              />
              <FeatureCard
                icon={icons.sdg}
                title="SDG Alignment"
                description="Every project maps to UN Sustainable Development Goals for global impact."
                href="/reports/impact"
                accent="#0ea5e9"
              />
              <FeatureCard
                icon={icons.shield}
                title="Transparency & Trust"
                description="Real-time budgets, auditable expenses, and full activity logging."
                href="/reports/financial"
                accent="#8b5cf6"
              />
            </div>
          </div>
        </MenuItem>

        {/* ── Platform ── */}
        <MenuItem setActive={setActive} active={active} item="Platform">
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5" style={{ width: 480 }}>
            <FeatureCard
              icon={icons.projects}
              title="Project Management"
              description="Full lifecycle from planning to completion with milestones and teams."
              href="/projects"
              accent="#2D5A27"
            />
            <FeatureCard
              icon={icons.general}
              title="Smart Reports"
              description="General, Impact, and Financial reports with export to PDF & Excel."
              href="/reports/general"
              accent="#f59e0b"
            />
            <FeatureCard
              icon={icons.map}
              title="Map View"
              description="Interactive map of all projects across Oman's governorates."
              href="/map"
              accent="#0ea5e9"
            />
            <FeatureCard
              icon={icons.warning}
              title="Early Warning"
              description="AI-powered alerts for budget, timeline, and quality risks."
              href="/early-warning"
              accent="#ef4444"
            />
            <FeatureCard
              icon={icons.rocket}
              title="AI Analytics"
              description="Predictions and insights powered by GitHub Models AI."
              href="/future"
              accent="#8b5cf6"
            />
            <FeatureCard
              icon={icons.lightbulb}
              title="Ideas Hub"
              description="Employee idea submission with voting and community engagement."
              href="/ideas"
              accent="#fbbf24"
            />
          </div>
        </MenuItem>

        {/* ── Impact ── */}
        <MenuItem setActive={setActive} active={active} item="Impact">
          <div className="flex flex-col gap-0.5" style={{ width: 280 }}>
            <FeatureCard
              icon={icons.team}
              title="Beneficiaries"
              description="Track demographics — gender, age, disability — for every project."
              href="/reports/impact"
              accent="#2D5A27"
            />
            <FeatureCard
              icon={icons.partners}
              title="Partners & Donations"
              description="Corporate partners, individual donors, and fundraising challenges."
              href="/partners"
              accent="#e11d48"
            />
            <FeatureCard
              icon={icons.financial}
              title="Financial Tracking"
              description="Budget allocation, expense approval workflow, and utilization insights."
              href="/reports/financial"
              accent="#0ea5e9"
            />
          </div>
        </MenuItem>

        {/* ── Dashboard — direct link ── */}
        <MenuItem setActive={setActive} active={active} item="Dashboard" href="/dashboard" />

        {/* ── Sign In — highlighted ── */}
        <MenuItem setActive={setActive} active={active} item="Sign In" href="/login" highlight />
      </Menu>
    </motion.div>
  );
}
