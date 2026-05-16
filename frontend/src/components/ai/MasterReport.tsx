import { motion } from 'framer-motion';
import { useTypewriter } from '../../hooks/useTypewriter';
import { useTheme } from '../../hooks/useTheme';
import { PiBrainDuotone } from 'react-icons/pi';

interface MasterReportProps {
  summary: string;
  model: string;
  visible: boolean;
  confidence?: number;
  verdict?: string;
}

export function MasterReport({ summary, model, visible, confidence, verdict }: MasterReportProps) {
  const { colors } = useTheme();
  const accent = colors.accent;
  const { displayed, done } = useTypewriter({
    text: summary,
    speed: 4,
    enabled: visible && !!summary,
  });

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{
        position: 'relative',
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 20,
        overflow: 'hidden',
        marginTop: 16,
      }}
    >
      {/* Editorial accent rail (single weighted line, not rainbow gradient) */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: colors.border,
      }} />
      <div style={{
        position: 'absolute', top: 0, left: 24, width: 64, height: 2,
        background: accent,
      }} />

      <div style={{ padding: '26px 28px' }}>
        {/* Eyebrow row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 18, flexWrap: 'wrap', gap: 16,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            color: colors.textLo, fontSize: 10.5, fontWeight: 700,
            letterSpacing: '0.22em', textTransform: 'uppercase',
          }}>
            <PiBrainDuotone size={15} style={{ color: accent }} />
            Reconciliation
            <span style={{ width: 12, height: 1, background: colors.border }} />
            <span style={{ color: accent }}>Grand Master</span>
            <span style={{ width: 1, height: 9, background: colors.border }} />
            <span style={{
              color: colors.textDim,
              fontFamily: 'ui-monospace, SF Mono, monospace',
              letterSpacing: '0.04em', textTransform: 'none',
            }}>
              {model}
            </span>
          </div>

          {confidence != null && (
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 8,
              padding: '6px 14px', borderRadius: 999,
              background: `${accent}10`,
              border: `1px solid ${accent}30`,
            }}>
              <span style={{
                color: colors.textLo, fontSize: 9.5, fontWeight: 700,
                letterSpacing: '0.18em', textTransform: 'uppercase',
              }}>
                Confidence
              </span>
              <span style={{
                color: accent, fontSize: 16, fontWeight: 700,
                fontFamily: 'ui-monospace, SF Mono, monospace',
                fontFeatureSettings: '"tnum"',
                letterSpacing: '-0.02em',
              }}>
                {confidence}
                <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 1 }}>%</span>
              </span>
            </div>
          )}
        </div>

        {/* Verdict heading — editorial, no Caveat */}
        {verdict && (
          <h3 style={{
            margin: 0,
            color: colors.textHi,
            fontSize: 24, fontWeight: 700,
            letterSpacing: '-0.025em',
            lineHeight: 1.15,
            maxWidth: '32ch',
          }}>
            {verdict}
          </h3>
        )}

        {/* Body */}
        <p style={{
          marginTop: verdict ? 14 : 0,
          color: colors.textMd,
          fontSize: 14,
          lineHeight: 1.75,
          letterSpacing: '-0.003em',
          whiteSpace: 'pre-wrap',
          maxWidth: '72ch',
        }}>
          {displayed}
          {!done && (
            <span
              className="animate-pulse"
              style={{
                display: 'inline-block', width: 2, height: 14,
                marginLeft: 2, verticalAlign: 'middle',
                background: accent,
              }}
            />
          )}
        </p>
      </div>
    </motion.div>
  );
}

