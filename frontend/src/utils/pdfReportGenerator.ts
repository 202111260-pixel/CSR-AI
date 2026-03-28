/**
 * Corporate PDF Report Generator — CSR Platform
 * Native jsPDF + jspdf-autotable for real selectable text.
 * Professional English documents — no html2canvas screenshots.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ═══════════════════════════════════════════════════════════════════════
// TYPES  (keep identical — report pages depend on these)
// ═══════════════════════════════════════════════════════════════════════

export interface KpiItem {
  label: string;
  value: number | string;
  format?: 'number' | 'currency' | 'percentage' | 'text';
  color?: string;
}

export interface TableRow {
  [key: string]: string | number | undefined;
}

export interface TableColumn {
  key: string;
  header: string;
  align?: 'right' | 'center' | 'left';
  format?: 'number' | 'currency' | 'percentage' | 'text' | 'bar';
}

export interface ReportDateRange {
  from?: string;
  to?: string;
}

export interface GeneralReportData {
  kpis: KpiItem[];
  statusDistribution: { name: string; value: number; color: string }[];
  categoryDistribution: { name: string; projects: number; budget: number }[];
  dateRange?: ReportDateRange;
}

export interface ImpactReportData {
  kpis: KpiItem[];
  demographics: { label: string; value: number }[];
  sdgGoals: { id: number; name: string; progress: number; color: string }[];
  categoryImpact: {
    label: string;
    projects: number;
    beneficiaries: number;
    budget: number;
    satisfaction: number;
  }[];
  dateRange?: ReportDateRange;
}

export interface FinancialReportData {
  kpis: KpiItem[];
  expenseBreakdown: { name: string; value: number; pct: number; color: string }[];
  projectFinancials: {
    name: string;
    budget: number;
    spent: number;
    remaining: number;
    pct: number;
    status: string;
  }[];
  categoryBreakdown: { name: string; budget: number; spent: number; projects: number }[];
  efficiencyMetrics: { label: string; value: string; unit: string }[];
  dateRange?: ReportDateRange;
}

// ═══════════════════════════════════════════════════════════════════════
// COLOUR PALETTE
// ═══════════════════════════════════════════════════════════════════════

const CLR = {
  dark: [15, 23, 42] as [number, number, number],
  text: [30, 41, 59] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  light: [148, 163, 184] as [number, number, number],
  rule: [226, 232, 240] as [number, number, number],
  bg: [248, 250, 252] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  accent: [4, 120, 87] as [number, number, number],
  accentHex: '#047857',
};

// ═══════════════════════════════════════════════════════════════════════
// FORMATTERS
// ═══════════════════════════════════════════════════════════════════════

function fmt(n: number | string): string {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(v)) return String(n);
  return v.toLocaleString('en-US');
}

function fmtOMR(n: number | string): string {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(v)) return String(n);
  return `${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} OMR`;
}

function fmtCompact(n: number | string): string {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(v)) return String(n);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M OMR`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K OMR`;
  return `${fmt(v)} OMR`;
}

function fmtKpi(value: number | string, format?: string): string {
  const v = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(v)) return String(value);
  switch (format) {
    case 'currency':
      return fmtCompact(v);
    case 'percentage':
      return `${v.toFixed(1)}%`;
    case 'number':
      return fmt(v);
    default:
      return String(value);
  }
}

function fmtCell(raw: string | number | undefined, format?: string): string {
  if (raw == null) return '\u2014';
  const v = typeof raw === 'number' ? raw : parseFloat(String(raw));
  if (format === 'currency' && !isNaN(v)) return fmtOMR(v);
  if (format === 'number' && !isNaN(v)) return fmt(v);
  if (format === 'percentage' && !isNaN(v)) return `${v.toFixed(1)}%`;
  if (format === 'bar' && !isNaN(v)) return `${v.toFixed(1)}%`;
  return String(raw);
}

// ═══════════════════════════════════════════════════════════════════════
// LOW-LEVEL DRAWING HELPERS
// ═══════════════════════════════════════════════════════════════════════

const LM = 20; // left margin
const RM = 20; // right margin

/** Get usable page width */
function pw(doc: jsPDF): number {
  return doc.internal.pageSize.getWidth() - LM - RM;
}

/** Check remaining space; add page if needed. Returns new Y. */
function ensureSpace(doc: jsPDF, y: number, need: number): number {
  const ph = doc.internal.pageSize.getHeight();
  if (y + need > ph - 20) {
    doc.addPage();
    addRunningFooter(doc);
    return 28;
  }
  return y;
}

/** Running footer on every page */
function addRunningFooter(doc: jsPDF): void {
  const ph = doc.internal.pageSize.getHeight();
  const pw2 = doc.internal.pageSize.getWidth();
  const pages = (doc as any).internal.getNumberOfPages();
  doc.setDrawColor(...CLR.rule);
  doc.setLineWidth(0.3);
  doc.line(LM, ph - 14, pw2 - RM, ph - 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...CLR.light);
  doc.text('CSR Platform \u2022 Sultanate of Oman \u2022 Confidential', LM, ph - 10);
  doc.text(`Page ${pages}`, pw2 - RM, ph - 10, { align: 'right' });
}

/** Accent bar at top of page */
function accentBar(doc: jsPDF): void {
  doc.setFillColor(...CLR.accent);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 4, 'F');
}

// ═══════════════════════════════════════════════════════════════════════
// DOCUMENT BUILDING BLOCKS
// ═══════════════════════════════════════════════════════════════════════

