import { useTheme } from '../../hooks/useTheme';

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const { colors: P } = useTheme();
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <div className="flex justify-center items-center" role="status" aria-label="Loading">
      <div
        className={`${sizes[size]} animate-spin rounded-full border-2`}
        style={{ borderColor: P.border, borderTopColor: P.accent }}
      />
    </div>
  );
}
export default LoadingSpinner;
