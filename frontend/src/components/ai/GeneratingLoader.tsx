import { motion } from 'framer-motion';
import { useTheme } from '../../hooks/useTheme';
import { Brain } from 'lucide-react';

interface GeneratingLoaderProps {
  label?: string;
}

export function GeneratingLoader({ label = 'Agents are thinking…' }: GeneratingLoaderProps) {
  const { colors } = useTheme();

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
      {/* Glowing orb */}
      <div className="relative w-16 h-16">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: `radial-gradient(circle, ${colors.accent}40, transparent 70%)` }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute inset-2 rounded-full flex items-center justify-center"
          style={{ background: `${colors.accent}20`, border: `2px solid ${colors.accent}40` }}
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          <Brain size={20} style={{ color: colors.accent }} />
        </motion.div>
      </div>

      {/* Label with dot animation */}
      <motion.p
        className="text-sm font-medium"
        style={{ color: colors.textMd }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {label}
      </motion.p>
    </div>
  );
}
