/**
 * Enterprise-Grade Export Utilities for CSR Platform
 * Supports: Excel (.xlsx), PDF, Print functionality
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';

// ============================================================================
// TYPES
// ============================================================================

export interface ExportColumn {
  key: string;
  header: string;
  width?: number;
  format?: 'text' | 'number' | 'currency' | 'date' | 'percentage';
}

export interface ExportOptions {
  filename: string;
  title?: string;
  subtitle?: string;
  columns: ExportColumn[];
  dateRange?: { from?: string; to?: string };
  orientation?: 'portrait' | 'landscape';
  includeTimestamp?: boolean;
  companyName?: string;
  logoUrl?: string;
}

export interface ChartExportOptions {
  filename: string;
  title: string;
  chartElementId?: string;
}

// ============================================================================
// EXCEL EXPORT
// ============================================================================

/**
 * Export data to Excel (.xlsx) file
 * Professional formatting with headers, styling, and auto-width columns
 */
export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  options: ExportOptions
): void {
  const {
    filename,
    title,
    subtitle,
    columns,
    dateRange,
    includeTimestamp = true,
    companyName = 'CSR Platform - منصة المسؤولية الاجتماعية'
  } = options;

  // Prepare header rows
  const headerRows: (string | number)[][] = [];
  
  // Company name row
  headerRows.push([companyName]);
  
  // Title row
  if (title) {
    headerRows.push([title]);
  }
  
  // Subtitle row
  if (subtitle) {
    headerRows.push([subtitle]);
  }
  
  // Date range row
  if (dateRange) {
    const rangeText = `الفترة: ${dateRange.from || 'البداية'} - ${dateRange.to || 'الآن'}`;
    headerRows.push([rangeText]);
  }
  
  // Timestamp row
  if (includeTimestamp) {
    headerRows.push([`تاريخ التصدير: ${new Date().toLocaleString('ar-SA')}`]);
  }
  
  // Empty row before data
  headerRows.push([]);
  
  // Column headers
  const columnHeaders = columns.map(col => col.header);
  headerRows.push(columnHeaders);
  
  // Data rows
  const dataRows = data.map(row => {
    return columns.map(col => {
      const value = row[col.key];
      return formatCellValue(value, col.format);
    });
  });
  
  // Combine all rows
  const allRows = [...headerRows, ...dataRows];
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(allRows);
  
  // Set column widths
  const colWidths = columns.map(col => ({ wch: col.width || 15 }));
  ws['!cols'] = colWidths;
  
  // Merge cells for header rows
  const mergeRanges: XLSX.Range[] = [];
  const numCols = columns.length;
  
  for (let i = 0; i < headerRows.length - 1; i++) {
    if (headerRows[i].length === 1 && headerRows[i][0]) {
      mergeRanges.push({
        s: { r: i, c: 0 },
        e: { r: i, c: numCols - 1 }
      });
    }
  }
  ws['!merges'] = mergeRanges;
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'التقرير');
  
  // Generate filename
  const finalFilename = `${filename}_${formatDateForFilename(new Date())}.xlsx`;
  
  // Export
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, finalFilename);
}

/**
 * Export multiple sheets to single Excel file
 */
export function exportMultiSheetExcel(
  sheets: { name: string; data: Record<string, unknown>[]; columns: ExportColumn[] }[],
  filename: string
): void {
  const wb = XLSX.utils.book_new();
  
  sheets.forEach(sheet => {
    const headers = sheet.columns.map(col => col.header);
    const rows = sheet.data.map(row => 
      sheet.columns.map(col => formatCellValue(row[col.key], col.format))
    );
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = sheet.columns.map(col => ({ wch: col.width || 15 }));
    
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });
  
  const finalFilename = `${filename}_${formatDateForFilename(new Date())}.xlsx`;
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, finalFilename);
}

// ============================================================================
// PDF EXPORT
// ============================================================================

/**
 * Export data to PDF with professional formatting
 * Supports Arabic text with proper RTL handling
 */
