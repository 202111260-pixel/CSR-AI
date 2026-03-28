import React from 'react';
import { cn } from '../../utils/cn.ts';
import { useTheme } from '../../hooks/useTheme';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className, ...props }: TableProps) {
  const { colors } = useTheme();
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn('w-full text-sm text-left', className)}
        style={{ color: colors.textMd }}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHeader({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  const { colors } = useTheme();
  return (
    <thead
      className={cn('text-xs uppercase', className)}
      style={{ borderBottom: `1px solid ${colors.border}`, color: colors.textLo }}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TableBody({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  const { colors } = useTheme();
  return (
    <tbody className={cn('', className)} style={{ borderColor: colors.border }} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  const { colors } = useTheme();
  return (
    <tr
      className={cn(
        'transition-colors duration-150',
        className
      )}
      style={{ borderBottom: `1px solid ${colors.border}` }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = colors.hover; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({
  children,
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn('px-4 py-3 font-medium whitespace-nowrap', className)}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn('px-4 py-3 whitespace-nowrap', className)}
      {...props}
    >
      {children}
    </td>
  );
}

export default Table;
