export type CaseReportRow = {
  trackingNumber: string;
  title: string;
  department: string;
  category: string;
  location: string;
  priority: string;
  status: string;
  updatedAt: string;
};

const reportHeaders: Array<keyof CaseReportRow> = ["trackingNumber", "title", "department", "category", "location", "priority", "status", "updatedAt"];

function triggerDownload(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

function csvValue(value: string) {
  const normalized = String(value ?? "").replace(/\r?\n/g, " ");
  return /[",]/.test(normalized) ? `"${normalized.replace(/"/g, '""')}"` : normalized;
}

export function buildCsv(rows: CaseReportRow[]) {
  const header = reportHeaders.map(header => csvValue(header)).join(",");
  const body = rows.map(row => reportHeaders.map(header => csvValue(row[header])).join(","));
  return [header, ...body].join("\r\n");
}

export function downloadCsv(rows: CaseReportRow[], filename = "civicresolve-cases.csv") {
  triggerDownload(`\uFEFF${buildCsv(rows)}`, filename, "text/csv;charset=utf-8");
}

function pdfEscape(value: string) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[^\x20-\x7E]/g, "?");
}

function pdfLines(rows: CaseReportRow[]) {
  const lines = ["CivicResolve - Case report", `Generated ${new Date().toLocaleString()}`, `${rows.length} case${rows.length === 1 ? "" : "s"}`, "", "Tracking ID | Title | Department | Category | Location | Priority | Status | Updated"];
  rows.forEach(row => lines.push([row.trackingNumber, row.title, row.department, row.category, row.location, row.priority, row.status, row.updatedAt].join(" | ").slice(0, 118)));
  return lines;
}

export function buildPdf(rows: CaseReportRow[]) {
  const lines = pdfLines(rows);
  const linesPerPage = 51;
  const pageCount = Math.max(1, Math.ceil(lines.length / linesPerPage));
  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  const pageObjectIds: number[] = [];
  for (let page = 0; page < pageCount; page += 1) {
    const pageId = 4 + page * 2;
    const contentId = pageId + 1;
    pageObjectIds.push(pageId);
    const pageLines = lines.slice(page * linesPerPage, (page + 1) * linesPerPage);
    const stream = [`BT`, `/F1 9 Tf`, `40 800 Td`, `12 TL`, ...pageLines.map(line => `(${pdfEscape(line)}) Tj T*`), `ET`].join("\n");
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  }
  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pageCount} >>`;
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = new TextEncoder().encode(pdf).length;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

export function downloadCasePdf(rows: CaseReportRow[], filename = "civicresolve-cases.pdf") {
  triggerDownload(buildPdf(rows), filename, "application/pdf");
}
