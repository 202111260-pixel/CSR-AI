export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

const colours: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  low:      { bg: 'rgba(52,211,153,0.1)',  text: '#6ee7b7', border: 'rgba(52,211,153,0.2)' },
  medium:   { bg: 'rgba(251,191,36,0.1)',  text: '#fde68a', border: 'rgba(251,191,36,0.2)' },
  high:     { bg: 'rgba(251,146,60,0.1)',  text: '#fdba74', border: 'rgba(251,146,60,0.2)' },
  critical: { bg: 'rgba(248,113,113,0.1)', text: '#fca5a5', border: 'rgba(248,113,113,0.2)' },
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  const c = colours[level];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}
export default RiskBadge;
