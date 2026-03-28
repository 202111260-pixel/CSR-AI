import { useEffect, useState } from 'react';

interface NumberFlowSafeProps {
  value: number;
  format?: Intl.NumberFormatOptions;
  trend?: number;
}

export default function NumberFlowSafe({ value, format }: NumberFlowSafeProps) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    setDisplay(value);
  }, [value]);

  const formatted = format
    ? new Intl.NumberFormat('en-US', format).format(display)
    : String(display);

  return <span>{formatted}</span>;
}
