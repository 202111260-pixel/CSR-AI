import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { BlurFade } from '../components/BlurFade';

const FEATURES = [
  {
    label: 'Lifecycle',
    title: 'Every project.\nOne timeline.',
    description:
      'From planning to completion — milestones, team assignments, budget tracking, and status transitions. All in one view.',
    gradient: 'from-emerald-400 to-teal-500',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    label: 'Early Warning',
    title: 'Know before\nit breaks.',
    description:
      'AI scans every active project for budget overruns, timeline delays, and quality risks — then alerts you before they escalate.',
    gradient: 'from-amber-400 to-orange-500',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    label: 'Impact',
    title: 'Measure what\nactually matters.',
    description:
      'Track beneficiaries by gender, age, and region. Map every initiative to UN SDG goals. Show real impact, not just spend.',
    gradient: 'from-violet-400 to-purple-500',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    label: 'Finance',
    title: 'Transparent\ndown to the fils.',
    description:
      'Expense approval workflows, budget allocation views, utilization dashboards — and full export to PDF and Excel.',
    gradient: 'from-sky-400 to-blue-500',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
  },
];

export function FeaturesSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '15%']);

  return (
    <section ref={containerRef} className="relative overflow-hidden" style={{ background: '#000000' }}>
      {/* Ambient glow */}
      <motion.div className="pointer-events-none absolute inset-0" style={{ y: bgY }}>
        <div className="absolute left-1/2 top-[20%] -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-white/[0.015] blur-[200px]" />
      </motion.div>

      <div className="relative mx-auto max-w-[1200px] px-6 py-32 sm:py-40">
        {/* Header */}
        <BlurFade>
          <p className="font-['Geist_Mono',monospace] text-[11px] font-medium tracking-[0.3em] text-white/25 uppercase mb-6">
            Features
          </p>
          <h2
            className="text-white text-[clamp(2.6rem,5.5vw,4.8rem)] font-semibold leading-[1.05] tracking-[-0.03em] max-w-[600px] mb-6"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Built for organizations that take impact seriously.
          </h2>
          <p className="text-white/35 text-[17px] leading-[1.7] max-w-[480px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Four pillars that cover the entire CSR lifecycle — from the first project plan to the final board report.
          </p>
        </BlurFade>

        {/* Feature grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-4">
          {FEATURES.map((f, i) => (
            <BlurFade key={f.label} delay={0.08 * i}>
              <div
                className="group relative rounded-2xl p-8 sm:p-10 transition-colors duration-500 h-full"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(26,26,26,0.6)',
                }}
              >
                {/* Hover glow */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                  style={{ background: 'radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.03), transparent 40%)' }}
                />

                {/* Icon */}
                <div className={`mb-6 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} text-white/90`}>
                  {f.icon}
                </div>

                {/* Label */}
                <p className="font-['Geist_Mono',monospace] text-[10px] tracking-[0.25em] text-white/20 uppercase mb-4">
                  {f.label}
                </p>

                {/* Title */}
                <h3
                  className="text-white/90 text-[1.6rem] sm:text-[1.85rem] font-semibold leading-[1.15] tracking-[-0.02em] mb-4 whitespace-pre-line"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {f.title}
                </h3>

                {/* Description */}
                <p className="text-white/30 text-[14px] leading-[1.75] max-w-[380px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {f.description}
                </p>
              </div>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}
