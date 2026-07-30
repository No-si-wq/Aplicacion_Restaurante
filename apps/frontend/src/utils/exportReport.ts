// apps/frontend/src/utils/exportReport.ts
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Row = (string | number)[];

export function exportToExcel(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: Row[]
) {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

export function exportToPDF(
  filename: string,
  title: string,
  headers: string[],
  rows: Row[]
) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 15);
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 22,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] }, // azul, igual al botón "Generar"
  });
  doc.save(filename);
}