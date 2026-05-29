import { Medicine } from "@/types";
import { BoxConfig, resolveBoxConfig } from "@/lib/box-config";
import { expiryStatus, formatDate, CATEGORY_LABELS } from "@/lib/utils";

export type PdfExportMode = "alphabetical" | "by-box" | "label";

export interface LabelSize { width: number; height: number }

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

function buildBoxGroups(medicines: Medicine[], boxConfigs: BoxConfig[]) {
  const groups = new Map<string, { config: BoxConfig | null; items: Medicine[] }>();
  for (const m of medicines) {
    const key = m.box ?? "__none__";
    if (!groups.has(key)) {
      groups.set(key, { config: resolveBoxConfig(m.box, boxConfigs), items: [] });
    }
    groups.get(key)!.items.push(m);
  }
  return [...groups.entries()].sort(([keyA, a], [keyB, b]) => {
    if (keyA === "__none__") return 1;
    if (keyB === "__none__") return -1;
    return (a.config?.name ?? keyA).localeCompare(b.config?.name ?? keyB, "it");
  });
}

export async function exportMedicinePDF(
  medicines: Medicine[],
  mode: PdfExportMode = "alphabetical",
  boxConfigs: BoxConfig[] = [],
  labelSize?: LabelSize
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const date = new Date().toLocaleDateString("it-IT");
  const isoDate = new Date().toISOString().slice(0, 10);

  if (mode === "label" && labelSize) {
    const doc = new jsPDF({ unit: "mm", format: [labelSize.width, labelSize.height] });
    const margin = 4;
    const usableW = labelSize.width - margin * 2;
    const expiryColW = Math.min(28, usableW * 0.32);

    const sortedGroups = buildBoxGroups(medicines, boxConfigs);
    let first = true;

    for (const [, { config, items }] of sortedGroups) {
      if (!first) doc.addPage([labelSize.width, labelSize.height]);
      first = false;

      const boxName = config?.name ?? "Senza box";
      const boxColor: [number, number, number] = config?.color
        ? hexToRgb(config.color)
        : [80, 80, 80];

      // box name header
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(boxColor[0], boxColor[1], boxColor[2]);
      doc.text(boxName, margin, margin + 4);

      // print date small right
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(160, 160, 160);
      doc.text(date, labelSize.width - margin, margin + 4, { align: "right" });

      doc.setFont("helvetica", "normal");

      const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name, "it"));

      autoTable(doc, {
        head: [["Nome", "Scadenza"]],
        body: sorted.map((m) => [m.name, formatDate(m.expiryDate)]),
        startY: margin + 7,
        margin: { left: margin, right: margin },
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: boxColor, textColor: 255, fontSize: 7, cellPadding: 1.5 },
        columnStyles: { 1: { cellWidth: expiryColW, halign: "center" } },
        tableWidth: usableW,
      });
    }

    doc.save(`kemedicine-cartellini-${isoDate}.pdf`);
    return;
  }

  const doc = new jsPDF();

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
    const sortedGroups = buildBoxGroups(medicines, boxConfigs);
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
        head: [["Nome", "Scadenza"]],
        body: sorted.map((m) => [m.name, formatDate(m.expiryDate)]),
        startY: headerEnd + 10,
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: boxColor, textColor: 255 },
        columnStyles: {
          0: { cellWidth: 130 },
          1: { cellWidth: 40 },
        },
      });
    }
  }

  doc.save(`kemedicine-${isoDate}.pdf`);
}