function drawCoverPage(
  doc: jsPDF,
  title: string,
  subtitle: string,
  reportType: string,
  dateRange?: ReportDateRange,
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const now = new Date();
  const issued = now.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const period = dateRange?.from
    ? `${dateRange.from}  to  ${dateRange.to || 'Present'}`
    : `As of ${issued}`;

  // Top accent bar
  accentBar(doc);

  let y = 24;

  // Org line
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...CLR.accent);
  doc.text('CSR PLATFORM \u2014 SULTANATE OF OMAN', LM, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...CLR.muted);
  doc.text('Corporate Social Responsibility Management System', LM, y);

  // Report type badge — right side
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...CLR.light);
  doc.text(reportType, pageW - RM, 24, { align: 'right' });
  const ref = `Ref: CSR-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  doc.text(ref, pageW - RM, 29, { align: 'right' });

  // Divider
  y += 10;
  doc.setDrawColor(...CLR.rule);
  doc.setLineWidth(0.3);
  doc.line(LM, y, pageW - RM, y);
  y += 16;

  // Title
  doc.setFont('times', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(...CLR.dark);
  const titleLines = doc.splitTextToSize(title, pw(doc));
  doc.text(titleLines, LM, y);
  y += titleLines.length * 10 + 4;

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...CLR.muted);
  const subLines = doc.splitTextToSize(subtitle, Math.min(pw(doc), 140));
  doc.text(subLines, LM, y);
  y += subLines.length * 5 + 12;

  // Metadata table
  doc.setFontSize(8.5);
  const meta = [
    ['Reporting Period', period],
    ['Date Issued', issued],
    ['Classification', 'Internal \u2014 Confidential'],
  ];
  meta.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...CLR.muted);
    doc.text(label, LM, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...CLR.text);
    doc.text(val, LM + 40, y);
    y += 6;
  });

  // Bottom rule
  y += 6;
  doc.setDrawColor(...CLR.rule);
  doc.line(LM, y, pageW - RM, y);
  y += 6;

  return y;
}

function drawKpiStrip(doc: jsPDF, y: number, kpis: KpiItem[]): number {
  const pageW = doc.internal.pageSize.getWidth();
  y = ensureSpace(doc, y, 28);

  const count = kpis.length;
  const totalW = pageW - LM - RM;
  const cellW = totalW / count;
  const h = 22;

  // Background
  doc.setFillColor(...CLR.bg);
  doc.setDrawColor(...CLR.rule);
  doc.setLineWidth(0.3);
  doc.rect(LM, y, totalW, h, 'FD');

  // Vertical dividers
  for (let i = 1; i < count; i++) {
    const x = LM + i * cellW;
    doc.line(x, y + 3, x, y + h - 3);
  }

  kpis.forEach((k, i) => {
    const cx = LM + i * cellW + cellW / 2;
    const val = fmtKpi(k.value, k.format);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...CLR.dark);
    doc.text(val, cx, y + 10, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...CLR.muted);
    doc.text(k.label.toUpperCase(), cx, y + 17, { align: 'center' });
  });

  return y + h + 8;
}

function drawSectionHeading(doc: jsPDF, y: number, num: string, title: string): number {
  const pageW = doc.internal.pageSize.getWidth();
  y = ensureSpace(doc, y, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...CLR.accent);
  doc.text(num, LM, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...CLR.dark);
  doc.text(title, LM + 10, y);

  y += 4;
  doc.setDrawColor(...CLR.rule);
  doc.setLineWidth(0.3);
  doc.line(LM, y, pageW - RM, y);

  return y + 6;
}

function drawParagraph(doc: jsPDF, y: number, text: string): number {
  y = ensureSpace(doc, y, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...CLR.muted);
  const lines = doc.splitTextToSize(text, Math.min(pw(doc), 160));
  doc.text(lines, LM, y);
  return y + lines.length * 4 + 4;
}

function drawAutoTable(
  doc: jsPDF,
  y: number,
  columns: TableColumn[],
  rows: TableRow[],
): number {
  y = ensureSpace(doc, y, 24);

  const head = [columns.map(c => c.header)];
  const body = rows.map(row =>
    columns.map(col => fmtCell(row[col.key], col.format)),
  );

  const colAligns = columns.map(c => {
    if (c.format === 'currency' || c.format === 'number' || c.format === 'percentage' || c.format === 'bar')
      return 'right' as const;
    return (c.align || 'left') as 'left' | 'center' | 'right';
  });

  autoTable(doc, {
    startY: y,
    head,
    body,
    margin: { left: LM, right: RM },
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
      textColor: CLR.text,
      lineColor: CLR.rule,
      lineWidth: 0.2,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: CLR.white,
      textColor: CLR.muted,
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
    },
    alternateRowStyles: {
      fillColor: CLR.bg,
    },
    columnStyles: Object.fromEntries(
      colAligns.map((align, i) => [i, { halign: align }]),
    ),
    didDrawPage: () => {
      accentBar(doc);
      addRunningFooter(doc);
    },
  });

  return (doc as any).lastAutoTable.finalY + 8;
}

function drawStatusDistribution(
  doc: jsPDF,
  y: number,
  items: { name: string; value: number; color: string }[],
): number {
  y = ensureSpace(doc, y, 10 + items.length * 8);
  const total = items.reduce((s, i) => s + i.value, 0) || 1;

  const head = [['Status', 'Count', 'Share (%)', 'Distribution']];
  const body = items.map(item => {
    const pct = ((item.value / total) * 100).toFixed(1);
    return [item.name, String(item.value), `${pct}%`, ''];
  });

  // Add total row
  body.push(['Total', String(total), '100.0%', '']);

  autoTable(doc, {
    startY: y,
    head,
    body,
    margin: { left: LM, right: RM },
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      textColor: CLR.text,
      lineColor: CLR.rule,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: CLR.white,
      textColor: CLR.muted,
      fontStyle: 'bold',
      fontSize: 7,
    },
    alternateRowStyles: {
      fillColor: CLR.bg,
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 50 },
      1: { halign: 'right', cellWidth: 25 },
      2: { halign: 'right', cellWidth: 25 },
      3: { halign: 'left' },
    },
    didDrawCell: (data) => {
      // Draw inline progress bar in the Distribution column
      if (data.section === 'body' && data.column.index === 3 && data.row.index < items.length) {
        const item = items[data.row.index];
        const pct = (item.value / total) * 100;
        const cx = data.cell.x + 2;
        const cy = data.cell.y + data.cell.height / 2 - 1.5;
        const barMaxW = data.cell.width - 4;
        const barW = (pct / 100) * barMaxW;

        // Background track
        doc.setFillColor(...CLR.rule);
        doc.rect(cx, cy, barMaxW, 3, 'F');

        // Filled bar
        const hex = item.color;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        doc.setFillColor(r, g, b);
        doc.rect(cx, cy, barW, 3, 'F');
      }
    },
    didDrawPage: () => {
      accentBar(doc);
      addRunningFooter(doc);
    },
  });

  return (doc as any).lastAutoTable.finalY + 8;
}

function drawHorizontalBars(
  doc: jsPDF,
  y: number,
  items: { label: string; value: number }[],
): number {
  const barHeight = 6;
  const rowHeight = 10;
  const needed = items.length * rowHeight + 4;
  y = ensureSpace(doc, y, needed);

  const max = Math.max(...items.map(i => i.value), 1);
  const labelW = 50;
  const valueW = 25;
  const barX = LM + labelW;
  const barMaxW = pw(doc) - labelW - valueW - 4;

  items.forEach((item, i) => {
    const rowY = y + i * rowHeight;
    const pct = (item.value / max) * 100;

    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...CLR.text);
    doc.text(item.label, LM, rowY + barHeight - 1);

    // Bar track
    doc.setFillColor(...CLR.rule);
    doc.rect(barX, rowY, barMaxW, barHeight, 'F');

    // Bar fill
    doc.setFillColor(...CLR.accent);
    doc.rect(barX, rowY, (pct / 100) * barMaxW, barHeight, 'F');

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...CLR.text);
    doc.text(fmt(item.value), LM + labelW + barMaxW + 4, rowY + barHeight - 1);
  });

  return y + items.length * rowHeight + 8;
}

function drawSDGTable(
  doc: jsPDF,
  y: number,
  goals: { id: number; name: string; progress: number; color: string }[],
): number {
  y = ensureSpace(doc, y, 12 + goals.length * 7);

  const head = [['SDG', 'Goal', 'Alignment (%)']];
  const body = goals.map(g => [
    String(g.id),
    g.name,
    `${Math.min(g.progress, 100)}%`,
  ]);

  autoTable(doc, {
    startY: y,
    head,
    body,
    margin: { left: LM, right: RM },
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      textColor: CLR.text,
      lineColor: CLR.rule,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: CLR.white,
      textColor: CLR.muted,
      fontStyle: 'bold',
      fontSize: 7,
    },
    alternateRowStyles: {
      fillColor: CLR.bg,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
      1: { halign: 'left' },
      2: { halign: 'right', cellWidth: 30 },
    },
    didDrawPage: () => {
      accentBar(doc);
      addRunningFooter(doc);
    },
  });

  return (doc as any).lastAutoTable.finalY + 8;
}

function drawMetricsStrip(
  doc: jsPDF,
  y: number,
  metrics: { label: string; value: string; unit: string }[],
): number {
  const pageW = doc.internal.pageSize.getWidth();
  y = ensureSpace(doc, y, 26);

  const count = metrics.length;
  const totalW = pageW - LM - RM;
  const cellW = totalW / count;
  const h = 22;

  doc.setFillColor(...CLR.bg);
  doc.setDrawColor(...CLR.rule);
  doc.setLineWidth(0.3);
  doc.rect(LM, y, totalW, h, 'FD');

  for (let i = 1; i < count; i++) {
    const x = LM + i * cellW;
    doc.line(x, y + 3, x, y + h - 3);
  }

  metrics.forEach((m, i) => {
    const cx = LM + i * cellW + cellW / 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...CLR.dark);
    const display = `${m.value}${m.unit}`;
    doc.text(display, cx, y + 10, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...CLR.muted);
    doc.text(m.label, cx, y + 16, { align: 'center' });
  });

  return y + h + 8;
}

// ═══════════════════════════════════════════════════════════════════════
// FILE NAME HELPER
// ═══════════════════════════════════════════════════════════════════════

function ts(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
}

// ═══════════════════════════════════════════════════════════════════════
// PUBLIC — GENERAL REPORT
// ═══════════════════════════════════════════════════════════════════════

export async function generateGeneralReportPDF(data: GeneralReportData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  accentBar(doc);
  addRunningFooter(doc);

  const totalProjects = data.statusDistribution.reduce((s, i) => s + i.value, 0);
  const totalCategories = data.categoryDistribution.length;

  let y = drawCoverPage(
    doc,
    'General Performance Report',
    'A comprehensive overview of CSR project portfolio performance, budget allocation, status distribution, and category-level analysis across the Sultanate of Oman.',
    'Operational Report',
    data.dateRange,
  );

  // Section 1 — Executive Summary
  y = drawSectionHeading(doc, y, '01', 'Executive Summary');
  y = drawParagraph(
    doc,
    y,
    `This report covers a portfolio of ${fmt(totalProjects)} projects distributed across ${totalCategories} categories. The following key indicators provide a high-level snapshot of current operations.`,
  );
  y = drawKpiStrip(doc, y, data.kpis);

  // Section 2 — Status Distribution
  y = drawSectionHeading(doc, y, '02', 'Project Status Distribution');
  y = drawParagraph(
    doc,
    y,
    'The table below presents the current allocation of projects by operational status, including their relative share of the total portfolio.',
  );
  y = drawStatusDistribution(doc, y, data.statusDistribution);

  // Section 3 — Category Breakdown
  y = drawSectionHeading(doc, y, '03', 'Distribution by Category');
  y = drawParagraph(
    doc,
    y,
    'Category-level breakdown showing the number of active projects and their corresponding budget allocations.',
  );
  y = drawAutoTable(doc, y, [
    { key: 'name', header: 'Category', align: 'left' },
    { key: 'projects', header: 'Projects', align: 'right', format: 'number' },
    { key: 'budget', header: 'Budget (OMR)', align: 'right', format: 'currency' },
  ], data.categoryDistribution);

  doc.save(`CSR_General_Report_${ts()}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════
