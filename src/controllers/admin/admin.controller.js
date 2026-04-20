import { getDashboardData, getLedgerData, buildRange } from "../../services/admin/dashboard.service.js";

// ── Dashboard page ────────────────────────────────────────────────────────────
export const dashboard = async (req, res, next) => {
  try {
    const filter = req.query.filter || "monthly";
    const data   = await getDashboardData(filter);
    return res.render("admin/home/dashboard", { title: "Dashboard", ...data });
  } catch (err) {
    next(err);
  }
};

// ── AJAX: chart data refresh ──────────────────────────────────────────────────
export const getDashboardChartData = async (req, res, next) => {
  try {
    const filter = req.query.filter || "monthly";
    const data   = await getDashboardData(filter);
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ── Ledger book page ──────────────────────────────────────────────────────────
export const getLedgerPage = async (req, res, next) => {
  try {
    const filter    = req.query.filter || "monthly";
    const dateRange = buildRange(filter);
    const ledger    = await getLedgerData(dateRange);
    return res.render("admin/home/ledger", { title: "Ledger Book", ...ledger, filter });
  } catch (err) {
    next(err);
  }
};

// ── Ledger PDF export ─────────────────────────────────────────────────────────
export const downloadLedgerPDF = async (req, res, next) => {
  try {
    const filter    = req.query.filter || "monthly";
    const dateRange = buildRange(filter);
    const ledger    = await getLedgerData(dateRange);

    const PDFDocument = (await import("pdfkit")).default;
    const doc = new PDFDocument({ margin: 40, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="ledger-${filter}.pdf"`);
    doc.pipe(res);

    const PW = 595, ML = 40, CW = 515;
    const C_HEAD = "#1E293B", C_WHITE = "#FFFFFF", C_LIGHT = "#F8FAFC";
    const C_GREEN = "#15803D", C_RED = "#B91C1C", C_DARK = "#0F172A", C_GRAY = "#64748B";

    // Header
    doc.rect(0, 0, PW, 65).fill(C_HEAD);
    doc.fontSize(18).font("Helvetica-Bold").fillColor(C_WHITE).text("ELECTRO", ML, 16);
    doc.fontSize(9).font("Helvetica").fillColor("#94A3B8").text("Ledger Book", ML, 38);
    doc.fontSize(8).fillColor("#CBD5E1")
      .text(`Period: ${filter.toUpperCase()}`, 300, 24, { align: "right", width: 255 })
      .text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 300, 38, { align: "right", width: 255 });

    let y = 80;

    // Summary boxes
    const boxes = [
      { label: "Total Credit", val: `Rs.${ledger.totalCredit.toLocaleString("en-IN")}`,   color: C_GREEN },
      { label: "Total Debit",  val: `Rs.${ledger.totalDebit.toLocaleString("en-IN")}`,    color: C_RED   },
      { label: "Net Balance",  val: `Rs.${ledger.closingBalance.toLocaleString("en-IN")}`, color: C_DARK  },
      { label: "Entries",      val: String(ledger.entries.length),                         color: C_DARK  },
    ];
    const bw = (CW - 9) / 4;
    boxes.forEach(({ label, val, color }, i) => {
      const bx = ML + i * (bw + 3);
      doc.rect(bx, y, bw, 44).fill(C_LIGHT).stroke("#E2E8F0");
      doc.fontSize(7).font("Helvetica").fillColor(C_GRAY).text(label.toUpperCase(), bx+6, y+7, { width: bw-12 });
      doc.fontSize(10).font("Helvetica-Bold").fillColor(color).text(val, bx+6, y+20, { width: bw-12 });
    });
    y += 58;

    // Table header
    const cols = [
      { label: "DATE",        x: ML,       w: 72  },
      { label: "ORDER #",     x: ML+77,    w: 100 },
      { label: "CUSTOMER",    x: ML+182,   w: 100 },
      { label: "DESCRIPTION", x: ML+287,   w: 110 },
      { label: "CREDIT",      x: ML+402,   w: 52  },
      { label: "DEBIT",       x: ML+459,   w: 52  },
      { label: "BALANCE",     x: ML+516,   w: 39  },
    ];
    doc.rect(ML, y, CW, 18).fill(C_HEAD);
    cols.forEach(col => {
      doc.fontSize(6.5).font("Helvetica-Bold").fillColor(C_WHITE)
        .text(col.label, col.x+3, y+5, { width: col.w-6 });
    });
    y += 18;

    ledger.entries.forEach((e, idx) => {
      if (y > 760) { doc.addPage(); y = 40; }
      const bg = e.type === "credit" ? "#F0FDF4" : "#FFF5F5";
      doc.rect(ML, y, CW, 16).fill(bg);
      const rowData = [
        new Date(e.date).toLocaleDateString("en-IN"),
        e.orderNumber,
        e.customer,
        e.description,
        e.credit  ? `Rs.${e.credit.toLocaleString("en-IN")}`  : "—",
        e.debit   ? `Rs.${e.debit.toLocaleString("en-IN")}`   : "—",
        `Rs.${e.balance.toLocaleString("en-IN")}`,
      ];
      cols.forEach((col, ci) => {
        const color = ci === 4 ? C_GREEN : ci === 5 ? C_RED : ci === 6 ? (e.balance >= 0 ? C_GREEN : C_RED) : C_DARK;
        doc.fontSize(7).font("Helvetica").fillColor(color)
          .text(rowData[ci], col.x+3, y+4, { width: col.w-6, ellipsis: true });
      });
      doc.moveTo(ML, y+16).lineTo(ML+CW, y+16).strokeColor("#E2E8F0").lineWidth(0.3).stroke();
      y += 16;
    });

    doc.rect(0, 822, PW, 20).fill(C_HEAD);
    doc.fontSize(7).font("Helvetica").fillColor("#94A3B8")
      .text("Electro — Ledger Book | Confidential", 0, 828, { align: "center", width: PW });
    doc.end();
  } catch (err) {
    if (!res.headersSent) next(err);
  }
};
