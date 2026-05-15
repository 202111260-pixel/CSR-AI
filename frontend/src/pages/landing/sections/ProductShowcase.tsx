import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { BlurFade } from '../components/BlurFade';

export function ProductShowcase() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const scale = useTransform(scrollYProgress, [0, 0.4], [0.88, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.25], [0, 1]);
  const borderRadius = useTransform(scrollYProgress, [0, 0.4], [40, 16]);

  return (
    <section ref={sectionRef} className="relative overflow-hidden py-32 sm:py-44 px-6" style={{ background: '#fafafa' }}>
      {/* Subtle dot pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: 'radial-gradient(circle, #d4d4d4 0.5px, transparent 0.5px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative mx-auto max-w-[1200px]">
        {/* Header */}
        <div className="text-center mb-16">
          <BlurFade>
            <p className="font-['Geist_Mono',monospace] text-[11px] font-medium tracking-[0.3em] text-neutral-400 uppercase mb-5">
              The Dashboard
            </p>
          </BlurFade>
          <BlurFade delay={0.06}>
            <h2
              className="text-neutral-900 text-[clamp(2.4rem,5vw,4.2rem)] font-semibold leading-[1.08] tracking-[-0.03em] mb-5"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Everything you need.<br />
              <span className="text-neutral-300">Nothing you don't.</span>
            </h2>
          </BlurFade>
          <BlurFade delay={0.12}>
            <p className="text-neutral-400 text-[16px] leading-[1.7] max-w-[460px] mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              KPIs, project maps, budget trends, risk alerts, and AI insights — all on a single screen.
            </p>
          </BlurFade>
        </div>

        {/* Dashboard mockup */}
        <motion.div
          style={{ scale, opacity, borderRadius }}
          className="relative mx-auto max-w-[1080px] overflow-hidden shadow-[0_32px_128px_rgba(0,0,0,0.08)]"
        >
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-5 py-3.5" style={{ background: '#f5f5f5', borderBottom: '1px solid #e5e5e5' }}>
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
            </div>
            <div
              className="flex-1 mx-8 py-1 px-3 rounded-md text-[11px] text-neutral-400 text-center"
              style={{ background: '#ebebeb', fontFamily: "'Geist_Mono', monospace" }}
            >
              csrplatform.om/dashboard
            </div>
          </div>

          {/* Dashboard content simulation */}
          <div className="p-6 sm:p-8" style={{ background: '#ffffff' }}>
            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Active Projects', value: '24', change: '+3', color: '#10b981' },
                { label: 'Total Budget', value: 'OMR 2.4M', change: '+12%', color: '#10b981' },
                { label: 'Beneficiaries', value: '2,847', change: '+186', color: '#10b981' },
                { label: 'Risk Alerts', value: '5', change: '-2', color: '#f59e0b' },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-xl p-4" style={{ background: '#fafafa', border: '1px solid #f0f0f0' }}>
                  <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>{kpi.label}</p>
                  <p className="text-[1.4rem] font-bold text-neutral-900 leading-none tracking-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>{kpi.value}</p>
                  <p className="text-[11px] font-medium mt-1" style={{ color: kpi.color }}>{kpi.change}</p>
                </div>
              ))}
            </div>

            {/* Chart area + sidebar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Main chart placeholder */}
              <div className="sm:col-span-2 rounded-xl p-5" style={{ background: '#fafafa', border: '1px solid #f0f0f0' }}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[12px] font-semibold text-neutral-700" style={{ fontFamily: "'DM Sans', sans-serif" }}>Budget Utilization</p>
                  <div className="flex gap-3">
                    {['6M', '1Y', 'All'].map((t) => (
                      <span key={t} className={`text-[10px] font-medium px-2 py-0.5 rounded ${t === '1Y' ? 'bg-neutral-900 text-white' : 'text-neutral-400'}`}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Simulated chart bars */}
                <div className="flex items-end gap-2 h-[100px]">
                  {[45, 62, 38, 78, 55, 89, 72, 94, 60, 85, 70, 92].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i === 11 ? '#000000' : i > 8 ? '#a3a3a3' : '#e5e5e5' }} />
                  ))}
                </div>
              </div>

              {/* Side panel */}
              <div className="rounded-xl p-5" style={{ background: '#fafafa', border: '1px solid #f0f0f0' }}>
                <p className="text-[12px] font-semibold text-neutral-700 mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>Recent Activity</p>
                <div className="space-y-3">
                  {[
                    { action: 'Project approved', time: '2m ago' },
                    { action: 'Budget alert resolved', time: '15m ago' },
                    { action: 'New beneficiary data', time: '1h ago' },
                    { action: 'Report exported', time: '3h ago' },
                  ].map((a) => (
                    <div key={a.action} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-neutral-600 truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>{a.action}</p>
                        <p className="text-[10px] text-neutral-300" style={{ fontFamily: "'Geist_Mono', monospace" }}>{a.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
