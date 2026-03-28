import {
  useMotionValue,
  useSpring,
  useTransform,
  motion,
  type MotionValue,
  AnimatePresence,
} from 'framer-motion';
import { useRef, useState } from 'react';
import { cn } from '../../../utils/cn';

/* ═══════════════════════════════════════════════════
   Aceternity-style Floating Dock — macOS magnification
   ═══════════════════════════════════════════════════ */

export interface DockItem {
  title: string;
  icon: React.ReactNode;
  href: string;
}

export function FloatingDock({
  items,
  className,
  desktopClassName,
  mobileClassName,
}: {
  items: DockItem[];
  className?: string;
  desktopClassName?: string;
  mobileClassName?: string;
}) {
  return (
    <>
      <FloatingDockDesktop items={items} className={cn('hidden md:flex', desktopClassName, className)} />
      <FloatingDockMobile items={items} className={cn('flex md:hidden', mobileClassName, className)} />
    </>
  );
}

/* ── Desktop: magnification on hover ── */
function FloatingDockDesktop({ items, className }: { items: DockItem[]; className?: string }) {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        'inline-flex h-14 items-end gap-3 rounded-2xl border border-[#3A3F2F]/10 bg-[#C5CCBE]/80 backdrop-blur-xl px-4 pb-2.5',
        className
      )}
    >
      {items.map((item) => (
        <DockIcon mouseX={mouseX} key={item.title} {...item} />
      ))}
    </motion.div>
  );
}

/* ── Single icon with spring magnification ── */
function DockIcon({
  mouseX,
  title,
  icon,
  href,
}: DockItem & { mouseX: MotionValue }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthTransform = useTransform(distance, [-150, 0, 150], [40, 70, 40]);
  const heightTransform = useTransform(distance, [-150, 0, 150], [40, 70, 40]);
  const widthTransformIcon = useTransform(distance, [-150, 0, 150], [20, 36, 20]);
  const heightTransformIcon = useTransform(distance, [-150, 0, 150], [20, 36, 20]);

  const width = useSpring(widthTransform, { mass: 0.1, stiffness: 150, damping: 12 });
  const height = useSpring(heightTransform, { mass: 0.1, stiffness: 150, damping: 12 });
  const widthIcon = useSpring(widthTransformIcon, { mass: 0.1, stiffness: 150, damping: 12 });
  const heightIcon = useSpring(heightTransformIcon, { mass: 0.1, stiffness: 150, damping: 12 });

  return (
    <a href={href}>
      <motion.div
        ref={ref}
        style={{ width, height }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative flex aspect-square items-center justify-center rounded-xl bg-[#3A3F2F]/[0.06] hover:bg-[#3A3F2F]/[0.1] transition-colors"
      >
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 10, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 2, x: '-50%' }}
              className="absolute -top-9 left-1/2 w-fit whitespace-pre rounded-lg border border-[#3A3F2F]/10 bg-white/90 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-[#3A3F2F] shadow-sm"
            >
              {title}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          style={{ width: widthIcon, height: heightIcon }}
          className="flex items-center justify-center"
        >
          {icon}
        </motion.div>
      </motion.div>
    </a>
  );
}

/* ── Mobile: simple horizontal strip ── */
function FloatingDockMobile({ items, className }: { items: DockItem[]; className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn('relative', className)}>
      <AnimatePresence>
        {open && (
          <motion.div
            layoutId="nav"
            className="absolute bottom-full mb-2 right-0 flex flex-col gap-2"
          >
            {items.map((item, idx) => (
              <motion.a
                key={item.title}
                href={item.href}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10, transition: { delay: idx * 0.05 } }}
                transition={{ delay: (items.length - 1 - idx) * 0.05 }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 backdrop-blur-md border border-[#3A3F2F]/10 shadow-sm"
              >
                <div className="h-4 w-4">{item.icon}</div>
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 backdrop-blur-md border border-[#3A3F2F]/10 shadow-sm"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3A3F2F" strokeWidth="2" strokeLinecap="round">
          {open ? (
            <>
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </>
          ) : (
            <>
              <path d="M4 8h16" />
              <path d="M4 16h16" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
