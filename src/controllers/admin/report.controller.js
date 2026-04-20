import {
  getSalesReportService,
  getSalesReportAllService,
  buildDateRange,
} from "../../services/admin/report.service.js";

// ── Page render ───────────────────────────────────────────────────────────────
export const getSalesReportPage = async (req, res, next) => {
  try {
    const { preset = "monthly", from, to, page = 1 } = req.query;

    const data = await getSalesReportService({
      preset, from, to, page: parseInt(page), limit: 20,
    });

    return res.render("admin/reports/sales", {
      title: "Sales Report",
      ...data,
      preset, from: from || "", to: to || "",
    });
  } catch (err) {
    next(err);
  }
};

// ── PDF download ──────────────────────────────────────────────────────────────
export const downloadSalesReportPDF = async (req, res, next) => {
  try {
    const { preset = "monthly", from, to } = req.query;
    const orders = await getSalesReportAllService({ preset, from, to });

    const PDFDocument = (await import("pdfkit")).default;
    const doc = new PDFDocument({ margin: 40, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="sales-report-${preset}.pdf"`);
    doc.pipe(res);

    const PW = 595, ML = 40, CW = 515;
    const C_DARK = "#0F172A", C_GRAY = "#64748B", C_GREEN = "#16A34A";
    const C_HEAD = "#1E293B", C_WHITE = "#FFFFFF", C_LIGHT = "#F8FAFC";

    // Header band
    doc.rect(0, 0, PW, 70).fill(C_HEAD);
    doc.fontSize(20).font("Helvetica-Bold").fillColor(C_WHITE).text("ELECTRO", ML, 18);
    doc.fontSize(9).font("Helvetica").fillColor("#94A3B8").text("Sales Report", ML, 42);
    doc.fontSize(8).fillColor("#CBD5E1")
      .text(`Period: ${preset.toUpperCase()}${from ? ` | ${from} to ${to}` : ""}`, 300, 28, { align: "right", width: 255 })
      .text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 300, 42, { align: "right", width: 255 });

    let y = 85;

    // Summary
    const totalRevenue  = orders.reduce((s, o) => s + (o.pricing?.finalAmount || 0), 0);
    const totalDiscount = orders.reduce((s, o) => s + (o.pricing?.productDiscount || 0) + (o.pricing?.couponDiscount || 0), 0);
    const totalCoupon   = orders.reduce((s, o) => s + (o.pricing?.couponDiscount || 0), 0);

    const summaryItems = [
      ["Total Orders",    orders.length],
      ["Total Revenue",   `Rs. ${totalRevenue.toLocaleString("en-IN")}`],
      ["Total Discount",  `Rs. ${totalDiscount.toLocaleString("en-IN")}`],
      ["Coupon Savings",  `Rs. ${totalCoupon.toLocaleString("en-IN")}`],
    ];

    const boxW = (CW - 9) / 4;
    summaryItems.forEach(([label, val], i) => {
      const bx = ML + i * (boxW + 3);
      doc.rect(bx, y, boxW, 48).fill(C_LIGHT).stroke("#E2E8F0");
      doc.fontSize(7).font("Helvetica").fillColor(C_GRAY).text(label.toUpperCase(), bx + 8, y + 8, { width: boxW - 16 });
      doc.fontSize(11).font("Helvetica-Bold").fillColor(C_DARK).text(String(val), bx + 8, y + 22, { width: boxW - 16 });
    });

    y += 62;

    // Table header
    const cols = [
      { label: "ORDER #",   x: ML,       w: 110 },
      { label: "DATE",      x: ML + 115, w: 80  },
      { label: "CUSTOMER",  x: ML + 200, w: 110 },
      { label: "DISCOUNT",  x: ML + 315, w: 80  },
      { label: "TOTAL",     x: ML + 400, w: 115 },
    ];

    doc.rect(ML, y, CW, 20).fill(C_HEAD);
    cols.forEach(col => {
      doc.fontSize(7).font("Helvetica-Bold").fillColor(C_WHITE)
        .text(col.label, col.x + 4, y + 6, { width: col.w - 8 });
    });
    y += 20;

    orders.forEach((order, idx) => {
      if (y > 760) { doc.addPage(); y = 40; }
      const bg = idx % 2 === 0 ? C_WHITE : C_LIGHT;
      doc.rect(ML, y, CW, 18).fill(bg);

      const discount = (order.pricing?.productDiscount || 0) + (order.pricing?.couponDiscount || 0);
      const rowData = [
        order.orderNumber,
        new Date(order.createdAt).toLocaleDateString("en-IN"),
        order.userId?.name || "—",
        `Rs. ${discount.toLocaleString("en-IN")}`,
        `Rs. ${(order.pricing?.finalAmount || 0).toLocaleString("en-IN")}`,
      ];

      cols.forEach((col, ci) => {
        doc.fontSize(7.5).font("Helvetica").fillColor(ci === 4 ? C_GREEN : C_DARK)
          .text(rowData[ci], col.x + 4, y + 5, { width: col.w - 8 });
      });

      doc.moveTo(ML, y + 18).lineTo(ML + CW, y + 18).strokeColor("#E2E8F0").lineWidth(0.4).stroke();
      y += 18;
    });

    // Footer
    doc.rect(0, 822, PW, 20).fill(C_HEAD);
    doc.fontSize(7).font("Helvetica").fillColor("#94A3B8")
      .text("Electro — Confidential Sales Report", 0, 828, { align: "center", width: PW });

    doc.end();
  } catch (err) {
    if (!res.headersSent) next(err);
  }
};

// ── Excel download ────────────────────────────────────────────────────────────
export const downloadSalesReportExcel = async (req, res, next) => {
  try {
    const { preset = "monthly", from, to } = req.query;
    const orders = await getSalesReportAllService({ preset, from, to });

    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "Electro Admin";
    wb.created = new Date();

    const ws = wb.addWorksheet("Sales Report");

    // Column definitions
    ws.columns = [
      { header: "Order #",          key: "orderNumber",   width: 22 },
      { header: "Date",             key: "date",          width: 14 },
      { header: "Customer",         key: "customer",      width: 22 },
      { header: "Email",            key: "email",         width: 28 },
      { header: "Payment Method",   key: "payMethod",     width: 16 },
      { header: "Payment Status",   key: "payStatus",     width: 16 },
      { header: "Order Status",     key: "orderStatus",   width: 16 },
      { header: "Subtotal (₹)",     key: "subtotal",      width: 14 },
      { header: "Product Disc (₹)", key: "productDisc",   width: 16 },
      { header: "Coupon Disc (₹)",  key: "couponDisc",    width: 16 },
      { header: "GST (₹)",          key: "gst",           width: 12 },
      { header: "Delivery (₹)",     key: "delivery",      width: 14 },
      { header: "Grand Total (₹)",  key: "total",         width: 16 },
    ];

    // Header style
    ws.getRow(1).eachCell(cell => {
      cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
      cell.font   = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      cell.border = { bottom: { style: "thin", color: { argb: "FF334155" } } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    ws.getRow(1).height = 22;

    // Data rows
    orders.forEach((order, idx) => {
      const row = ws.addRow({
        orderNumber: order.orderNumber,
        date:        new Date(order.createdAt).toLocaleDateString("en-IN"),
        customer:    order.userId?.name || "—",
        email:       order.userId?.email || "—",
        payMethod:   order.payment?.method?.toUpperCase() || "—",
        payStatus:   order.payment?.status?.toUpperCase() || "—",
        orderStatus: order.orderStatus?.replace(/_/g, " ").toUpperCase() || "—",
        subtotal:    order.pricing?.subtotal || 0,
        productDisc: order.pricing?.productDiscount || 0,
        couponDisc:  order.pricing?.couponDiscount || 0,
        gst:         order.pricing?.gstTotal || 0,
        delivery:    order.pricing?.deliveryCharge || 0,
        total:       order.pricing?.finalAmount || 0,
      });

      // Alternating row color
      if (idx % 2 === 0) {
        row.eachCell(cell => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        });
      }

      // Highlight total column green
      const totalCell = row.getCell("total");
      totalCell.font = { bold: true, color: { argb: "FF16A34A" } };
    });

    // Totals row
    const totalRow = ws.addRow({
      orderNumber: "TOTAL",
      subtotal:    orders.reduce((s, o) => s + (o.pricing?.subtotal || 0), 0),
      productDisc: orders.reduce((s, o) => s + (o.pricing?.productDiscount || 0), 0),
      couponDisc:  orders.reduce((s, o) => s + (o.pricing?.couponDiscount || 0), 0),
      gst:         orders.reduce((s, o) => s + (o.pricing?.gstTotal || 0), 0),
      delivery:    orders.reduce((s, o) => s + (o.pricing?.deliveryCharge || 0), 0),
      total:       orders.reduce((s, o) => s + (o.pricing?.finalAmount || 0), 0),
    });
    totalRow.eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } };
    });

    // Number format for currency columns
    ["subtotal","productDisc","couponDisc","gst","delivery","total"].forEach(key => {
      ws.getColumn(key).numFmt = '#,##0.00';
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="sales-report-${preset}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    if (!res.headersSent) next(err);
  }
};
