import { Medicine } from "@/types";
import { BoxConfig, resolveBoxConfig } from "@/lib/box-config";
import { expiryStatus, formatDate, CATEGORY_LABELS } from "@/lib/utils";

export type PdfExportMode = "alphabetical" | "by-box";

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function makeRow(m: Medicine, includeBox: boolean): string[] {
  const status = expiryStatus(m.expiryDate);
  const statusLabel =
    status === "expired" ? "SCADUTO" :
    status === "critical" ? "CRITICO" :
    status === "warning" ? "In scadenza" : "OK";
  const row = [
    m.name,
    m.brand ?? "",
    CATEGORY_LABELS[m.category] ?? m.category,
    formatDate(m.expiryDate),
    `${m.quantity ?? ""} ${m.unit ?? ""}`.trim(),
    statusLabel,
  ];
  if (includeBox) row.splice(5, 0, m.box ?? "—");
  return row;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyStatusStyle(data: any, statusColIndex: number) {
  if (data.section !== "body" || data.column.index !== statusColIndex) return;
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

export async function exportMedicinePDF(
  medicines: Medicine[],
  mode: PdfExportMode = "alphabetical",
  boxConfigs: BoxConfig[] = []
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF();
  const date = new Date().toLocaleDateString("it-IT");
  const isoDate = new Date().toISOString().slice(0, 10);

  const expired = medicines.filter((m) => expiryStatus(m.expiryDate) === "expired").length;
  const expiring = medicines.filter((m) =>
    ["critical", "warning"].includes(expiryStatus(m.expiryDate))
  ).length;

  function drawPageHeader(): number {
    doc.setFontSize(18);
    doc.setTextColor(30, 64, 175);
    doc.text("KeMedicine", 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Inventario medicinali — ${date}`, 14, 25);
    doc.text(
      `Totale: ${medicines.length}  |  Scaduti: ${expired}  |  In scadenza: ${expiring}`,
      14, 31
    );
    return 37;
  }

  if (mode === "alphabetical") {
    const sorted = [...medicines].sort((a, b) => a.name.localeCompare(b.name, "it"));
    const startY = drawPageHeader();

    autoTable(doc, {
      head: [["Nome", "Marca", "Categoria", "Scadenza", "Qtà", "Box", "Stato"]],
      body: sorted.map((m) => makeRow(m, true)),
      startY,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 40 },
        2: { cellWidth: 30 },
        3: { cellWidth: 22 },
        5: { cellWidth: 14 },
      },
      didParseCell: (data) => applyStatusStyle(data, 6),
    });
  } else {
    const groups = new Map<string, { config: BoxConfig | null; items: Medicine[] }>();

    for (const m of medicines) {
      const key = m.box ?? "__none__";
      if (!groups.has(key)) {
        groups.set(key, { config: resolveBoxConfig(m.box, boxConfigs), items: [] });
      }
      groups.get(key)!.items.push(m);
    }

    const sortedGroups = [...groups.entries()].sort(([keyA, a], [keyB, b]) => {
      if (keyA === "__none__") return 1;
      if (keyB === "__none__") return -1;
      return (a.config?.name ?? keyA).localeCompare(b.config?.name ?? keyB, "it");
    });

    let first = true;
    for (const [, { config, items }] of sortedGroups) {
      if (!first) doc.addPage();
      first = false;

      const boxName = config?.name ?? "Senza box";
      const boxColor: [number, number, number] = config?.color
        ? hexToRgb(config.color)
        : [100, 100, 100];

      const headerEnd = drawPageHeader();

      doc.setFontSize(12);
      doc.setTextColor(boxColor[0], boxColor[1], boxColor[2]);
      doc.setFont("helvetica", "bold");
      doc.text(boxName, 14, headerEnd + 4);
      doc.setFont("helvetica", "normal");

      const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name, "it"));

      autoTable(doc, {
        head: [["Nome", "Marca", "Categoria", "Scadenza", "Qtà", "Stato"]],
        body: sorted.map((m) => makeRow(m, false)),
        startY: headerEnd + 10,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: boxColor, textColor: 255 },
        columnStyles: {
          0: { cellWidth: 45 },
          2: { cellWidth: 30 },
          3: { cellWidth: 22 },
        },
        didParseCell: (data) => applyStatusStyle(data, 5),
      });
    }
  }

  doc.save(`kemedicine-${isoDate}.pdf`);
}
