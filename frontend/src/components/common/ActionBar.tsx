import { motion } from 'framer-motion';
import { FileSpreadsheet, Printer, RotateCcw, FileText } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

interface ActionBarProps {
  onRefresh?: () => void;
  onExcel?: () => void;
  onPrint?: () => void;
  onPdf?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

export function ActionBar({ onRefresh, onExcel, onPrint, onPdf, isRefreshing, className }: ActionBarProps) {
  const { isDark } = useTheme();

  const baseBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', fontSize: 11, fontWeight: 600,
    borderRadius: 10, cursor: 'pointer', border: 'none', outline: 'none',
    fontFamily: 'inherit', transition: 'all 0.15s ease',
  };

  const refreshBtn: React.CSSProperties = isDark
    ? { ...baseBtn, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(8px)' }
    : { ...baseBtn, background: 'rgba(0,0,0,0.04)', color: '#374151', border: '1px solid rgba(0,0,0,0.10)' };

  const excelBtn: React.CSSProperties = {
    ...baseBtn,
    background: 'rgba(13,148,136,0.12)',
    color: isDark ? '#2dd4bf' : '#0f766e',
    border: '1px solid rgba(13,148,136,0.28)',
  };

  const printBtn: React.CSSProperties = {
    ...baseBtn,
    background: 'rgba(37,99,235,0.12)',
    color: isDark ? '#93c5fd' : '#1d4ed8',
    border: '1px solid rgba(37,99,235,0.28)',
  };

  const pdfBtn: React.CSSProperties = {
    ...baseBtn,
    background: 'rgba(239,68,68,0.12)',
    color: isDark ? '#fca5a5' : '#dc2626',
    border: '1px solid rgba(239,68,68,0.28)',
  };

  return (
    <div
      className={className}
      style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
    >
      {onRefresh && (
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={onRefresh}
          style={refreshBtn}
        >
          <RotateCcw
            size={12}
            className={isRefreshing ? 'animate-spin' : ''}
            style={{ color: '#4ade80' }}
          />
          Refresh
        </motion.button>
      )}
      {onExcel && (
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={onExcel}
          style={excelBtn}
        >
          <FileSpreadsheet size={12} />
          Excel
        </motion.button>
      )}
      {onPdf && (
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={onPdf}
          style={pdfBtn}
        >
          <FileText size={12} />
          PDF
        </motion.button>
      )}
      {onPrint && (
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={onPrint}
          style={printBtn}
        >
          <Printer size={12} />
          Print
        </motion.button>
      )}
    </div>
  );
}
