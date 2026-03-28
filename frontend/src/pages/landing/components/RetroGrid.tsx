import { cn } from '../../../utils/cn';

interface RetroGridProps {
  className?: string;
  angle?: number;
  cellSize?: number;
  opacity?: number;
}

export function RetroGrid({
  className,
  angle = 65,
  cellSize = 60,
  opacity = 0.3,
}: RetroGridProps) {
  const gridStyle = {
    '--grid-angle': `${angle}deg`,
    '--cell-size': `${cellSize}px`,
    '--grid-opacity': opacity,
  } as React.CSSProperties;

  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} style={gridStyle}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(var(--grid-angle), transparent 24%,
              rgba(200, 164, 78, var(--grid-opacity)) 25%,
              rgba(200, 164, 78, var(--grid-opacity)) 26%,
              transparent 27%
            ),
            linear-gradient(calc(var(--grid-angle) + 90deg), transparent 24%,
              rgba(200, 164, 78, var(--grid-opacity)) 25%,
              rgba(200, 164, 78, var(--grid-opacity)) 26%,
              transparent 27%
            )
          `,
          backgroundSize: `var(--cell-size) var(--cell-size)`,
          transform: 'perspective(500px) rotateX(60deg)',
          transformOrigin: 'center top',
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 85%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 85%)',
          height: '200%',
          top: '40%',
        }}
      />
    </div>
  );
}
