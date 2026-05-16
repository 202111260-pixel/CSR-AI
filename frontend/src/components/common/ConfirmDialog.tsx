import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, Archive, RotateCcw, X } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

type DialogVariant = 'danger' | 'warning' | 'info' | 'archive' | 'restore';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: DialogVariant;
  loading?: boolean;
}

const variantConfig: Record<DialogVariant, { icon: React.FC<{ size?: number; style?: React.CSSProperties }>; color: string; bg: string; border: string; btnBg: string; btnHover: string }> = {
  danger: {
    icon: Trash2, color: '#f87171', bg: 'rgba(248,113,113,0.1)',
    border: 'rgba(248,113,113,0.2)', btnBg: '#dc2626', btnHover: '#b91c1c',
  },
  warning: {
    icon: AlertTriangle, color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',
    border: 'rgba(251,191,36,0.2)', btnBg: '#d97706', btnHover: '#b45309',
  },
  info: {
    icon: AlertTriangle, color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',
    border: 'rgba(56,189,248,0.2)', btnBg: '#0284c7', btnHover: '#0369a1',
  },
  archive: {
    icon: Archive, color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',
    border: 'rgba(251,191,36,0.2)', btnBg: '#d97706', btnHover: '#b45309',
  },
  restore: {
    icon: RotateCcw, color: '#34d399', bg: 'rgba(52,211,153,0.1)',
    border: 'rgba(52,211,153,0.2)', btnBg: '#059669', btnHover: '#047857',
  },
};

export function ConfirmDialog({
  open, onClose, onConfirm, title, message,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  variant = 'danger', loading = false,
}: ConfirmDialogProps) {
  const { colors: P } = useTheme();
  const cfg = variantConfig[variant];
  const Icon = cfg.icon;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200]"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-[420px] max-w-[90vw] rounded-2xl p-6"
            style={{
              background: P.card,
              border: `1px solid ${P.border}`,
              boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
            }}
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/5 transition-colors">
              <X size={16} style={{ color: P.textLo }} />
            </button>

            <div className="flex items-start gap-4">
              <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                <Icon size={20} style={{ color: cfg.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold" style={{ color: P.textHi }}>{title}</h3>
                <p className="text-sm mt-2 leading-relaxed" style={{ color: P.textMd }}>{message}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-white/5"
                style={{ color: P.textMd, border: `1px solid ${P.border}` }}
              >
                {cancelLabel}
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { onConfirm(); onClose(); }}
                disabled={loading}
                className="px-5 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
                style={{ background: cfg.btnBg, color: '#fff' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = cfg.btnHover; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = cfg.btnBg; }}
              >
                {loading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {confirmLabel}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ConfirmDialog;
