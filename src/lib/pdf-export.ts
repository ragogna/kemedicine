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
    const config = resolveBoxConfig(m.box, boxConfigs);
    // Normalize the grouping key so legacy "Box 1" and new "box1" collapse into
    // a single group → one ticket per box (never split by storage format).
    const key = config?.id ?? m.box ?? "__none__";
    if (!groups.has(key)) {
      groups.set(key, { config, items: [] });
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
    // Tile one ticket per box onto A4 sheets. Each ticket = the user's dims
    // (respected literally); as many tickets per A4 as fit. All of a box's
    // medicines always fit inside its single ticket (dynamic font + columns).
    const fw = labelSize.width;
    const fh = labelSize.height;

    const A4W = 210, A4H = 297;
    const sheetMargin = 2;
    const gap = 2;
    const cols = Math.max(1, Math.floor((A4W - 2 * sheetMargin + gap) / (fw + gap)));
    const rows = Math.max(1, Math.floor((A4H - 2 * sheetMargin + gap) / (fh + gap)));
    const perPage = cols * rows;

    const doc = new jsPDF({ unit: "mm", format: "a4" });

    const lm = 3;          // ticket internal margin
    const headerH = 8;     // box name + separator line
    const colGap = 3;      // gap between item columns
    const minColW = 22;    // narrowest readable column
    const mmPerPt = 0.352777;

    const contentW = fw - 2 * lm;
    const contentH = fh - 2 * lm - headerH;
    const maxCols = Math.max(1, Math.floor((contentW + colGap) / (minColW + colGap)));

    doc.setFontSize(5);
    const dateW = doc.getTextWidth(date);

    const drawTicket = (ox: number, oy: number, config: BoxConfig | null, items: Medicine[]) => {
      const boxName = config?.name ?? "Senza box";
      const boxColor: [number, number, number] = config?.color
        ? hexToRgb(config.color)
        : [80, 80, 80];

      // Dashed cut-guide border
      doc.setDrawColor(170, 170, 170);
      doc.setLineWidth(0.2);
      doc.setLineDashPattern([1.2, 1.2], 0);
      doc.rect(ox, oy, fw, fh);
      doc.setLineDashPattern([], 0);

      // Box name (truncated to leave room for date)
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(boxColor[0], boxColor[1], boxColor[2]);
      let bName = boxName;
      while (bName.length > 1 && doc.getTextWidth(bName) > contentW - dateW - 3) bName = bName.slice(0, -1);
      if (bName.length < boxName.length) bName = bName.slice(0, -1) + "…";
      doc.text(bName, ox + lm, oy + lm + 4);

      // Print date (top right, tiny)
      doc.setFontSize(5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(160, 160, 160);
      doc.text(date, ox + fw - lm - dateW, oy + lm + 4);

      // Separator
      doc.setDrawColor(boxColor[0], boxColor[1], boxColor[2]);
      doc.setLineWidth(0.3);
      doc.line(ox + lm, oy + lm + 6, ox + fw - lm, oy + lm + 6);

      const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name, "it"));
      const n = sorted.length;
      if (n === 0) return;

      // Pick largest font (and fewest columns) that fits ALL items in the ticket.
      let fs = 3.5, lh = 0, rowsPerCol = 1, ncols = maxCols;
      for (let trial = 9; trial >= 3.5; trial -= 0.25) {
        const tlh = trial * 1.15 * mmPerPt + 0.5;
        const rpc = Math.max(1, Math.floor(contentH / tlh));
        const need = Math.ceil(n / rpc);
        fs = trial; lh = tlh; rowsPerCol = rpc;
        if (need <= maxCols) { ncols = Math.max(1, need); break; }
        ncols = maxCols; // fallback: smallest font, max columns
      }

      const colW = (contentW - (ncols - 1) * colGap) / ncols;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(fs);
      const contentTop = oy + lm + headerH;

      sorted.forEach((m, i) => {
        const c = Math.floor(i / rowsPerCol);
        const r = i % rowsPerCol;
        if (c >= ncols) return; // safety (only if ticket truly too small)

        const cx = ox + lm + c * (colW + colGap);
        const y = contentTop + fs * mmPerPt + r * lh;

        const dateStr = formatDate(m.expiryDate);
        const dw = doc.getTextWidth(dateStr);
        const maxNameW = colW - dw - 1.5;

        let name = m.name;
        while (name.length > 1 && doc.getTextWidth(name) > maxNameW) name = name.slice(0, -1);
        if (name.length < m.name.length) name = name.slice(0, -1) + "…";

        doc.setTextColor(40, 40, 40);
        doc.text(name, cx, y);
        doc.setTextColor(110, 110, 110);
        doc.text(dateStr, cx + colW - dw, y);
      });
    };

    const groups = buildBoxGroups(medicines, boxConfigs);
    groups.forEach(([, { config, items }], idx) => {
      if (idx > 0 && idx % perPage === 0) doc.addPage();
      const slot = idx % perPage;
      const ox = sheetMargin + (slot % cols) * (fw + gap);
      const oy = sheetMargin + Math.floor(slot / cols) * (fh + gap);
      drawTicket(ox, oy, config, items);
    });

    doc.save(`kemedicine-cartellini-${fw}x${fh}mm-${isoDate}.pdf`);
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
