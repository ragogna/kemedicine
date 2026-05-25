import { Medicine } from "@/types";
import { expiryStatus, formatDate, CATEGORY_LABELS } from "@/lib/utils";

export async function exportMedicinePDF(medicines: Medicine[]): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setTextColor(30, 64, 175);
  doc.text("KeMedicine", 14, 18);

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Inventario medicinali — ${new Date().toLocaleDateString("it-IT")}`, 14, 25);

  const expired = medicines.filter((m) => expiryStatus(m.expiryDate) === "expired").length;
  const expiring = medicines.filter((m) =>
    ["critical", "warning"].includes(expiryStatus(m.expiryDate))
  ).length;
  doc.text(
    `Totale: ${medicines.length}  |  Scaduti: ${expired}  |  In scadenza: ${expiring}`,
    14,
    31
  );

  const rows = medicines.map((m) => {
    const status = expiryStatus(m.expiryDate);
    const statusLabel =
      status === "expired" ? "SCADUTO" :
      status === "critical" ? "CRITICO" :
      status === "warning" ? "In scadenza" : "OK";
    return [
      m.name,
      m.brand ?? "",
      CATEGORY_LABELS[m.category] ?? m.category,
      formatDate(m.expiryDate),
      `${m.quantity ?? ""} ${m.unit ?? ""}`.trim(),
      m.box ?? "—",
      statusLabel,
    ];
  });

  autoTable(doc, {
    head: [["Nome", "Marca", "Categoria", "Scadenza", "Qtà", "Box", "Stato"]],
    body: rows,
    startY: 37,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    columnStyles: { 0: { cellWidth: 40 }, 2: { cellWidth: 30 }, 3: { cellWidth: 22 }, 5: { cellWidth: 14 } },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 5) {
        const val = data.cell.raw as string;
        if (val === "SCADUTO" || val === "CRITICO") {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = "bold";
        } else if (val === "In scadenza") {
          data.cell.styles.textColor = [161, 98, 7];
        } else {
          data.cell.styles.textColor = [22, 163, 74];
        }
      }
    },
  });

  doc.save(`kemedicine-${new Date().toISOString().slice(0, 10)}.pdf`);
}
