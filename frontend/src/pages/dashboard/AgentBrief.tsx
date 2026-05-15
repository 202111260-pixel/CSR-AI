/**
 * AgentBrief — Band 4
 * 3 horizontal AgentCapsule cards (Financial / Impact / Risk) + MasterReport panel.
 * Consolidates the old BentoChatCell and SidebarAiChat into one cohesive panel.
 */
import { useRef, useState, useLayoutEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { Send, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useTypewriter } from '../../hooks/useTypewriter';
import { aiAnalyticsService } from '../../services/aiAnalyticsService';
import type { AiChart, AgentResult } from '../../services/aiAnalyticsService';
import { EASE, FADE_UP, VP, GOLD } from './tokens';

/* ── Types ──────────────────────────────────────────────────────────────────── */
interface ChatMsg {
  from: 'user' | 'ai';
  text: string;
  charts?: AiChart[];
  findings?: string[];
  agentSummaries?: { id: string; name: string; model: string; color: string }[];
}

const AGENT_META = {
  financial: { id: 'financial', label: 'Financial',  color: '#3B82F6', emoji: '📊', desc: 'Budget & spend analysis' },
  impact:    { id: 'impact',    label: 'Impact',     color: '#10B981', emoji: '🌱', desc: 'Beneficiary & SDG metrics' },
  risk:      { id: 'risk',      label: 'Risk',       color: '#F59E0B', emoji: '⚠', desc: 'Alert & timeline scanning' },
} as const;

const SUGGESTED = [
  'How is budget utilization this quarter?',
  'Which projects need immediate attention?',
  'Summarize our CSR impact this year',
];

/* ── Main component ─────────────────────────────────────────────────────────── */
export function AgentBrief() {
  const { colors: P, isDark } = useTheme();
  const card   = isDark ? '#0a0a0a' : '#FFFFFF';
  const border = isDark ? '#1a1a1a' : '#E8E0CC';

  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: (q: string) => aiAnalyticsService.agentAnalyze(q, 'overview'),
    onSuccess: (res: any, q: string) => {
      const data = res?.data ?? res;
      const agentSummaries = (data?.agents ?? []).map((a: AgentResult) => ({
        id: a.agentId,
        name: a.agentName,
        model: a.model,
        color: AGENT_META[a.agentId as keyof typeof AGENT_META]?.color ?? GOLD,
      }));
      setMsgs(prev => [
        ...prev,
        { from: 'user', text: q },
        {
          from: 'ai',
          text: data?.masterReport?.summary ?? data?.analysis ?? 'No response.',
          charts: data?.masterReport?.chartData ?? data?.chartData ?? [],
          findings: data?.masterReport?.consensusFindings ?? data?.keyFindings ?? [],
          agentSummaries,
        },
      ]);
    },
    onError: () => {
      setMsgs(prev => [
        ...prev,
        { from: 'ai', text: "Sorry, the AI service is temporarily unavailable. Please try again shortly." },
      ]);
    },
  });

  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs]);

  const send = (q?: string) => {
    const query = (q ?? input).trim();
    if (!query || ask.isPending) return;
    setInput('');
    ask.mutate(query);
  };

  const hasConversation = msgs.length > 0;

  return (
    <motion.div
      variants={FADE_UP}
      initial="hidden"
      whileInView="show"
      viewport={VP}
      style={{
        background: card, border: `1px solid ${border}`,
        borderRadius: 20, overflow: 'hidden',
      }}
    >
      {/* ── Panel header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px 16px',
        borderBottom: `1px solid ${border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: `${GOLD}12`, border: `1px solid ${GOLD}28`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={15} color={GOLD} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.95)' : '#1A1A1A', letterSpacing: '-0.01em' }}>
              AI Intelligence Brief
            </p>
            <p style={{ margin: 0, fontSize: 9.5, color: isDark ? 'rgba(255,255,255,0.35)' : '#9A9490', fontFamily: "'Geist Mono', monospace", letterSpacing: '0.04em' }}>
              3 agents · ZenMux AI Gateway
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {ask.isPending && <LoadingDots />}
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              width: 28, height: 28, borderRadius: 8, border: `1px solid ${border}`,
              background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isDark ? 'rgba(255,255,255,0.4)' : '#9A9490',
            }}
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* ── Agent capsules row ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1,
        background: isDark ? '#1a1a1a' : '#E8E0CC',
        borderBottom: `1px solid ${border}`,
      }}>
        {Object.values(AGENT_META).map((agent, i) => (
          <AgentCapsule key={agent.id} agent={agent} delay={i * 0.07} isDark={isDark} isActive={ask.isPending} />
        ))}
      </div>

      {/* ── Content area ── */}
      <div style={{ padding: '0 24px 20px' }}>
        <AnimatePresence mode="wait">
          {!hasConversation ? (
            /* ── Empty state ── */
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ paddingTop: 28, paddingBottom: 8 }}
            >
              <EmptyState
                onSuggest={q => send(q)}
                isDark={isDark}
                P={P}
                border={border}
              />
            </motion.div>
          ) : (
            /* ── Conversation ── */
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div
                ref={scrollRef}
                style={{
                  maxHeight: expanded ? 600 : 320,
                  overflowY: 'auto',
                  paddingTop: 16,
                  paddingBottom: 4,
                  display: 'flex', flexDirection: 'column', gap: 10,
                  transition: 'max-height 0.4s ease',
                }}
              >
                {msgs.map((m, i) => (
                  <MessageBubble key={i} msg={m} isLatest={i === msgs.length - 1} isDark={isDark} P={P} border={border} />
                ))}
                {ask.isPending && <ThinkingBubble isDark={isDark} border={border} />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Input bar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginTop: 12, padding: '10px 14px',
          borderRadius: 14, border: `1px solid ${border}`,
          background: isDark ? '#121212' : '#FAF7F0',
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask the AI team a question…"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 12, color: isDark ? 'rgba(255,255,255,0.8)' : '#1A1A1A',
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || ask.isPending}
            style={{
              width: 28, height: 28, borderRadius: 8, border: 'none',
              background: input.trim() && !ask.isPending ? `${GOLD}20` : 'transparent',
              cursor: input.trim() && !ask.isPending ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}
          >
            <Send size={12} color={input.trim() && !ask.isPending ? GOLD : (isDark ? 'rgba(255,255,255,0.2)' : '#C4BFB8')} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Agent capsule ───────────────────────────────────────────────────────────── */
function AgentCapsule({ agent, delay, isDark, isActive }: {
  agent: { id: string; label: string; color: string; emoji: string; desc: string };
  delay: number; isDark: boolean; isActive: boolean;
}) {
  const card = isDark ? '#0a0a0a' : '#FFFFFF';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VP}
      transition={{ delay, duration: 0.4, ease: EASE }}
      style={{
        background: card, padding: '16px 18px',
        display: 'flex', flexDirection: 'column', gap: 6,
        borderLeft: `2.5px solid ${agent.color}`,
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Glow */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, ${agent.color}40, transparent)`,
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {isActive && (
          <motion.span
            style={{ width: 5, height: 5, borderRadius: '50%', background: agent.color, display: 'inline-block', flexShrink: 0 }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        )}
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: agent.color,
          fontFamily: "'Geist Mono', ui-monospace, monospace",
        }}>
          {agent.label}
        </span>
      </div>
      <p style={{
        margin: 0, fontSize: 9.5,
        color: isDark ? 'rgba(255,255,255,0.38)' : '#9A9490',
        lineHeight: 1.4,
      }}>
        {agent.desc}
      </p>
    </motion.div>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────────────── */
function EmptyState({ onSuggest, isDark, P, border }: {
  onSuggest: (q: string) => void; isDark: boolean; P: any; border: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', textAlign: 'center', padding: '0 12px 8px' }}>
      {/* Decorative 3-orbit rings */}
      <div style={{ position: 'relative', width: 80, height: 80 }}>
        {[AGENT_META.financial.color, AGENT_META.impact.color, AGENT_META.risk.color].map((c, i) => (
          <motion.div
            key={i}
            style={{
              position: 'absolute', inset: i * 8, borderRadius: '50%',
              border: `1px solid ${c}30`,
            }}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ duration: 8 + i * 3, repeat: Infinity, ease: 'linear' }}
          />
        ))}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles size={20} color={GOLD} />
        </div>
      </div>

      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.9)' : '#1A1A1A', letterSpacing: '-0.01em' }}>
          Ask the AI team
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: isDark ? 'rgba(255,255,255,0.38)' : '#9A9490', lineHeight: 1.5, maxWidth: 280 }}>
          3 specialist agents analyze your question in parallel and deliver a consolidated brief.
        </p>
      </div>

      {/* Suggested questions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
        {SUGGESTED.map((q, i) => (
          <motion.button
            key={i}
            whileHover={{ x: 3 }}
            onClick={() => onSuggest(q)}
            style={{
              background: 'transparent', border: `1px solid ${border}`,
              borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
              textAlign: 'left', fontSize: 11, color: isDark ? 'rgba(255,255,255,0.6)' : '#6B6560',
              transition: 'border-color 0.2s, color 0.2s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.borderColor = GOLD + '50';
              (e.target as HTMLButtonElement).style.color = isDark ? 'rgba(255,255,255,0.88)' : '#3D3A34';
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.borderColor = border;
              (e.target as HTMLButtonElement).style.color = isDark ? 'rgba(255,255,255,0.6)' : '#6B6560';
            }}
          >
            {q}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ── Chat message bubble ─────────────────────────────────────────────────────── */
function MessageBubble({ msg, isLatest, isDark, P, border }: {
  msg: ChatMsg; isLatest: boolean; isDark: boolean; P: any; border: string;
}) {
  if (msg.from === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <p style={{
          margin: 0, fontSize: 11.5, lineHeight: 1.6,
          padding: '8px 14px', borderRadius: '14px 14px 4px 14px',
          maxWidth: '85%', background: `${GOLD}12`,
          border: `1px solid ${GOLD}25`, color: isDark ? 'rgba(255,255,255,0.85)' : '#1A1A1A',
        }}>
          {msg.text}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Agent badges */}
      {msg.agentSummaries && msg.agentSummaries.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {msg.agentSummaries.map((a, i) => (
            <span key={i} style={{
              fontSize: 8.5, padding: '2px 7px', borderRadius: 999,
              background: `${a.color}14`, color: a.color,
              border: `1px solid ${a.color}28`,
              fontFamily: "'Geist Mono', monospace", fontWeight: 700, letterSpacing: '0.06em',
            }}>
              {a.name}
            </span>
          ))}
        </div>
      )}
      {/* Text */}
      <div style={{
        padding: '10px 14px', borderRadius: '4px 14px 14px 14px',
        border: `1px solid ${border}`,
        background: isDark ? '#121212' : '#FAF7F0',
      }}>
        {isLatest ? (
          <TypewriterLine text={msg.text} isDark={isDark} />
        ) : (
          <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.6, color: isDark ? 'rgba(255,255,255,0.75)' : '#3D3A34' }}>
            {msg.text}
          </p>
        )}
      </div>
      {/* Findings */}
      {msg.findings && msg.findings.length > 0 && (
        <div style={{ paddingLeft: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {msg.findings.slice(0, 3).map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
              <span style={{
                width: 4, height: 4, borderRadius: '50%',
                background: GOLD, display: 'inline-block', flexShrink: 0, marginTop: 5,
              }} />
              <p style={{ margin: 0, fontSize: 10, lineHeight: 1.55, color: isDark ? 'rgba(255,255,255,0.5)' : '#6B6560' }}>
                {f}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Typewriter text ─────────────────────────────────────────────────────────── */
function TypewriterLine({ text, isDark }: { text: string; isDark: boolean }) {
  const { displayed, done } = useTypewriter({ text, speed: 6, enabled: true });
  return (
    <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.6, color: isDark ? 'rgba(255,255,255,0.75)' : '#3D3A34' }}>
      {displayed}
      {!done && (
        <motion.span
          style={{ display: 'inline-block', width: 2, height: 12, marginLeft: 2, verticalAlign: 'middle', background: GOLD }}
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </p>
  );
}

/* ── Thinking indicator ──────────────────────────────────────────────────────── */
function ThinkingBubble({ isDark, border }: { isDark: boolean; border: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 5 }}>
        {Object.values(AGENT_META).map(a => (
          <motion.span
            key={a.id}
            style={{
              fontSize: 8.5, padding: '2px 7px', borderRadius: 999,
              background: `${a.color}14`, color: a.color,
              border: `1px solid ${a.color}28`,
              fontFamily: "'Geist Mono', monospace", fontWeight: 700,
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: Object.keys(AGENT_META).indexOf(a.id) * 0.2 }}
          >
            {a.label}
          </motion.span>
        ))}
      </div>
      <div style={{
        padding: '10px 14px', borderRadius: '4px 14px 14px 14px',
        border: `1px solid ${border}`,
        background: isDark ? '#121212' : '#FAF7F0',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[0, 1, 2].map(d => (
            <motion.div
              key={d}
              style={{ width: 5, height: 5, borderRadius: '50%', background: GOLD }}
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 0.7, repeat: Infinity, delay: d * 0.15 }}
            />
          ))}
        </div>
        <span style={{ fontSize: 10, color: isDark ? 'rgba(255,255,255,0.35)' : '#9A9490', fontFamily: "'Geist Mono', monospace" }}>
          Agents analyzing…
        </span>
      </div>
    </div>
  );
}

/* ── Loading dots (header) ───────────────────────────────────────────────────── */
function LoadingDots() {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[0, 1, 2].map(d => (
        <motion.div
          key={d}
          style={{ width: 4, height: 4, borderRadius: '50%', background: GOLD }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: d * 0.2 }}
        />
      ))}
    </div>
  );
}
