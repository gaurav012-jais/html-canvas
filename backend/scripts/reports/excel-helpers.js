/**
 * Shared ExcelJS styling constants and layout helpers for telemetry & analytics reports.
 */

export const COLORS = {
  INDIGO_HEADER: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E1B4B' } },
  ACCENT_HEADER: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } },
  HEADER_FILL: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } },
  ACCENT_FILL: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } },
  SUCCESS_BG: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } },
  WARNING_BG: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } },
  ZEBRA_BG: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } },
  KPI_LABEL_BG: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } },
  SUBTITLE_BG: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } },
  NOTE_BG: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } },
};

export const FONTS = {
  TITLE: { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFFFFFFF' } },
  SUBTITLE: { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } },
  NOTE: { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF1E40AF' } },
  HEADER_WHITE: { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } },
  REGULAR: { name: 'Calibri', size: 10, color: { argb: 'FF0F172A' } },
  BOLD: { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } },
  MUTED: { name: 'Calibri', size: 9, color: { argb: 'FF64748B' } },
  CODE: { name: 'Consolas', size: 9, color: { argb: 'FF0F172A' } },
  SUCCESS_BOLD: { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF15803D' } },
  WARNING_BOLD: { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFD97706' } },
  DANGER_BOLD: { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFB91C1C' } },
};

export const THIN_BORDER = {
  top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
};

/**
 * Creates standardized header banner with title and subtitle
 */
export function addReportHeader(ws, { rangeTitle, rangeSubtitle, title, subtitle, note, rangeNote }) {
  ws.mergeCells(rangeTitle);
  const titleCell = ws.getCell(rangeTitle.split(':')[0]);
  titleCell.value = title;
  titleCell.font = FONTS.TITLE;
  titleCell.fill = COLORS.INDIGO_HEADER;
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  if (rangeSubtitle && subtitle) {
    ws.mergeCells(rangeSubtitle);
    const subCell = ws.getCell(rangeSubtitle.split(':')[0]);
    subCell.value = subtitle;
    subCell.font = FONTS.SUBTITLE;
    subCell.fill = COLORS.SUBTITLE_BG;
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
  }

  if (rangeNote && note) {
    ws.mergeCells(rangeNote);
    const noteCell = ws.getCell(rangeNote.split(':')[0]);
    noteCell.value = note;
    noteCell.font = FONTS.NOTE;
    noteCell.fill = COLORS.NOTE_BG;
    noteCell.alignment = { vertical: 'middle', horizontal: 'left' };
  }
}

/**
 * Adds and formats a table header row
 */
export function addTableHeader(ws, headers, { fill = COLORS.ACCENT_HEADER, height = 24 } = {}) {
  const row = ws.addRow(headers);
  row.height = height;
  row.eachCell((cell) => {
    cell.font = FONTS.HEADER_WHITE;
    cell.fill = fill;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = THIN_BORDER;
  });
  return row;
}

/**
 * Styles a data row with cell borders, zebra background, and optional column-specific alignments/fonts
 */
export function formatDataRow(row, { isZebra = false, alignments = {}, fonts = {}, fills = {} } = {}) {
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.border = THIN_BORDER;
    cell.font = fonts[colNumber] || FONTS.REGULAR;
    cell.alignment = { vertical: 'middle', horizontal: alignments[colNumber] || 'left' };
    if (fills[colNumber]) {
      cell.fill = fills[colNumber];
    } else if (isZebra) {
      cell.fill = COLORS.ZEBRA_BG;
    }
  });
}
