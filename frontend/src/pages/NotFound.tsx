import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

const P = {
  bg: '#0a0a0a', card: '#0a0a0a', border: '#1a1a1a',
  accent: '#C8A44E', textHi: 'rgba(255,255,255,0.96)', textMd: 'rgba(255,255,255,0.55)', textLo: 'rgba(255,255,255,0.32)',
};

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: P.bg }}
    >
      <div className="max-w-md w-full">
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Editorial eyebrow */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 9.5, fontWeight: 700,
            letterSpacing: '0.22em', textTransform: 'uppercase',
            color: P.textLo,
            fontFamily: 'ui-monospace, SF Mono, monospace',
            marginBottom: 14,
          }}>
            <span style={{ color: '#f87171' }}>404</span>
            <span style={{ width: 32, height: 1, background: P.border }} />
            <span>Route not found</span>
          </div>

          {/* Gold accent rail */}
          <div style={{ width: 18, height: 2, background: P.accent, marginBottom: 14 }} />

          {/* Headline */}
          <h1 style={{
            fontSize: 28, fontWeight: 700,
            color: P.textHi,
            letterSpacing: '-0.025em',
            lineHeight: 1.2,
            margin: 0,
          }}>
            This page wandered off.
          </h1>

          <p style={{
            fontSize: 13.5, color: P.textMd,
            marginTop: 12, marginBottom: 26,
            lineHeight: 1.6, maxWidth: '52ch',
          }}>
            The link you followed may be outdated, or the resource was archived. Use the controls below to return to a known surface.
          </p>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.005 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-4 py-2.5 text-[12.5px] font-semibold transition-colors"
              style={{ border: `1px solid ${P.border}`, color: P.textMd, borderRadius: 10, background: 'transparent', fontFamily: 'ui-monospace, SF Mono, monospace', letterSpacing: '0.04em' }}
            >
              <ArrowLeft size={14} />
              Go back
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.005 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-4 py-2.5 text-[12.5px] font-semibold"
              style={{ background: P.accent, color: P.bg, borderRadius: 10, letterSpacing: '0.01em', boxShadow: '0 1px 0 rgba(255,255,255,0.20) inset, 0 6px 18px rgba(200,164,78,0.18)' }}
            >
              <Home size={14} />
              Return to Dashboard
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