// PUBLIC — IMPACT REPORT
// ═══════════════════════════════════════════════════════════════════════

export async function generateImpactReportPDF(data: ImpactReportData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  accentBar(doc);
  addRunningFooter(doc);

  const activeSDGs = data.sdgGoals.filter(g => g.progress > 0);
  const demoLabelMap: Record<string, string> = {
    'الإجمالي': 'Total Beneficiaries',
    'ذكور': 'Male',
    'إناث': 'Female',
    'أطفال': 'Children',
    'كبار السن': 'Elderly',
    'ذوي الإعاقة': 'People with Disabilities',
  };

  const totalBeneficiaries =
    data.demographics.find(d => d.label === 'الإجمالي' || d.label === 'Total Beneficiaries')?.value ??
    data.demographics.reduce((s, d) => s + d.value, 0);

  let y = drawCoverPage(
    doc,
    'Social Impact Report',
    'Detailed analysis of beneficiary demographics, alignment with the United Nations Sustainable Development Goals (SDGs), and impact metrics across all CSR categories.',
    'Impact Assessment',
    data.dateRange,
  );

  // Section 1 — Impact Overview
  y = drawSectionHeading(doc, y, '01', 'Impact Overview');
  y = drawParagraph(
    doc,
    y,
    `CSR initiatives have reached a total of ${fmt(totalBeneficiaries)} beneficiaries. The following indicators summarise the social impact performance across all active programmes.`,
  );
  y = drawKpiStrip(doc, y, data.kpis);

  // Section 2 — Beneficiary Demographics
  y = drawSectionHeading(doc, y, '02', 'Beneficiary Demographics');
  y = drawParagraph(
    doc,
    y,
    'Demographic breakdown of the beneficiary population segmented by gender, age group, and accessibility status.',
  );
  y = drawHorizontalBars(
    doc,
    y,
    data.demographics.map(d => ({
      label: demoLabelMap[d.label] || d.label,
      value: d.value,
    })),
  );

  // Section 3 — SDG Alignment
  if (activeSDGs.length > 0) {
    y = drawSectionHeading(doc, y, '03', 'UN Sustainable Development Goals Alignment');
    y = drawParagraph(
      doc,
      y,
      `Current programmes contribute to ${activeSDGs.length} of the 17 UN SDGs. The alignment percentage reflects the proportion of projects linked to each goal.`,
    );
    y = drawSDGTable(doc, y, activeSDGs);
  }

  // Section 4 — Category Impact
  if (data.categoryImpact.length > 0) {
    const secNum = activeSDGs.length > 0 ? '04' : '03';
    y = drawSectionHeading(doc, y, secNum, 'Impact by Category');
    y = drawParagraph(
      doc,
      y,
      'Performance metrics for each CSR category, including project count, beneficiary reach, budget allocation, and satisfaction rating.',
    );
    y = drawAutoTable(doc, y, [
      { key: 'label', header: 'Category', align: 'left' },
      { key: 'projects', header: 'Projects', align: 'right', format: 'number' },
      { key: 'beneficiaries', header: 'Beneficiaries', align: 'right', format: 'number' },
      { key: 'budget', header: 'Budget (OMR)', align: 'right', format: 'currency' },
      { key: 'satisfaction', header: 'Satisfaction (%)', align: 'right', format: 'percentage' },
    ], data.categoryImpact);
  }

  doc.save(`CSR_Impact_Report_${ts()}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════
// PUBLIC — FINANCIAL REPORT
// ═══════════════════════════════════════════════════════════════════════

export async function generateFinancialReportPDF(data: FinancialReportData): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  accentBar(doc);
  addRunningFooter(doc);

  let y = drawCoverPage(
    doc,
    'Financial Analysis Report',
    'Comprehensive financial analysis covering budget allocation, expenditure tracking, utilisation rates, and efficiency metrics for the current reporting period.',
    'Financial Report',
    data.dateRange,
  );

  // Section 1 — Financial Summary
  y = drawSectionHeading(doc, y, '01', 'Financial Summary');
  y = drawParagraph(
    doc,
    y,
    'The following indicators provide a snapshot of the overall financial position, including total budget, disbursements, and utilisation.',
  );
  y = drawKpiStrip(doc, y, data.kpis);

  // Section 2 — Efficiency Metrics
  if (data.efficiencyMetrics.length > 0) {
    y = drawSectionHeading(doc, y, '02', 'Efficiency Metrics');
    y = drawParagraph(
      doc,
      y,
      'Key financial efficiency indicators measuring cost-effectiveness, budget discipline, and operational performance.',
    );
    y = drawMetricsStrip(doc, y, data.efficiencyMetrics);
  }

  // Section 3 — Expense Breakdown
  let sec = 3;
  if (data.expenseBreakdown.length > 0) {
    y = drawSectionHeading(doc, y, String(sec).padStart(2, '0'), 'Expenditure by Category');
    y = drawParagraph(
      doc,
      y,
      'Breakdown of total expenditure by expense category, showing absolute amounts and proportional share.',
    );
    y = drawAutoTable(doc, y, [
      { key: 'name', header: 'Expense Category', align: 'left' },
      { key: 'value', header: 'Amount (OMR)', align: 'right', format: 'currency' },
      { key: 'pct', header: 'Share (%)', align: 'right', format: 'percentage' },
    ], data.expenseBreakdown);
    sec++;
  }

  // Section 4 — Budget by Category
  if (data.categoryBreakdown.length > 0) {
    y = drawSectionHeading(doc, y, String(sec).padStart(2, '0'), 'Budget Allocation by Category');
    y = drawParagraph(
      doc,
      y,
      'Comparative view of budget allocation versus actual expenditure across CSR categories.',
    );
    y = drawAutoTable(doc, y, [
      { key: 'name', header: 'Category', align: 'left' },
      { key: 'budget', header: 'Budget (OMR)', align: 'right', format: 'currency' },
      { key: 'spent', header: 'Spent (OMR)', align: 'right', format: 'currency' },
      { key: 'projects', header: 'Projects', align: 'right', format: 'number' },
    ], data.categoryBreakdown);
    sec++;
  }

  // Section 5 — Project Financial Details
  if (data.projectFinancials.length > 0) {
    y = drawSectionHeading(doc, y, String(sec).padStart(2, '0'), 'Project Financial Details');
    y = drawParagraph(
      doc,
      y,
      'Detailed financial position for each project, including budget, expenditure, remaining balance, and utilisation rate.',
    );
    y = drawAutoTable(doc, y, [
      { key: 'name', header: 'Project', align: 'left' },
      { key: 'budget', header: 'Budget (OMR)', align: 'right', format: 'currency' },
      { key: 'spent', header: 'Spent (OMR)', align: 'right', format: 'currency' },
      { key: 'remaining', header: 'Remaining (OMR)', align: 'right', format: 'currency' },
      { key: 'pct', header: 'Utilisation (%)', align: 'right', format: 'percentage' },
      { key: 'status', header: 'Status', align: 'center' },
    ], data.projectFinancials);
  }

  doc.save(`CSR_Financial_Report_${ts()}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════
// ADDITIONAL DATA INTERFACES
// ═══════════════════════════════════════════════════════════════════════

export interface EarlyWarningData {
  kpis: KpiItem[];
  alerts: {
    projectName: string;
    type: string;
    level: string;
    message: string;
    createdAt: string;
    resolved: boolean;
  }[];
  levelDistribution: { name: string; value: number; color: string }[];
}

export interface DashboardData {
  kpis: KpiItem[];
  projectsByStatus: { name: string; value: number; color: string }[];
  projectsByCategory: { name: string; count: number }[];
  projectsByRegion: { name: string; count: number }[];
  budgetTrend: { month: string; budget: number; spent: number }[];
  recentProjects: { name: string; status: string; budget: number; progress: number; region: string }[];
}

export interface ProjectsListData {
  kpis: KpiItem[];
  projects: {
    name: string;
    category: string;
    status: string;
    region: string;
    budget: number;
    progress: number;
    startDate: string;
    endDate: string;
  }[];
  statusDistribution: { name: string; value: number; color: string }[];
}

export interface IdeasData {
  kpis: KpiItem[];
  ideas: {
    title: string;
    author: string;
    status: string;
    category: string;
    votes: number;
    createdAt: string;
  }[];
  statusDistribution: { name: string; value: number; color: string }[];
}

export interface PartnersData {
  kpis: KpiItem[];
  partners: {
    name: string;
    type: string;
    supportArea: string;
    totalContribution: number;
    status: string;
    contactPerson: string;
  }[];
  leaderboard: {
    rank: number;
    name: string;
    department: string;
    totalDonated: number;
    monthsActive: number;
  }[];
}

export interface UserManagementData {
  kpis: KpiItem[];
  users: {
    name: string;
    email: string;
    role: string;
    department: string;
    status: string;
    jobTitle: string;
    contractType: string;
    projectsCount: number;
    actionsCount: number;
  }[];
  roleDistribution: { name: string; value: number; color: string }[];
}

export interface CategoryManagementData {
  kpis: KpiItem[];
  categories: {
    name: string;
    status: string;
    projectCount: number;
    activeProjects: number;
    totalBudget: number;
    spentBudget: number;
    beneficiaries: number;
    impactScore: number;
    riskLevel: string;
  }[];
}

export interface ArchivedProjectsData {
  kpis: KpiItem[];
  projects: {
    name: string;
    categoryName: string;
    region: string;
    budget: number;
    progress: number;
    lastStatus: string;
    archivedAt: string;
    archiveReason: string;
  }[];
}

// ═══════════════════════════════════════════════════════════════════════
// PUBLIC — EARLY WARNING REPORT
// ═══════════════════════════════════════════════════════════════════════

export async function generateEarlyWarningPDF(data: EarlyWarningData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  accentBar(doc);
  addRunningFooter(doc);

  const totalAlerts = data.alerts.length;
  const activeAlerts = data.alerts.filter(a => !a.resolved).length;

  let y = drawCoverPage(
    doc,
    'Early Warning & Risk Alerts Report',
    `Comprehensive overview of system-generated risk alerts across the project portfolio. Currently tracking ${fmt(totalAlerts)} alerts, of which ${fmt(activeAlerts)} remain unresolved and require attention.`,
    'Risk Management Report',
  );

  // Section 1 — Alert Overview
  y = drawSectionHeading(doc, y, '01', 'Alert Overview');
  y = drawParagraph(
    doc,
    y,
    `The early warning system monitors budget overruns, timeline delays, and quality degradation indicators. The following metrics summarise the current risk posture.`,
  );
  y = drawKpiStrip(doc, y, data.kpis);

  // Section 2 — Severity Distribution
  if (data.levelDistribution.length > 0) {
    y = drawSectionHeading(doc, y, '02', 'Alert Severity Distribution');
    y = drawParagraph(
      doc,
      y,
      'Distribution of alerts by severity level, providing an at-a-glance view of the risk landscape.',
    );
    y = drawStatusDistribution(doc, y, data.levelDistribution);
  }

  // Section 3 — Active Alerts Detail
  const activeList = data.alerts.filter(a => !a.resolved);
  if (activeList.length > 0) {
    y = drawSectionHeading(doc, y, '03', 'Active Alerts');
    y = drawParagraph(
      doc,
      y,
      `${fmt(activeList.length)} unresolved alerts requiring immediate attention. Sorted by severity.`,
    );
    y = drawAutoTable(doc, y, [
      { key: 'projectName', header: 'Project', align: 'left' },
      { key: 'type', header: 'Type', align: 'center' },
      { key: 'level', header: 'Severity', align: 'center' },
      { key: 'message', header: 'Description', align: 'left' },
      { key: 'createdAt', header: 'Date', align: 'center' },
    ], activeList.map(a => ({
      projectName: a.projectName,
      type: a.type,
      level: a.level,
      message: a.message,
      createdAt: a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-GB') : '\u2014',
    })));
  }

  // Section 4 — Resolved Alerts
  const resolvedList = data.alerts.filter(a => a.resolved);
  if (resolvedList.length > 0) {
    const secNum = activeList.length > 0 ? '04' : '03';
    y = drawSectionHeading(doc, y, secNum, 'Resolved Alerts');
    y = drawParagraph(
      doc,
      y,
      `${fmt(resolvedList.length)} alerts have been successfully resolved.`,
    );
    y = drawAutoTable(doc, y, [
      { key: 'projectName', header: 'Project', align: 'left' },
      { key: 'type', header: 'Type', align: 'center' },
      { key: 'level', header: 'Severity', align: 'center' },
      { key: 'message', header: 'Description', align: 'left' },
      { key: 'createdAt', header: 'Date', align: 'center' },
    ], resolvedList.map(a => ({
      projectName: a.projectName,
      type: a.type,
      level: a.level,
      message: a.message,
      createdAt: a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-GB') : '\u2014',
    })));
  }

  doc.save(`CSR_Early_Warning_Report_${ts()}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════
// PUBLIC — DASHBOARD REPORT
// ═══════════════════════════════════════════════════════════════════════

export async function generateDashboardPDF(data: DashboardData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  accentBar(doc);
  addRunningFooter(doc);

  let y = drawCoverPage(
    doc,
    'Executive Dashboard Report',
    'High-level summary of CSR platform operations including project performance, budget allocation, geographic distribution, and portfolio status.',
    'Executive Summary',
  );

  // Section 1 — Key Performance Indicators
  y = drawSectionHeading(doc, y, '01', 'Key Performance Indicators');
  y = drawParagraph(
    doc,
    y,
    'Core metrics reflecting the overall health and performance of the CSR project portfolio.',
  );
  y = drawKpiStrip(doc, y, data.kpis);

  // Section 2 — Portfolio Status
  if (data.projectsByStatus.length > 0) {
    y = drawSectionHeading(doc, y, '02', 'Portfolio Status Distribution');
    y = drawParagraph(
      doc,
      y,
      'Current distribution of projects across operational states.',
    );
    y = drawStatusDistribution(doc, y, data.projectsByStatus);
  }

  // Section 3 — Category Distribution
  if (data.projectsByCategory.length > 0) {
    y = drawSectionHeading(doc, y, '03', 'Projects by Category');
    y = drawParagraph(
      doc,
      y,
      'Distribution of active projects across CSR categories.',
    );
    y = drawHorizontalBars(doc, y, data.projectsByCategory.map(c => ({
      label: c.name,
      value: c.count,
    })));
  }

  // Section 4 — Geographic Distribution
  if (data.projectsByRegion.length > 0) {
    y = drawSectionHeading(doc, y, '04', 'Geographic Distribution');
    y = drawParagraph(
      doc,
      y,
      'Regional spread of CSR initiatives across the governorates of Oman.',
    );
    y = drawHorizontalBars(doc, y, data.projectsByRegion.map(r => ({
      label: r.name,
      value: r.count,
    })));
  }

  // Section 5 — Budget Trend
  if (data.budgetTrend.length > 0) {
    y = drawSectionHeading(doc, y, '05', 'Budget vs Expenditure Trend');
    y = drawParagraph(
      doc,
      y,
      'Monthly comparison of allocated budget versus actual expenditure over the reporting period.',
    );
    y = drawAutoTable(doc, y, [
      { key: 'month', header: 'Month', align: 'left' },
      { key: 'budget', header: 'Budget (OMR)', align: 'right', format: 'currency' },
      { key: 'spent', header: 'Spent (OMR)', align: 'right', format: 'currency' },
    ], data.budgetTrend);
  }

  // Section 6 — Recent Projects
  if (data.recentProjects.length > 0) {
    y = drawSectionHeading(doc, y, '06', 'Recent Projects');
    y = drawParagraph(
      doc,
      y,
      'Most recently created or updated projects in the portfolio.',
    );
    y = drawAutoTable(doc, y, [
      { key: 'name', header: 'Project', align: 'left' },
      { key: 'status', header: 'Status', align: 'center' },
      { key: 'region', header: 'Region', align: 'center' },
      { key: 'budget', header: 'Budget (OMR)', align: 'right', format: 'currency' },
      { key: 'progress', header: 'Progress (%)', align: 'right', format: 'percentage' },
    ], data.recentProjects);
  }

  doc.save(`CSR_Dashboard_Report_${ts()}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════
// PUBLIC — PROJECTS LIST REPORT
// ═══════════════════════════════════════════════════════════════════════

export async function generateProjectsListPDF(data: ProjectsListData): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  accentBar(doc);
  addRunningFooter(doc);

  const totalProjects = data.projects.length;

  let y = drawCoverPage(
    doc,
    'CSR Projects Portfolio',
    `Complete inventory of ${fmt(totalProjects)} projects currently registered in the platform, with status, budget, timeline, and progress information.`,
    'Portfolio Inventory',
  );

  // Section 1 — Portfolio Summary
  y = drawSectionHeading(doc, y, '01', 'Portfolio Summary');
  y = drawKpiStrip(doc, y, data.kpis);

  // Section 2 — Status Distribution
  if (data.statusDistribution.length > 0) {
    y = drawSectionHeading(doc, y, '02', 'Status Distribution');
    y = drawStatusDistribution(doc, y, data.statusDistribution);
  }

  // Section 3 — Project Register
  y = drawSectionHeading(doc, y, '03', 'Project Register');
  y = drawParagraph(
    doc,
    y,
    'Detailed listing of all projects with category, location, financial allocation, and completion progress.',
  );
  y = drawAutoTable(doc, y, [
    { key: 'name', header: 'Project Name', align: 'left' },
    { key: 'category', header: 'Category', align: 'left' },
    { key: 'status', header: 'Status', align: 'center' },
    { key: 'region', header: 'Region', align: 'center' },
    { key: 'budget', header: 'Budget (OMR)', align: 'right', format: 'currency' },
    { key: 'progress', header: 'Progress (%)', align: 'right', format: 'percentage' },
    { key: 'startDate', header: 'Start Date', align: 'center' },
    { key: 'endDate', header: 'End Date', align: 'center' },
  ], data.projects.map(p => ({
    ...p,
    startDate: p.startDate && p.startDate !== '-' ? new Date(p.startDate).toLocaleDateString('en-GB') : '\u2014',
    endDate: p.endDate && p.endDate !== '-' ? new Date(p.endDate).toLocaleDateString('en-GB') : '\u2014',
  })));

  doc.save(`CSR_Projects_List_${ts()}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════
// PUBLIC — IDEAS HUB REPORT
// ═══════════════════════════════════════════════════════════════════════

export async function generateIdeasPDF(data: IdeasData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  accentBar(doc);
  addRunningFooter(doc);

  const totalIdeas = data.ideas.length;

  let y = drawCoverPage(
    doc,
    'Ideas Hub Report',
    `Summary of ${fmt(totalIdeas)} employee-submitted ideas including voting results, status tracking, and category distribution. The Ideas Hub serves as the platform for grassroots CSR innovation.`,
    'Innovation Report',
  );

  // Section 1 — Overview
  y = drawSectionHeading(doc, y, '01', 'Ideas Overview');
  y = drawKpiStrip(doc, y, data.kpis);

  // Section 2 — Status Distribution
  if (data.statusDistribution.length > 0) {
    y = drawSectionHeading(doc, y, '02', 'Status Distribution');
    y = drawParagraph(
      doc,
      y,
      'Breakdown of submitted ideas by their current review status.',
    );
    y = drawStatusDistribution(doc, y, data.statusDistribution);
  }

  // Section 3 — Ideas Register
  y = drawSectionHeading(doc, y, '03', 'Ideas Register');
  y = drawParagraph(
    doc,
    y,
    'Complete listing of all submitted ideas, ordered by vote count.',
  );
  y = drawAutoTable(doc, y, [
    { key: 'title', header: 'Title', align: 'left' },
    { key: 'author', header: 'Author', align: 'left' },
    { key: 'category', header: 'Category', align: 'center' },
    { key: 'status', header: 'Status', align: 'center' },
    { key: 'votes', header: 'Votes', align: 'right', format: 'number' },
    { key: 'createdAt', header: 'Date', align: 'center' },
  ], data.ideas.map(i => ({
    ...i,
    createdAt: i.createdAt ? new Date(i.createdAt).toLocaleDateString('en-GB') : '\u2014',
  })));

  doc.save(`CSR_Ideas_Report_${ts()}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════
// PUBLIC — PARTNERS & DONATIONS REPORT
// ═══════════════════════════════════════════════════════════════════════

export async function generatePartnersPDF(data: PartnersData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  accentBar(doc);
  addRunningFooter(doc);

  let y = drawCoverPage(
    doc,
    'Partners & Donations Report',
    `Overview of CSR partnership ecosystem including ${fmt(data.partners.length)} registered partners and micro-donation programme performance with donor leaderboard.`,
    'Partnership Report',
  );

  // Section 1 — Partnership Overview
  y = drawSectionHeading(doc, y, '01', 'Partnership Overview');
  y = drawKpiStrip(doc, y, data.kpis);

  // Section 2 — Partners Directory
  y = drawSectionHeading(doc, y, '02', 'Partners Directory');
  y = drawParagraph(
    doc,
    y,
    'Complete listing of all registered CSR partners with type, focus area, and contribution details.',
  );
  y = drawAutoTable(doc, y, [
    { key: 'name', header: 'Partner', align: 'left' },
    { key: 'type', header: 'Type', align: 'center' },
    { key: 'supportArea', header: 'Support Area', align: 'left' },
    { key: 'totalContribution', header: 'Contribution (OMR)', align: 'right', format: 'currency' },
    { key: 'status', header: 'Status', align: 'center' },
    { key: 'contactPerson', header: 'Contact', align: 'left' },
  ], data.partners);

  // Section 3 — Donation Leaderboard
  if (data.leaderboard.length > 0) {
    y = drawSectionHeading(doc, y, '03', 'Micro-Donation Leaderboard');
    y = drawParagraph(
      doc,
      y,
      'Top employee donors ranked by total contribution amount.',
    );
    y = drawAutoTable(doc, y, [
      { key: 'rank', header: '#', align: 'center' },
      { key: 'name', header: 'Employee', align: 'left' },
      { key: 'department', header: 'Department', align: 'center' },
      { key: 'totalDonated', header: 'Total Donated (OMR)', align: 'right', format: 'currency' },
      { key: 'monthsActive', header: 'Months Active', align: 'center', format: 'number' },
    ], data.leaderboard);
  }

  doc.save(`CSR_Partners_Report_${ts()}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════
// PUBLIC — USER MANAGEMENT REPORT
// ═══════════════════════════════════════════════════════════════════════

export async function generateUserManagementPDF(data: UserManagementData): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  accentBar(doc);
  addRunningFooter(doc);

  let y = drawCoverPage(
    doc,
    'User Management Report',
    `Comprehensive user directory with ${fmt(data.users.length)} registered accounts, including role assignments, departmental distribution, activity metrics, and security status.`,
    'Administrative Report',
  );

  // Section 1 — User Statistics
  y = drawSectionHeading(doc, y, '01', 'User Statistics');
  y = drawKpiStrip(doc, y, data.kpis);

  // Section 2 — Role Distribution
  if (data.roleDistribution.length > 0) {
    y = drawSectionHeading(doc, y, '02', 'Role Distribution');
    y = drawParagraph(
      doc,
      y,
      'Distribution of user accounts by assigned platform role.',
    );
    y = drawStatusDistribution(doc, y, data.roleDistribution);
  }

  // Section 3 — User Directory
  y = drawSectionHeading(doc, y, '03', 'User Directory');
  y = drawParagraph(
    doc,
    y,
    'Complete listing of all registered users with account details, role, and activity metrics.',
  );
  y = drawAutoTable(doc, y, [
    { key: 'name', header: 'Name', align: 'left' },
    { key: 'email', header: 'Email', align: 'left' },
    { key: 'role', header: 'Role', align: 'center' },
    { key: 'department', header: 'Department', align: 'center' },
    { key: 'status', header: 'Status', align: 'center' },
    { key: 'jobTitle', header: 'Job Title', align: 'left' },
    { key: 'contractType', header: 'Contract', align: 'center' },
    { key: 'projectsCount', header: 'Projects', align: 'right', format: 'number' },
    { key: 'actionsCount', header: 'Actions', align: 'right', format: 'number' },
  ], data.users);

  doc.save(`CSR_Users_Report_${ts()}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════
// PUBLIC — CATEGORY MANAGEMENT REPORT
// ═══════════════════════════════════════════════════════════════════════

export async function generateCategoryManagementPDF(data: CategoryManagementData): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  accentBar(doc);
  addRunningFooter(doc);

  let y = drawCoverPage(
    doc,
    'Category Management Report',
    `Analysis of ${fmt(data.categories.length)} CSR programme categories with project allocation, budget utilisation, beneficiary reach, and impact scoring.`,
    'Category Analysis',
  );

  // Section 1 — Category Overview
  y = drawSectionHeading(doc, y, '01', 'Category Overview');
  y = drawKpiStrip(doc, y, data.kpis);

  // Section 2 — Category Details
  y = drawSectionHeading(doc, y, '02', 'Category Performance Matrix');
  y = drawParagraph(
    doc,
    y,
    'Detailed performance metrics for each CSR category, including project counts, budget, expenditure, beneficiaries, and risk levels.',
  );
  y = drawAutoTable(doc, y, [
    { key: 'name', header: 'Category', align: 'left' },
    { key: 'status', header: 'Status', align: 'center' },
    { key: 'projectCount', header: 'Projects', align: 'right', format: 'number' },
    { key: 'activeProjects', header: 'Active', align: 'right', format: 'number' },
    { key: 'totalBudget', header: 'Budget (OMR)', align: 'right', format: 'currency' },
    { key: 'spentBudget', header: 'Spent (OMR)', align: 'right', format: 'currency' },
    { key: 'beneficiaries', header: 'Beneficiaries', align: 'right', format: 'number' },
    { key: 'impactScore', header: 'Impact', align: 'right', format: 'percentage' },
    { key: 'riskLevel', header: 'Risk', align: 'center' },
  ], data.categories);

  doc.save(`CSR_Categories_Report_${ts()}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════
// PUBLIC — ARCHIVED PROJECTS REPORT
// ═══════════════════════════════════════════════════════════════════════

export async function generateArchivedProjectsPDF(data: ArchivedProjectsData): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  accentBar(doc);
  addRunningFooter(doc);

  let y = drawCoverPage(
    doc,
    'Archived Projects Report',
    `Record of ${fmt(data.projects.length)} archived CSR projects with original status, budget allocation, completion progress, and archival details.`,
    'Archive Registry',
  );

  // Section 1 — Archive Summary
  y = drawSectionHeading(doc, y, '01', 'Archive Summary');
  y = drawKpiStrip(doc, y, data.kpis);

  // Section 2 — Archived Projects
  y = drawSectionHeading(doc, y, '02', 'Archived Projects Register');
  y = drawParagraph(
    doc,
    y,
    'Comprehensive list of all archived projects including their last operational status before archival.',
  );
  y = drawAutoTable(doc, y, [
    { key: 'name', header: 'Project', align: 'left' },
    { key: 'categoryName', header: 'Category', align: 'left' },
    { key: 'region', header: 'Region', align: 'center' },
    { key: 'budget', header: 'Budget (OMR)', align: 'right', format: 'currency' },
    { key: 'progress', header: 'Progress (%)', align: 'right', format: 'percentage' },
    { key: 'lastStatus', header: 'Last Status', align: 'center' },
    { key: 'archivedAt', header: 'Archived', align: 'center' },
    { key: 'archiveReason', header: 'Reason', align: 'left' },
  ], data.projects.map(p => ({
    ...p,
    archivedAt: p.archivedAt ? new Date(p.archivedAt).toLocaleDateString('en-GB') : '\u2014',
  })));

  doc.save(`CSR_Archived_Projects_${ts()}.pdf`);
}
