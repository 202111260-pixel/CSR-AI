/**
 * DashboardHeader — Band 1
 * Full-bleed cinematic header with Omani gold identity.
 * Glow blobs + noise grain + greeting + action chips.
 */
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PiArrowsClockwiseBold, PiExportDuotone, PiPrinterDuotone, PiMapPinDuotone } from 'react-icons/pi';
import { useTheme } from '../../hooks/useTheme';
import { EASE, FADE_UP, GOLD } from './tokens';

interface DashboardHeaderProps {
  userName?: string;
  isRefetching: boolean;
  onRefresh: () => void;
  onExport: () => void;
  onPrint: () => void;
  activeRegions?: number;
}

export function DashboardHeader({
  userName,
  isRefetching,
  onRefresh,
  onExport,
  onPrint,
  activeRegions = 0,
}: DashboardHeaderProps) {
  const { isDark } = useTheme();

  const { greeting, greetingAr } = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return { greeting: 'Good Morning',   greetingAr: 'صباح الخير' };
    if (h < 17) return { greeting: 'Good Afternoon', greetingAr: 'مساء الخير' };
    return { greeting: 'Good Evening', greetingAr: 'مساء النور' };
  }, []);

  const dateLabel = useMemo(() => {
    return new Date().toLocaleDateString('en-OM', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  }, []);

  const bgBase   = isDark ? '#000000' : '#FFFDF9';
  const borderBt = isDark ? '#1a1a1a' : '#E8E0CC';
  const textHi   = isDark ? 'rgba(255,255,255,0.96)' : '#1A1A1A';
  const textLo   = isDark ? 'rgba(255,255,255,0.38)' : '#9A9490';
  const textMd   = isDark ? 'rgba(255,255,255,0.65)' : '#6B6560';

  return (
    <motion.div
      variants={FADE_UP}
      initial="hidden"
      animate="show"
      style={{
        background: bgBase,
        position: 'relative',
        overflow: 'hidden',
        borderBottom: `1px solid ${borderBt}`,
        marginLeft: -24,
        marginRight: -24,
        marginTop: -20,
        padding: '40px 28px 32px',
      }}
    >
      {/* ── Noise grain overlay ── */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        backgroundSize: '128px 128px', opacity: isDark ? 0.035 : 0.025, pointerEvents: 'none',
      }} />

      {/* ── Glow blobs (3) ── */}
      <div style={{ position: 'absolute', left: '4%', top: '-20%', width: 400, height: 400, borderRadius: '50%', background: isDark ? 'rgba(200,164,78,0.07)' : 'rgba(200,164,78,0.04)', filter: 'blur(120px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: '8%', bottom: '-40%', width: 320, height: 320, borderRadius: '50%', background: isDark ? 'rgba(37,99,235,0.05)' : 'rgba(74,222,128,0.03)', filter: 'blur(100px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: '38%', top: '5%', width: 200, height: 200, borderRadius: '50%', background: 'rgba(200,164,78,0.03)', filter: 'blur(80px)', pointerEvents: 'none' }} />

      {/* ── Content ── */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>

        {/* ── Left: Greeting + eyebrow ── */}
        <div style={{ minWidth: 0, maxWidth: 680 }}>

          {/* Eyebrow: platform tag + date + region count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: isDark ? 'rgba(74,222,128,0.08)' : 'rgba(74,222,128,0.06)',
              border: '1px solid rgba(74,222,128,0.22)',
              borderRadius: 999, padding: '3px 11px 3px 9px',
              fontSize: 9, fontWeight: 700, letterSpacing: '0.22em',
              textTransform: 'uppercase', color: '#4ade80',
              fontFamily: "'Geist Mono', ui-monospace, monospace",
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
              Portfolio Live
            </span>

            {activeRegions > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: isDark ? 'rgba(200,164,78,0.08)' : 'rgba(200,164,78,0.06)',
                border: `1px solid rgba(200,164,78,0.2)`,
                borderRadius: 999, padding: '3px 11px 3px 9px',
                fontSize: 9, fontWeight: 700, color: GOLD,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                fontFamily: "'Geist Mono', ui-monospace, monospace",
              }}>
                <PiMapPinDuotone size={10} />
                {activeRegions} Governorates
              </span>
            )}

            <span style={{
              fontSize: 9, color: textLo,
              fontFamily: "'Geist Mono', ui-monospace, monospace",
              letterSpacing: '0.08em',
            }}>
              {dateLabel}
            </span>
          </div>

          {/* Greeting — Playfair italic */}
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
            <h1 style={{
              margin: 0, lineHeight: 1.1,
              fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
              fontWeight: 700, letterSpacing: '-0.025em',
              color: textHi,
              fontFamily: "'Playfair Display', 'Georgia', serif",
              fontStyle: 'italic',
            }}>
              {greeting}
              {userName && (
                <span style={{ color: GOLD }}>
                  {', '}
                  {userName.split(' ')[0]}
                </span>
              )}
            </h1>
            {/* Signature gold underline rail */}
            <motion.span
              initial={{ width: 0 }}
              animate={{ width: 28 }}
              transition={{ delay: 0.6, duration: 0.45, ease: EASE }}
              style={{
                position: 'absolute', left: 2, bottom: -8,
                height: 2, background: GOLD, opacity: 0.65,
                display: 'block', borderRadius: 2,
              }}
            />
          </div>

          {/* Arabic greeting + subtitle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 12, color: textLo,
              fontFamily: "'IBM Plex Sans Arabic', 'DM Sans', sans-serif",
            }}>
              {greetingAr}
            </span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: textLo, display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: textMd, lineHeight: 1.5 }}>
              CSR Portfolio Command Center — Ministry of Commerce &amp; Industry, Oman
            </span>
          </div>
        </div>

        {/* ── Right: Action chips ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <ActionChip
            icon={<PiArrowsClockwiseBold size={12} style={{ transform: isRefetching ? 'none' : undefined }} />}
            label="Refresh"
            onClick={onRefresh}
            spinning={isRefetching}
            isDark={isDark}
          />
          <ActionChip
            icon={<PiExportDuotone size={12} />}
            label="Export"
            onClick={onExport}
            isDark={isDark}
          />
          <ActionChip
            icon={<PiPrinterDuotone size={12} />}
            label="Print"
            onClick={onPrint}
            isDark={isDark}
            subtle
          />
        </div>
      </div>
    </motion.div>
  );
}

function ActionChip({ icon, label, onClick, spinning, isDark, subtle }: {
  icon: React.ReactNode; label: string; onClick: () => void;
  spinning?: boolean; isDark: boolean; subtle?: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.96 }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '7px 14px', borderRadius: 999,
        fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', outline: 'none',
        background: subtle
          ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)')
          : (isDark ? 'rgba(200,164,78,0.12)' : 'rgba(200,164,78,0.08)'),
        color: subtle
          ? (isDark ? 'rgba(255,255,255,0.45)' : '#6B6560')
          : GOLD,
        border: `1px solid ${subtle
          ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')
          : 'rgba(200,164,78,0.22)'}`,
        fontFamily: "'DM Sans', sans-serif",
        transition: 'box-shadow 0.2s ease',
      }}
    >
      <span style={{ animation: spinning ? 'spin 1s linear infinite' : undefined }}>
        {icon}
      </span>
      {label}
    </motion.button>
  );
}
