import { motion } from 'framer-motion';
import { useTypewriter } from '../../hooks/useTypewriter';
import { useTheme } from '../../hooks/useTheme';
import { Brain, TrendingUp, Shield, Sparkles, Check, AlertCircle, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

export type AgentStatus = 'waiting' | 'analyzing' | 'complete' | 'error';

export interface AgentCardProps {
  agentId: string;
  agentName: string;
  model: string;
  tag?: string;
  status: AgentStatus;
  color: string;
  analysis?: string;
  keyFindings?: string[];
  error?: string;
  index?: number;
}

const AGENT_ICONS: Record<string, ReactNode> = {
  financial: <TrendingUp size={20} />,
  impact: <Sparkles size={20} />,
  risk: <Shield size={20} />,
};

function StatusPill({ status, color }: { status: AgentStatus; color: string }) {
  const labels: Record<AgentStatus, string> = {
    waiting: 'Queued',
    analyzing: 'Running',
    complete: 'Done',
    error: 'Error',
  };

  const pillColor =
    status === 'complete' ? '#34d399' :
    status === 'error' ? '#f87171' :
    status === 'analyzing' ? color : '#6b7280';

  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderRadius: 999,
        background: `${pillColor}15`,
        color: pillColor,
        fontSize: 9.5, fontWeight: 700,
        letterSpacing: '0.18em', textTransform: 'uppercase',
        fontFamily: 'ui-monospace, SF Mono, monospace',
      }}
    >
      {status === 'analyzing' && <Loader2 size={9} className="animate-spin" />}
      {status === 'complete' && <Check size={9} strokeWidth={3} />}
      {status === 'error' && <AlertCircle size={9} strokeWidth={2.5} />}
      {status === 'waiting' && (
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: pillColor, opacity: 0.7 }} />
      )}
      {labels[status]}
    </span>
  );
}

export function AgentCard({
  agentId,
  agentName,
  model,
  tag,
  status,
  color,
  analysis,
  keyFindings,
  error,
  index = 0,
}: AgentCardProps) {
  const { colors } = useTheme();

  const { displayed, done } = useTypewriter({
    text: analysis ?? '',
    speed: 6,
    enabled: status === 'complete' && !!analysis,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.35 }}
      className="flex flex-col rounded-2xl border overflow-hidden"
      style={{
        borderColor: status === 'analyzing' ? `${color}60` : colors.border,
        background: colors.card,
        boxShadow: status === 'analyzing' ? `0 0 24px ${color}12` : undefined,
      }}
    >
      {/* ── Header — editorial hierarchy ── */}
      <div
        style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 12, padding: '18px 20px',
          borderBottom: `1px solid ${colors.border}`,
          position: 'relative',
        }}
      >
        {/* Subtle accent rail when active */}
        {status === 'analyzing' && (
          <div style={{
            position: 'absolute', top: 0, left: 20, width: 36, height: 2,
            background: color,
          }} />
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: 40, height: 40, borderRadius: 11,
              background: `${color}12`,
              border: `1px solid ${color}28`,
              color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {AGENT_ICONS[agentId] ?? <Brain size={20} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              color: colors.textDim, fontSize: 9.5, fontWeight: 700,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              marginBottom: 3,
            }}>
              {tag || 'Specialist'}
            </div>
            <h3 style={{
              margin: 0,
              color: colors.textHi,
              fontSize: 15, fontWeight: 700,
              letterSpacing: '-0.015em',
              lineHeight: 1.2,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {agentName}
            </h3>
            <div style={{
              color: colors.textLo, fontSize: 10.5,
              fontFamily: 'ui-monospace, SF Mono, monospace',
              letterSpacing: '0.02em',
              marginTop: 3,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {model}
            </div>
          </div>
        </div>
        <StatusPill status={status} color={color} />
      </div>

      {/* ── Body ── */}
      <div className="flex-1 px-5 py-4 space-y-3 overflow-y-auto max-h-[480px]" style={{ scrollbarWidth: 'thin' }}>
        {/* Waiting / Idle */}
        {status === 'waiting' && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div style={{ color: `${color}30` }}>
              {AGENT_ICONS[agentId] ?? <Brain size={24} />}
            </div>
            <p className="text-xs mt-2" style={{ color: colors.textDim }}>Waiting for analysis to start</p>
          </div>
        )}

        {/* Analyzing — animated progress bars */}
        {status === 'analyzing' && (
          <div className="space-y-3 py-3">
            {[95, 70, 50].map((w, i) => (
              <div key={i} className="h-2 rounded-full overflow-hidden" style={{ background: `${colors.border}60` }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${w}%` }}
                  transition={{ duration: 1.5, delay: i * 0.2, repeat: Infinity, repeatType: 'reverse' }}
                />
              </div>
            ))}
            <p className="text-[11px] text-center mt-3" style={{ color: colors.textDim }}>
              Processing via {model.split('/').pop()}…
            </p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && error && (
          <p className="text-xs" style={{ color: '#dc2626' }}>{error}</p>
        )}

        {/* Complete — typewriter text */}
        {(status === 'complete' || status === 'error') && analysis && (
          <div>
            <p
              className="text-[12px] leading-[1.8] whitespace-pre-wrap"
              style={{ color: colors.textMd }}
            >
              {displayed}
              {!done && (
                <span
                  className="inline-block w-[2px] h-3.5 ml-0.5 align-middle animate-pulse"
                  style={{ background: color }}
                />
              )}
            </p>

            {/* Key findings pills */}
            {done && keyFindings && keyFindings.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-1.5 mt-3 pt-3"
                style={{ borderTop: `1px solid ${colors.border}60` }}
              >
                {keyFindings.slice(0, 5).map((f, i) => (
                  <span
                    key={i}
                    className="inline-block px-2.5 py-1 rounded-full text-[10px] font-medium"
                    style={{ background: `${color}12`, color, border: `1px solid ${color}20` }}
                  >
                    {f}
                  </span>
                ))}
              </motion.div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
