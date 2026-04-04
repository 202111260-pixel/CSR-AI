import CountUp from 'react-countup';
import { useInView } from 'react-intersection-observer';
import { motion } from 'framer-motion';

const STATS = [
  { value: 115, suffix: '+', label: 'API Endpoints',   desc: 'REST endpoints across 17 route files' },
  { value: 22,  suffix: '',  label: 'Data Models',     desc: 'Prisma schema models & 7 enums' },
  { value: 11,  suffix: '',  label: 'Governorates',    desc: 'Full Oman regional coverage' },
  { value: 24,  suffix: '',  label: 'App Pages',       desc: 'React SPA with lazy loading' },
  { value: 96,  suffix: '/100', label: 'Maturity Score', desc: 'System maturity assessment' },
];

export function StatsSection() {
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true });

  return (
    <section
      ref={ref}
      style={{ background: '#09090b', padding: '80px 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>

        {/* label */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.18)', textTransform: 'uppercase', marginBottom: 48 }}
        >
          By the numbers
        </motion.p>

        {/* stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0 }}>
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              style={{
                padding: '32px 28px',
                borderRight: i < STATS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                position: 'relative',
              }}
            >
              {/* top accent line */}
              <div style={{ width: 24, height: 2, background: '#4ade80', marginBottom: 20, borderRadius: 99 }} />

              {/* number */}
              <div style={{ fontFamily: "'Caveat', cursive", fontSize: 'clamp(2.8rem, 4vw, 4rem)', fontWeight: 700, color: '#fff', lineHeight: 1, marginBottom: 10, letterSpacing: '-0.01em' }}>
                {inView ? (
                  <CountUp start={0} end={s.value} duration={2.2} separator="," suffix={s.suffix} />
                ) : (
                  <span style={{ opacity: 0 }}>{s.value}{s.suffix}</span>
                )}
              </div>

              {/* label */}
              <p style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                {s.label}
              </p>

              {/* desc */}
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.2)', lineHeight: 1.6, margin: 0 }}>
                {s.desc}
              </p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