export function exportToPDF<T extends Record<string, unknown>>(
  data: T[],
  options: ExportOptions
): void {
  const {
    filename,
    title,
    subtitle,
    columns,
    dateRange,
    orientation = 'portrait',
    includeTimestamp = true,
    companyName = 'CSR Platform - منصة المسؤولية الاجتماعية'
  } = options;

  // Create PDF document
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  });

  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // Add header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Add title
  if (title) {
    doc.setFontSize(14);
    doc.text(title, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;
  }

  // Add subtitle
  if (subtitle) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 6;
  }

  // Add date range
  if (dateRange) {
    doc.setFontSize(10);
    const rangeText = `Period: ${dateRange.from || 'Start'} - ${dateRange.to || 'Now'}`;
    doc.text(rangeText, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 6;
  }

  // Add timestamp
  if (includeTimestamp) {
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });
    doc.setTextColor(0);
    yPosition += 10;
  }

  // Prepare table data
  const tableHeaders = columns.map(col => col.header);
  const tableData = data.map(row => 
    columns.map(col => {
      const value = formatCellValue(row[col.key], col.format);
      return value?.toString() || '';
    })
  );

  // Add table using autoTable
  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    startY: yPosition,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      overflow: 'linebreak',
      halign: 'center',
      valign: 'middle'
    },
    headStyles: {
      fillColor: [45, 85, 155],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 10
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250]
    },
    columnStyles: columns.reduce((acc, col, idx) => {
      acc[idx] = {
        cellWidth: col.width ? col.width * 0.5 : 'auto',
        halign: col.format === 'number' || col.format === 'currency' || col.format === 'percentage' ? 'right' : 'center'
      };
      return acc;
    }, {} as Record<number, object>),
    didDrawPage: (data) => {
      // Footer with page number
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }
  });

  // Generate filename
  const finalFilename = `${filename}_${formatDateForFilename(new Date())}.pdf`;
  
  // Save
  doc.save(finalFilename);
}

/**
 * Export dashboard/chart section to PDF with visual capture
 */
export async function exportDashboardToPDF(
  elementId: string,
  filename: string,
  title: string
): Promise<void> {
  const html2canvas = (await import('html2canvas')).default;
  
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return;
  }

  // Capture element as canvas
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff'
  });

  // Create PDF
  const imgWidth = 190;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
  const doc = new jsPDF({
    orientation: imgHeight > 250 ? 'portrait' : 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = (pageWidth - imgWidth) / 2;

  // Add title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, 15, { align: 'center' });

  // Add timestamp
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 22, { align: 'center' });

  // Add image
  const imgData = canvas.toDataURL('image/png');
  doc.addImage(imgData, 'PNG', margin, 28, imgWidth, imgHeight);

  // Save
  const finalFilename = `${filename}_${formatDateForFilename(new Date())}.pdf`;
  doc.save(finalFilename);
}

// ============================================================================
// PRINT FUNCTIONALITY
// ============================================================================

/**
 * Print specific element or entire page
 * Opens print dialog with proper formatting
 */
