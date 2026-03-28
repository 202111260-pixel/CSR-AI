import { useRef } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  MotionValue,
} from 'framer-motion';
import './Dock.css';

interface DockItemData {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

interface DockProps {
  items: DockItemData[];
  className?: string;
  panelHeight?: number;
  baseItemSize?: number;
  magnification?: number;
}

interface DockItemProps {
  item: DockItemData;
  mouseX: MotionValue<number>;
  baseItemSize: number;
  magnification: number;
}

const DockItem = ({ item, mouseX, baseItemSize, magnification }: DockItemProps) => {
  const ref = useRef<HTMLButtonElement>(null);

  const distance = useTransform(mouseX, (val: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return 150;
    return val - rect.x - rect.width / 2;
  });

  const sizeTransform = useTransform(
    distance,
    [-150, 0, 150],
    [baseItemSize, magnification, baseItemSize]
  );

  const size = useSpring(sizeTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  return (
    <motion.button
      ref={ref}
      className="dock-item"
      onClick={item.onClick}
      style={{ width: size, height: size }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="dock-icon">{item.icon}</div>
      <motion.span
        className="dock-label"
        initial={{ opacity: 0, y: 10 }}
        whileHover={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {item.label}
      </motion.span>
    </motion.button>
  );
};

const Dock = ({
  items,
  className = '',
  panelHeight = 68,
  baseItemSize = 50,
  magnification = 70,
}: DockProps) => {
  const mouseX = useMotionValue(Infinity);

  return (
    <div className={`dock-outer ${className}`}>
      <motion.div
        className="dock-panel"
        style={{ height: panelHeight }}
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
      >
        {items.map((item, idx) => (
          <DockItem
            key={idx}
            item={item}
            mouseX={mouseX}
            baseItemSize={baseItemSize}
            magnification={magnification}
          />
        ))}
      </motion.div>
    </div>
  );
};

export default Dock;
