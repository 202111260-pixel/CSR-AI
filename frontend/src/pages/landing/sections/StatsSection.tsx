import CountUp from 'react-countup';
import { useInView } from 'react-intersection-observer';
import { BlurFade } from '../components/BlurFade';

const STATS = [
  { value: 115, suffix: '+', label: 'API Endpoints', mono: true },
  { value: 22, suffix: '', label: 'Data Models', mono: true },
  { value: 11, suffix: '', label: 'Governorates Covered', mono: false },
  { value: 2847, suffix: '+', label: 'Beneficiaries Tracked', mono: false },
];

export function StatsSection() {
  const { ref, inView } = useInView({ threshold: 0.3, triggerOnce: true });

  return (
    <section ref={ref} className="relative overflow-hidden py-28 sm:py-36 px-6" style={{ background: '#09090b' }}>
      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="relative mx-auto max-w-[1000px]">
        <BlurFade>
          <p className="font-['Geist_Mono',monospace] text-[11px] font-medium tracking-[0.3em] text-white/20 uppercase text-center mb-16">
            By the numbers
          </p>
        </BlurFade>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-14 gap-x-6">
          {STATS.map((s, i) => (
            <BlurFade key={s.label} delay={i * 0.08}>
              <div className="text-center">
                <div
                  className="text-[3rem] sm:text-[3.8rem] font-bold text-white leading-none tracking-[-0.04em] mb-3"
                  style={{ fontFamily: s.mono ? "'Geist_Mono', monospace" : "'DM Sans', sans-serif" }}
                >
                  {inView ? (
                    <CountUp start={0} end={s.value} duration={2.4} separator="," suffix={s.suffix} />
                  ) : (
                    <span className="opacity-0">{s.value}{s.suffix}</span>
                  )}
                </div>
                <p className="text-[12px] text-white/25 font-medium tracking-wide" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {s.label}
                </p>
              </div>
            </BlurFade>
          ))}
        </div>
      </div>

      {/* Bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </section>
  );
}
