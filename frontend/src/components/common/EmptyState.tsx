import { motion } from 'framer-motion';
import { Inbox, FolderOpen, Search, AlertCircle, Plus } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

type EmptyVariant = 'default' | 'search' | 'filter' | 'error';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  message?: string;
  variant?: EmptyVariant;
  actionLabel?: string;
  onAction?: () => void;
}

const defaults: Record<EmptyVariant, { icon: React.FC<{ size?: number; style?: React.CSSProperties }>; title: string; message: string }> = {
  default: { icon: Inbox, title: 'No data yet', message: 'There are no items to display at the moment.' },
  search: { icon: Search, title: 'No results found', message: 'Try adjusting your search or filter criteria.' },
  filter: { icon: FolderOpen, title: 'No matching items', message: 'No items match the selected filters. Try different criteria.' },
  error: { icon: AlertCircle, title: 'Something went wrong', message: 'An error occurred while loading data. Please try again.' },
};

export function EmptyState({
  icon, title, message, variant = 'default',
  actionLabel, onAction,
}: EmptyStateProps) {
  const { colors: P } = useTheme();
  const cfg = defaults[variant];
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: P.accentBg, border: `1px solid ${P.border}` }}>
        {icon || <Icon size={28} style={{ color: P.textLo }} />}
      </div>
      <h3 className="text-base font-semibold mb-2" style={{ color: P.textHi }}>
        {title || cfg.title}
      </h3>
      <p className="text-sm text-center max-w-md" style={{ color: P.textLo }}>
        {message || cfg.message}
      </p>
      {actionLabel && onAction && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAction}
          className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          style={{ background: P.accent, color: P.bg }}
        >
          <Plus size={15} />
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  );
}

export default EmptyState;
