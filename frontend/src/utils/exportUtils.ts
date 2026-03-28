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