export function printReport(elementId?: string, title?: string): void {
  if (elementId) {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Element with id "${elementId}" not found`);
      window.print();
      return;
    }

    // Create print window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      console.error('Could not open print window');
      return;
    }

    // Build print document
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>${title || 'تقرير - CSR Platform'}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 20px;
            direction: rtl;
          }
          .print-header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #2d5599;
          }
          .print-header h1 {
            color: #2d5599;
            font-size: 24px;
            margin-bottom: 5px;
          }
          .print-header p {
            color: #666;
            font-size: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: center;
          }
          th {
            background-color: #2d5599;
            color: white;
            font-weight: bold;
          }
          tr:nth-child(even) {
            background-color: #f5f7fa;
          }
          .print-footer {
            margin-top: 20px;
            text-align: center;
            font-size: 10px;
            color: #999;
          }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>${title || 'تقرير منصة المسؤولية الاجتماعية'}</h1>
          <p>تاريخ الطباعة: ${new Date().toLocaleString('ar-SA')}</p>
        </div>
        ${element.innerHTML}
        <div class="print-footer">
          <p>CSR Platform - منصة المسؤولية الاجتماعية للشركات</p>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  } else {
    // Print current page
    window.print();
  }
}

/**
 * Print data as formatted table
 */
export function printTable<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn[],
  title: string
): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Could not open print window');
    return;
  }

  // Build table HTML
  const tableHeaders = columns.map(col => `<th>${col.header}</th>`).join('');
  const tableRows = data.map(row => {
    const cells = columns.map(col => {
      const value = formatCellValue(row[col.key], col.format);
      return `<td>${value || '-'}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>${title} - CSR Platform</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          padding: 20px;
          direction: rtl;
        }
        .header {
          text-align: center;
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 3px solid #2d5599;
        }
        .header h1 {
          color: #2d5599;
          font-size: 26px;
          margin-bottom: 5px;
        }
        .header .subtitle {
          color: #666;
          font-size: 14px;
        }
        .header .date {
          color: #999;
          font-size: 11px;
          margin-top: 5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
          font-size: 12px;
        }
        th {
          background-color: #2d5599;
          color: white;
          font-weight: bold;
          padding: 12px 8px;
          text-align: center;
          border: 1px solid #1a3a6e;
        }
        td {
          border: 1px solid #ddd;
          padding: 10px 8px;
          text-align: center;
        }
        tr:nth-child(even) { background-color: #f8f9fa; }
        tr:hover { background-color: #e8f4fc; }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 10px;
          color: #999;
          border-top: 1px solid #ddd;
          padding-top: 10px;
        }
        .stats {
          margin-top: 15px;
          text-align: left;
          font-size: 11px;
          color: #666;
        }
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>منصة المسؤولية الاجتماعية</h1>
        <div class="subtitle">${title}</div>
        <div class="date">تاريخ الطباعة: ${new Date().toLocaleString('ar-SA')}</div>
      </div>
      <table>
        <thead><tr>${tableHeaders}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
      <div class="stats">
        إجمالي السجلات: ${data.length}
      </div>
      <div class="footer">
        CSR Platform - منصة المسؤولية الاجتماعية للشركات العُمانية
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format cell value based on type
 */
function formatCellValue(
  value: unknown,
  format?: 'text' | 'number' | 'currency' | 'date' | 'percentage'
): string | number {
  if (value === null || value === undefined) {
    return '-';
  }

  switch (format) {
    case 'currency':
      return typeof value === 'number' 
        ? `${value.toLocaleString('en-US')} OMR` 
        : String(value);
    
    case 'number':
      return typeof value === 'number' 
        ? value.toLocaleString('en-US') 
        : String(value);
    
    case 'percentage':
      return typeof value === 'number' 
        ? `${value.toFixed(1)}%` 
        : String(value);
    
    case 'date':
      if (value instanceof Date) {
        return value.toLocaleDateString('ar-SA');
      }
      if (typeof value === 'string') {
        return new Date(value).toLocaleDateString('ar-SA');
      }
      return String(value);
    
    case 'text':
    default:
      return String(value);
  }
}

/**
 * Format date for filename (YYYY-MM-DD_HH-mm)
 */
function formatDateForFilename(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}_${hours}-${minutes}`;
}

// ============================================================================
// PRESET EXPORT CONFIGURATIONS
// ============================================================================

/**
 * Common column configurations for different report types
 */
export const reportColumns = {
  projects: [
    { key: 'name', header: 'اسم المشروع', width: 25 },
    { key: 'category', header: 'التصنيف', width: 15 },
    { key: 'status', header: 'الحالة', width: 12 },
    { key: 'region', header: 'المنطقة', width: 15 },
    { key: 'budget', header: 'الميزانية', width: 15, format: 'currency' as const },
    { key: 'progress', header: 'التقدم', width: 10, format: 'percentage' as const },
    { key: 'startDate', header: 'تاريخ البدء', width: 12, format: 'date' as const },
    { key: 'endDate', header: 'تاريخ الانتهاء', width: 12, format: 'date' as const }
  ],
  
  users: [
    { key: 'name', header: 'الاسم', width: 20 },
    { key: 'email', header: 'البريد الإلكتروني', width: 25 },
    { key: 'role', header: 'الدور', width: 12 },
    { key: 'department', header: 'القسم', width: 15 },
    { key: 'status', header: 'الحالة', width: 10 },
    { key: 'createdAt', header: 'تاريخ الإنشاء', width: 15, format: 'date' as const }
  ],
  
  partners: [
    { key: 'name', header: 'اسم الشريك', width: 20 },
    { key: 'type', header: 'النوع', width: 12 },
    { key: 'supportArea', header: 'مجال الدعم', width: 15 },
    { key: 'totalContribution', header: 'إجمالي المساهمات', width: 18, format: 'currency' as const },
    { key: 'projectsCount', header: 'عدد المشاريع', width: 12, format: 'number' as const },
    { key: 'status', header: 'الحالة', width: 10 }
  ],
  
  donations: [
    { key: 'partnerName', header: 'الشريك', width: 20 },
    { key: 'amount', header: 'المبلغ', width: 15, format: 'currency' as const },
    { key: 'type', header: 'النوع', width: 12 },
    { key: 'date', header: 'التاريخ', width: 12, format: 'date' as const }
  ],
  
  expenses: [
    { key: 'projectName', header: 'المشروع', width: 20 },
    { key: 'category', header: 'الفئة', width: 15 },
    { key: 'amount', header: 'المبلغ', width: 15, format: 'currency' as const },
    { key: 'status', header: 'الحالة', width: 12 },
    { key: 'date', header: 'التاريخ', width: 12, format: 'date' as const }
  ],
  
  alerts: [
    { key: 'projectName', header: 'المشروع', width: 20 },
    { key: 'type', header: 'النوع', width: 12 },
    { key: 'level', header: 'المستوى', width: 10 },
    { key: 'message', header: 'الرسالة', width: 30 },
    { key: 'createdAt', header: 'التاريخ', width: 15, format: 'date' as const },
    { key: 'resolved', header: 'تم الحل', width: 10 }
  ],
  
  ideas: [
    { key: 'title', header: 'العنوان', width: 25 },
    { key: 'submittedBy', header: 'مقدم من', width: 15 },
    { key: 'category', header: 'التصنيف', width: 15 },
    { key: 'status', header: 'الحالة', width: 12 },
    { key: 'votes', header: 'الأصوات', width: 10, format: 'number' as const },
    { key: 'createdAt', header: 'التاريخ', width: 12, format: 'date' as const }
  ],
  
  beneficiaries: [
    { key: 'projectName', header: 'المشروع', width: 20 },
    { key: 'total', header: 'الإجمالي', width: 12, format: 'number' as const },
    { key: 'male', header: 'ذكور', width: 10, format: 'number' as const },
    { key: 'female', header: 'إناث', width: 10, format: 'number' as const },
    { key: 'children', header: 'أطفال', width: 10, format: 'number' as const },
    { key: 'elderly', header: 'كبار السن', width: 10, format: 'number' as const },
    { key: 'disabled', header: 'ذوي الإعاقة', width: 10, format: 'number' as const }
  ],

  financial: [
    { key: 'category', header: 'الفئة', width: 20 },
    { key: 'budget', header: 'الميزانية', width: 15, format: 'currency' as const },
    { key: 'spent', header: 'المصروف', width: 15, format: 'currency' as const },
    { key: 'remaining', header: 'المتبقي', width: 15, format: 'currency' as const },
    { key: 'utilization', header: 'نسبة الاستخدام', width: 12, format: 'percentage' as const }
  ],

  general: [
    { key: 'metric', header: 'المؤشر', width: 25 },
    { key: 'value', header: 'القيمة', width: 20 },
    { key: 'change', header: 'التغيير', width: 15 },
    { key: 'trend', header: 'الاتجاه', width: 12 }
  ]
};

// ============================================================================
// PROFESSIONAL MULTI-SHEET REPORT GENERATORS
// Each function mirrors the corresponding PDF structure as a full workbook.
// ============================================================================

/** Shared: write a section header block into an AOA worksheet builder */
function _sheetAoa(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number | null)[][],
  dateRange?: { from?: string; to?: string }
): (string | number | null)[][] {
  const now = new Date().toLocaleString('en-GB');
  const meta: (string | number | null)[][] = [
    ['CSR Platform — منصة المسؤولية الاجتماعية للشركات'],
    [title],
    [subtitle],
  ];
  if (dateRange?.from) meta.push([`Period: ${dateRange.from} → ${dateRange.to ?? 'Present'}`]);
  meta.push([`Generated: ${now}`]);
  meta.push([]);
  meta.push(headers);
  return [...meta, ...rows];
}

/** Shared: raw numeric value for number/currency/percentage columns */
function _rawVal(value: unknown, format?: ExportColumn['format']): string | number | null {
  if (value == null) return null;
  if (format === 'number' || format === 'currency' || format === 'percentage') {
    const n = Number(value);
    return isNaN(n) ? String(value) : n;
  }
  if (format === 'date') {
    const d = value instanceof Date ? value : new Date(String(value));
    return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-GB');
  }
  return String(value ?? '');
}

/** Shared: append a sheet with a proper header block + auto column widths */
function _appendSheet(
  wb: XLSX.WorkBook,
  sheetName: string,
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number | null)[][],
  widths: number[],
  dateRange?: { from?: string; to?: string }
) {
  const aoa = _sheetAoa(title, subtitle, headers, rows, dateRange);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const headerRowIdx = aoa.length - rows.length - 1;
  // Column widths
  ws['!cols'] = widths.map(w => ({ wch: w }));
  // Merge title rows across all columns
  const merges: XLSX.Range[] = [];
  for (let r = 0; r < headerRowIdx; r++) {
    if ((aoa[r] as (string|null)[])[0]) {
      merges.push({ s: { r, c: 0 }, e: { r, c: headers.length - 1 } });
    }
  }
  if (merges.length) ws['!merges'] = merges;
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

// ─── General Report ──────────────────────────────────────────────────────────

export interface GeneralExcelData {
  kpis: { label: string; value: number; format?: string }[];
  statusDistribution: { name: string; value: number; color?: string }[];
  categoryDistribution: { name: string; projects: number; budget: number; spent?: number }[];
  dateRange?: { from?: string; to?: string };
  trendData?: { month: string; projects: number; budget: number; expenses: number; beneficiaries?: number }[];
  riskProjects?: { name: string; category: string; risk: string; budget: number; spent: number; progress: number; daysLeft: number }[];
  radarData?: { metric: string; value: number }[];
  topProjects?: { rank: number; name: string; category: string; budget: number; progress: number; rating: number; beneficiaries: number; status: string }[];
  delayedProjects?: { name: string; originalEnd: string; daysLate: number; progress: number; risk: string }[];
  overBudgetProjects?: { name: string; budget: number; spent: number; overBy: number; progress: number }[];
  comparisons?: { label: string; projectsDelta: number; budgetDelta: number; benefDelta: number; completionDelta: number }[];
}

export function generateGeneralReportExcel(data: GeneralExcelData): void {
  const wb = XLSX.utils.book_new();
  const dr = data.dateRange;
  const ts = formatDateForFilename(new Date());

  // Sheet 1 — KPI Summary
  _appendSheet(wb, 'KPI Summary', 'General Report — KPI Summary',
    'Key performance indicators for the current reporting period',
    ['Indicator', 'Value'],
    data.kpis.map(k => [k.label, k.value]),
    [30, 20], dr
  );

  // Sheet 2 — Status Distribution
  if (data.statusDistribution.length) {
    _appendSheet(wb, 'Status Distribution', 'General Report — Status Distribution',
      'Number of projects by status',
      ['Status', 'Projects'],
      data.statusDistribution.map(s => [s.name, s.value]),
      [20, 15], dr
    );
  }

  // Sheet 3 — Category Overview
  if (data.categoryDistribution.length) {
    _appendSheet(wb, 'Category Overview', 'General Report — Category Overview',
      'Budget and project count per CSR category',
      ['Category', 'Projects', 'Budget (OMR)', 'Spent (OMR)'],
      data.categoryDistribution.map(c => [c.name, c.projects, c.budget, c.spent ?? null]),
      [25, 12, 18, 18], dr
    );
  }

  // Sheet 4 — Monthly Trend
  if (data.trendData?.length) {
    _appendSheet(wb, 'Monthly Trend', 'General Report — Monthly Trend',
      'Month-on-month trend of projects, budget, and beneficiaries',
      ['Month', 'Projects', 'Budget (OMR)', 'Expenses (OMR)', 'Beneficiaries'],
      data.trendData.map(t => [t.month, t.projects, t.budget, t.expenses, t.beneficiaries ?? null]),
      [14, 12, 18, 18, 16], dr
    );
  }

  // Sheet 5 — Risk Analysis
  if (data.riskProjects?.length) {
    _appendSheet(wb, 'Risk Analysis', 'General Report — At-Risk Projects',
      'Projects with elevated risk flags',
      ['Project', 'Category', 'Risk Level', 'Budget (OMR)', 'Spent (OMR)', 'Progress (%)', 'Days Left'],
      data.riskProjects.map(p => [p.name, p.category, p.risk, p.budget, p.spent, p.progress, p.daysLeft]),
      [28, 18, 14, 16, 16, 13, 12], dr
    );
  }

  // Sheet 6 — Performance Radar
  if (data.radarData?.length) {
    _appendSheet(wb, 'Performance Radar', 'General Report — Performance Indicators',
      'Multi-dimensional performance index by metric',
      ['Metric', 'Score'],
      data.radarData.map(r => [r.metric, r.value]),
      [30, 12], dr
    );
  }

  // Sheet 7 — Top Projects
  if (data.topProjects?.length) {
    _appendSheet(wb, 'Top Projects', 'General Report — Top Performing Projects',
      'Ranked list of highest-performing projects',
      ['Rank', 'Project', 'Category', 'Budget (OMR)', 'Progress (%)', 'Rating', 'Beneficiaries', 'Status'],
      data.topProjects.map(p => [p.rank, p.name, p.category, p.budget, p.progress, p.rating, p.beneficiaries, p.status]),
      [8, 28, 18, 16, 13, 10, 14, 14], dr
    );
  }

  // Sheet 8 — Delayed Projects
  if (data.delayedProjects?.length) {
    _appendSheet(wb, 'Delayed Projects', 'General Report — Delayed Projects',
      'Projects past their original end date',
      ['Project', 'Original End Date', 'Days Late', 'Progress (%)', 'Risk Level'],
      data.delayedProjects.map(p => [p.name, p.originalEnd, p.daysLate, p.progress, p.risk]),
      [28, 18, 12, 13, 14], dr
    );
  }

  // Sheet 9 — Over-Budget Projects
  if (data.overBudgetProjects?.length) {
    _appendSheet(wb, 'Over Budget', 'General Report — Over-Budget Projects',
      'Projects where expenditure exceeds allocated budget',
      ['Project', 'Budget (OMR)', 'Spent (OMR)', 'Over By (OMR)', 'Progress (%)'],
      data.overBudgetProjects.map(p => [p.name, p.budget, p.spent, p.overBy, p.progress]),
      [28, 16, 16, 16, 13], dr
    );
  }

  // Sheet 10 — Period Comparison
  if (data.comparisons?.length) {
    _appendSheet(wb, 'Period Comparison', 'General Report — Period-over-Period Comparison',
      'Change in key metrics compared to previous periods',
      ['Period', 'Projects Δ', 'Budget Δ (OMR)', 'Beneficiaries Δ', 'Completion Δ (%)'],
      data.comparisons.map(c => [c.label, c.projectsDelta, c.budgetDelta, c.benefDelta, c.completionDelta]),
      [18, 13, 16, 16, 15], dr
    );
  }

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `CSR_General_Report_${ts}.xlsx`);
}

// ─── Financial Report ────────────────────────────────────────────────────────

export interface FinancialExcelData {
  kpis: { label: string; value: number }[];
  expenseBreakdown: { name: string; value: number; pct: number }[];
  projectFinancials: { name: string; budget: number; spent: number; remaining: number; pct: number; status: string }[];
  categoryBreakdown: { name: string; budget: number; spent: number; projects: number }[];
  efficiencyMetrics: { label: string; value: string; unit: string }[];
  dateRange?: { from?: string; to?: string };
  cashFlowData?: { month: string; inflow: number; outflow: number; net: number }[];
  yearlyComparison?: { year: string | number; budget: number; spent: number; projects: number }[];
  regionComparison?: { region: string; budget: number; spent: number; projects: number }[];
  budgetAlerts?: { level: string; title: string; count: number; desc: string }[];
  invoices?: { id: string; project: string; vendor: string; amount: number; date: string; status: string; category: string }[];
  top5Projects?: { name: string; budget: number; spent: number; remaining: number; pct: number; status: string }[];
  bottom5Projects?: { name: string; budget: number; spent: number; remaining: number; pct: number; status: string }[];
  forecastData?: { quarter: string; projectedBudget: number; projectedSpend: number; confidence: number }[];
}

export function generateFinancialReportExcel(data: FinancialExcelData): void {
  const wb = XLSX.utils.book_new();
  const dr = data.dateRange;
  const ts = formatDateForFilename(new Date());

  // Sheet 1 — Financial Summary
  _appendSheet(wb, 'Financial Summary', 'Financial Report — Summary',
    'Top-level financial indicators for the reporting period',
    ['Indicator', 'Value (OMR)'],
    data.kpis.map(k => [k.label, k.value]),
    [30, 20], dr
  );

  // Sheet 2 — Expense Breakdown
  if (data.expenseBreakdown.length) {
    _appendSheet(wb, 'Expense Breakdown', 'Financial Report — Expense Breakdown',
      'Distribution of expenditure by category',
      ['Category', 'Amount (OMR)', 'Share (%)'],
      data.expenseBreakdown.map(e => [e.name, e.value, e.pct]),
      [25, 18, 14], dr
    );
  }

  // Sheet 3 — Project Financials
  if (data.projectFinancials.length) {
    _appendSheet(wb, 'Project Financials', 'Financial Report — Project-Level Financials',
      'Budget, spending, and utilisation per project',
      ['Project', 'Budget (OMR)', 'Spent (OMR)', 'Remaining (OMR)', 'Utilisation (%)', 'Status'],
      data.projectFinancials.map(p => [p.name, p.budget, p.spent, p.remaining, p.pct, p.status]),
      [30, 16, 16, 16, 15, 14], dr
    );
  }

  // Sheet 4 — Category Breakdown
  if (data.categoryBreakdown.length) {
    _appendSheet(wb, 'Category Breakdown', 'Financial Report — Budget by Category',
      'Budget allocation and spending per CSR category',
      ['Category', 'Budget (OMR)', 'Spent (OMR)', 'Projects'],
      data.categoryBreakdown.map(c => [c.name, c.budget, c.spent, c.projects]),
      [25, 16, 16, 12], dr
    );
  }

  // Sheet 5 — Efficiency Metrics
  if (data.efficiencyMetrics.length) {
    _appendSheet(wb, 'Efficiency Metrics', 'Financial Report — Efficiency Metrics',
      'Operational efficiency and value-for-money indicators',
      ['Metric', 'Value', 'Unit'],
      data.efficiencyMetrics.map(m => [m.label, m.value, m.unit]),
      [30, 20, 15], dr
    );
  }

  // Sheet 6 — Cash Flow
  if (data.cashFlowData?.length) {
    _appendSheet(wb, 'Cash Flow', 'Financial Report — Monthly Cash Flow',
      'Monthly inflow, outflow, and net cash position',
      ['Month', 'Inflow (OMR)', 'Outflow (OMR)', 'Net (OMR)'],
      data.cashFlowData.map(c => [c.month, c.inflow, c.outflow, c.net]),
      [14, 18, 18, 16], dr
    );
  }

  // Sheet 7 — Yearly Comparison
  if (data.yearlyComparison?.length) {
    _appendSheet(wb, 'Yearly Comparison', 'Financial Report — Year-over-Year',
      'Annual budget, spending, and project count comparison',
      ['Year', 'Budget (OMR)', 'Spent (OMR)', 'Projects'],
      data.yearlyComparison.map(y => [String(y.year), y.budget, y.spent, y.projects]),
      [12, 16, 16, 12], dr
    );
  }

  // Sheet 8 — Regional Analysis
  if (data.regionComparison?.length) {
    _appendSheet(wb, 'Regional Analysis', 'Financial Report — Regional Breakdown',
      'Budget distribution and spending by governorate',
      ['Region', 'Budget (OMR)', 'Spent (OMR)', 'Projects'],
      data.regionComparison.map(r => [r.region, r.budget, r.spent, r.projects]),
      [22, 16, 16, 12], dr
    );
  }

  // Sheet 9 — Budget Alerts
  if (data.budgetAlerts?.length) {
    _appendSheet(wb, 'Budget Alerts', 'Financial Report — Budget Alerts',
      'Flagged financial risk conditions across the portfolio',
      ['Level', 'Alert Title', 'Count', 'Description'],
      data.budgetAlerts.map(a => [a.level, a.title, a.count, a.desc]),
      [12, 28, 10, 40], dr
    );
  }

  // Sheet 10 — Invoice Register
  if (data.invoices?.length) {
    _appendSheet(wb, 'Invoice Register', 'Financial Report — Invoice Register',
      'Full list of recorded invoices and payments',
      ['ID', 'Project', 'Vendor', 'Amount (OMR)', 'Date', 'Status', 'Category'],
      data.invoices.map(i => [i.id, i.project, i.vendor, i.amount, i.date, i.status, i.category]),
      [12, 25, 20, 16, 14, 12, 16], dr
    );
  }

  // Sheet 11 — Top 5 Projects
  if (data.top5Projects?.length) {
    _appendSheet(wb, 'Top 5 Projects', 'Financial Report — Top 5 by Spending',
      'Highest-spending projects',
      ['Project', 'Budget (OMR)', 'Spent (OMR)', 'Remaining (OMR)', 'Utilisation (%)', 'Status'],
      data.top5Projects.map(p => [p.name, p.budget, p.spent, p.remaining, p.pct, p.status]),
      [28, 16, 16, 16, 14, 14], dr
    );
  }

  // Sheet 12 — Bottom 5 Projects
  if (data.bottom5Projects?.length) {
    _appendSheet(wb, 'Lowest Utilisation', 'Financial Report — Lowest Budget Utilisation',
      'Projects with the lowest spending relative to budget',
      ['Project', 'Budget (OMR)', 'Spent (OMR)', 'Remaining (OMR)', 'Utilisation (%)', 'Status'],
      data.bottom5Projects.map(p => [p.name, p.budget, p.spent, p.remaining, p.pct, p.status]),
      [28, 16, 16, 16, 14, 14], dr
    );
  }

  // Sheet 13 — Quarterly Forecast
  if (data.forecastData?.length) {
    _appendSheet(wb, 'Quarterly Forecast', 'Financial Report — Quarterly Forecast',
      'Projected budget and spending for upcoming quarters',
      ['Quarter', 'Projected Budget (OMR)', 'Projected Spend (OMR)', 'Confidence (%)'],
      data.forecastData.map(f => [f.quarter, f.projectedBudget, f.projectedSpend, f.confidence]),
      [16, 22, 22, 16], dr
    );
  }

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `CSR_Financial_Report_${ts}.xlsx`);
}

// ─── Impact Report ───────────────────────────────────────────────────────────

export interface ImpactExcelData {
  kpis: { label: string; value: number }[];
  demographics: { label: string; value: number }[];
  sdgGoals: { id: number; name: string; progress: number; color?: string }[];
  categoryImpact: { label: string; projects: number; beneficiaries: number; budget: number; satisfaction: number }[];
  dateRange?: { from?: string; to?: string };
  esgScore?: { grade: string; environmental: number; social: number; governance: number; overall: number };
  categoryDetails?: { label: string; metrics: { label: string; value: number }[] }[];
  impactHistory?: { year: string; beneficiaries: number; projects: number; budget: number; satisfaction: number; milestone: string }[];
  predictionData?: { year: string; actual?: number; predicted?: number }[];
}

export function generateImpactReportExcel(data: ImpactExcelData): void {
  const wb = XLSX.utils.book_new();
  const dr = data.dateRange;
  const ts = formatDateForFilename(new Date());

  // Sheet 1 — Impact Summary
  _appendSheet(wb, 'Impact Summary', 'Impact Report — Summary',
    'Top-level social impact indicators',
    ['Indicator', 'Value'],
    data.kpis.map(k => [k.label, k.value]),
    [30, 20], dr
  );

  // Sheet 2 — Demographics
  _appendSheet(wb, 'Demographics', 'Impact Report — Beneficiary Demographics',
    'Breakdown of beneficiary population by group',
    ['Group', 'Count'],
    data.demographics.map(d => [d.label, d.value]),
    [25, 15], dr
  );

  // Sheet 3 — SDG Alignment
  const activeSDGs = data.sdgGoals.filter(g => g.progress > 0);
  if (activeSDGs.length) {
    _appendSheet(wb, 'SDG Alignment', 'Impact Report — UN SDG Alignment',
      'Contribution level to each UN Sustainable Development Goal',
      ['SDG #', 'Goal Name', 'Contribution (%)'],
      activeSDGs.map(g => [g.id, g.name, g.progress]),
      [10, 35, 16], dr
    );
  }

  // Sheet 4 — Category Impact
  if (data.categoryImpact.length) {
    _appendSheet(wb, 'Category Impact', 'Impact Report — Impact by Category',
      'Project count, beneficiaries, budget, and satisfaction per category',
      ['Category', 'Projects', 'Beneficiaries', 'Budget (OMR)', 'Satisfaction (%)'],
      data.categoryImpact.map(c => [c.label, c.projects, c.beneficiaries, c.budget, c.satisfaction]),
      [22, 12, 16, 16, 16], dr
    );
  }

  // Sheet 5 — ESG Scorecard
  if (data.esgScore) {
    _appendSheet(wb, 'ESG Scorecard', 'Impact Report — ESG Scorecard',
      `Environmental, Social & Governance performance — Grade: ${data.esgScore.grade}`,
      ['Dimension', 'Score (%)'],
      [
        ['Environmental', data.esgScore.environmental],
        ['Social', data.esgScore.social],
        ['Governance', data.esgScore.governance],
        ['Overall', data.esgScore.overall],
      ],
      [25, 15], dr
    );
  }

  // Sheet 6 — Category Metrics
  if (data.categoryDetails?.length) {
    const rows: (string | number | null)[][] = [];
    data.categoryDetails.forEach(cat => {
      cat.metrics.forEach(m => rows.push([cat.label, m.label, m.value]));
    });
    _appendSheet(wb, 'Category Metrics', 'Impact Report — Category-Level Metrics',
      'Granular sector-specific impact indicators',
      ['Category', 'Metric', 'Value'],
      rows,
      [22, 30, 15], dr
    );
  }

  // Sheet 7 — Impact History
  if (data.impactHistory?.length) {
    _appendSheet(wb, 'Impact History', 'Impact Report — Programme History',
      'Year-on-year progression since programme inception',
      ['Year', 'Beneficiaries', 'Projects', 'Budget (K OMR)', 'Satisfaction (%)', 'Key Milestone'],
      data.impactHistory.map(h => [h.year, h.beneficiaries, h.projects, h.budget, h.satisfaction, h.milestone]),
      [10, 16, 12, 16, 15, 35], dr
    );
  }

  // Sheet 8 — Beneficiary Forecast
  if (data.predictionData?.length) {
    _appendSheet(wb, 'Beneficiary Forecast', 'Impact Report — Growth Forecast (2024–2030)',
      'Projected beneficiary growth trajectory',
      ['Year', 'Actual', 'Predicted'],
      data.predictionData.map(p => [p.year, p.actual ?? null, p.predicted ?? null]),
      [12, 16, 16], dr
    );
  }

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `CSR_Impact_Report_${ts}.xlsx`);
}

/**
 * Quick export functions for common use cases
 */
export const quickExport = {
  projectsToExcel: (projects: Record<string, unknown>[], dateRange?: { from?: string; to?: string }) => {
    exportToExcel(projects, {
      filename: 'projects_report',
      title: 'تقرير المشاريع',
      subtitle: 'قائمة شاملة بجميع المشاريع',
      columns: reportColumns.projects,
      dateRange
    });
  },

  projectsToPDF: (projects: Record<string, unknown>[], dateRange?: { from?: string; to?: string }) => {
    exportToPDF(projects, {
      filename: 'projects_report',
      title: 'تقرير المشاريع',
      subtitle: 'قائمة شاملة بجميع المشاريع',
      columns: reportColumns.projects,
      dateRange,
      orientation: 'landscape'
    });
  },

  financialToExcel: (data: Record<string, unknown>[], dateRange?: { from?: string; to?: string }) => {
    exportToExcel(data, {
      filename: 'financial_report',
      title: 'التقرير المالي',
      subtitle: 'تحليل مالي شامل',
      columns: reportColumns.financial,
      dateRange
    });
  },

  financialToPDF: (data: Record<string, unknown>[], dateRange?: { from?: string; to?: string }) => {
    exportToPDF(data, {
      filename: 'financial_report',
      title: 'التقرير المالي',
      subtitle: 'تحليل مالي شامل',
      columns: reportColumns.financial,
      dateRange
    });
  },

  usersToExcel: (users: Record<string, unknown>[]) => {
    exportToExcel(users, {
      filename: 'users_report',
      title: 'تقرير المستخدمين',
      columns: reportColumns.users
    });
  },

  partnersToExcel: (partners: Record<string, unknown>[]) => {
    exportToExcel(partners, {
      filename: 'partners_report',
      title: 'تقرير الشركاء',
      columns: reportColumns.partners
    });
  },

  alertsToExcel: (alerts: Record<string, unknown>[]) => {
    exportToExcel(alerts, {
      filename: 'alerts_report',
      title: 'تقرير التنبيهات',
      columns: reportColumns.alerts
    });
  },

  ideasToExcel: (ideas: Record<string, unknown>[]) => {
    exportToExcel(ideas, {
      filename: 'ideas_report',
      title: 'تقرير الأفكار',
      columns: reportColumns.ideas
    });
  }
};
