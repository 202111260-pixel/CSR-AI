import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';

const P = {
  bg: '#080805', card: '#131310', border: '#1E1E16',
  accent: '#C9C036', textHi: '#F0EFE2', textMd: '#A8A48A', textLo: '#6B6849',
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
      <div className="text-center max-w-md">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <span className="text-[120px] font-black leading-none" style={{ color: P.accent, opacity: 0.15 }}>404</span>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          <h1 className="text-2xl font-bold mb-3" style={{ color: P.textHi }}>Page Not Found</h1>
          <p className="text-sm leading-relaxed mb-8" style={{ color: P.textMd }}>
            The page you're looking for doesn't exist or has been moved. Check the URL or navigate back.
          </p>

          <div className="flex items-center justify-center gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors"
              style={{ border: `1px solid ${P.border}`, color: P.textMd }}
            >
              <ArrowLeft size={15} />
              Go Back
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold"
              style={{ background: P.accent, color: P.bg }}
            >
              <Home size={15} />
              Dashboard
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
