// A cell starting with one of these is executed as a formula by Excel and
// Sheets. An exported relief list is untrusted user input opened by an admin on
// a work laptop, which is exactly the path CSV injection takes - prefix with a
// quote so the value is shown, not run.
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value) {
  if (value === null || value === undefined) return '';
  let s = Array.isArray(value) ? value.join('; ') : String(value);
  if (FORMULA_START.test(s)) s = `'${s}`;
  // Quote whenever the value could otherwise break the row apart.
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// columns: [[header, row => value], …]
export function toCsv(rows, columns) {
  const head = columns.map(([h]) => csvCell(h)).join(',');
  const body = rows.map((r) => columns.map(([, get]) => csvCell(get(r))).join(','));
  return [head, ...body].join('\r\n');
}

export function downloadCsv(filename, csv) {
  // BOM so Excel reads it as UTF-8 - without it Assamese names arrive as
  // mojibake, which defeats the point of exporting them.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function stampedName(prefix) {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`;
}
