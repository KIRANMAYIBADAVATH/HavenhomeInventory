const esc = (v) => {
  let s = v == null ? '' : String(v);
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = "'" + s; // spreadsheet formula safety
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function downloadCsv(prefix, rows, cols) {
  const lines = [cols.map((c) => esc(c[0])).join(',')];
  rows.forEach((r) => lines.push(cols.map((c) => esc(r[c[1]])).join(',')));
  const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `haven-${prefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
