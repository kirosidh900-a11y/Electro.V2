import { getReportService, getReportAllService, getChartDataService } from "../../services/admin/report.service.js";

const REPORT_TITLES = {
  orders: "Orders Report",
  sales: "Sales Report",
  refunds: "Refund Report",
  cancelled: "Cancelled Orders Report",
};

// ── Shared filter extraction ──────────────────────────────────────────────────
const extractFilters = (query) => ({
  reportType: query.reportType || "sales",
  preset: query.preset || "monthly",
  from: query.from || "",
  to: query.to || "",
  customer: query.customer || "",
  payMethod: query.payMethod || "",
  payStatus: query.payStatus || "",
  orderStatus: query.orderStatus || "",
  minAmount: query.minAmount || "",
  maxAmount: query.maxAmount || "",
  excludeBad: query.excludeBad === "1" || query.excludeBad === "true",
  page: parseInt(query.page) || 1,
});

// ── Page render ───────────────────────────────────────────────────────────────
const PAGE_LIMIT = 5;

export const getReportPage = async (req, res, next) => {
  try {
    const filters = extractFilters(req.query);
    const data = await getReportService({ ...filters, limit: PAGE_LIMIT });

    return res.render("admin/reports/sales", {
      title: REPORT_TITLES[filters.reportType] || "Report",
      pageLimit: PAGE_LIMIT,
      ...data,
      ...filters,
    });
  } catch (err) {
    next(err);
  }
};

// ── Chart data API (AJAX — tab switching) ─────────────────────────────────────
export const getChartData = async (req, res, next) => {
  try {
    const filters = extractFilters(req.query);
    const data = await getChartDataService(filters);
    return res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

// ── Table data API (AJAX — pagination) ───────────────────────────────────────
export const getTableData = async (req, res, next) => {
  try {
    const filters = extractFilters(req.query);
    const data    = await getReportService({ ...filters, limit: PAGE_LIMIT });
    return res.json({
      success:     true,
      orders:      data.orders,
      totalCount:  data.totalCount,
      totalPages:  data.totalPages,
      currentPage: data.currentPage,
    });
  } catch (err) {
    next(err);
  }
};

// ── Excel export ──────────────────────────────────────────────────────────────
export const downloadReportExcel = async (req, res, next) => {
  try {
    const filters = extractFilters(req.query);
    const { orders, summary } = await getReportAllService(filters);

    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "Electro Admin";
    wb.created = new Date();

    const ws = wb.addWorksheet(REPORT_TITLES[filters.reportType] || "Report");

    ws.columns = [
      { header: "Order #", key: "orderNumber", width: 22 },
      { header: "Date", key: "date", width: 14 },
      { header: "Customer", key: "customer", width: 22 },
      { header: "Email", key: "email", width: 28 },
      { header: "Payment Method", key: "payMethod", width: 16 },
      { header: "Payment Status", key: "payStatus", width: 16 },
      { header: "Order Status", key: "orderStatus", width: 18 },
      { header: "Subtotal (₹)", key: "subtotal", width: 14 },
      { header: "Product Disc (₹)", key: "productDisc", width: 16 },
      { header: "Coupon Disc (₹)", key: "couponDisc", width: 16 },
      { header: "GST (₹)", key: "gst", width: 12 },
      { header: "Delivery (₹)", key: "delivery", width: 14 },
      { header: "Grand Total (₹)", key: "total", width: 16 },
    ];

    // Header row style
    ws.getRow(1).eachCell(cell => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    ws.getRow(1).height = 22;

    // Row color logic
    const rowColor = (order) => {
      const ps = order.payment?.status;
      const os = order.orderStatus;
      if (ps === "refunded") return { bg: "FFFCE7F3", fg: "FF9D174D" }; // pink
      if (os === "cancelled") return { bg: "FFFEF2F2", fg: "FFB91C1C" }; // red
      if (ps === "failed") return { bg: "FFF8FAFC", fg: "FF64748B" }; // gray
      if (os === "delivered" || os === "confirmed") return { bg: "FFF0FDF4", fg: "FF15803D" }; // green
      if (ps === "paid") return { bg: "FFFFFBEB", fg: "FFB45309" }; // yellow
      return { bg: "FFFFFFFF", fg: "FF1E293B" };
    };

    orders.forEach((order) => {
      const { bg, fg } = rowColor(order);
      const row = ws.addRow({
        orderNumber: order.orderNumber,
        date: new Date(order.createdAt).toLocaleDateString("en-IN"),
        customer: order.userId?.name || "—",
        email: order.userId?.email || "—",
        payMethod: order.payment?.method?.toUpperCase() || "—",
        payStatus: order.payment?.status?.toUpperCase() || "—",
        orderStatus: order.orderStatus?.replace(/_/g, " ").toUpperCase() || "—",
        subtotal: order.pricing?.subtotal || 0,
        productDisc: order.pricing?.productDiscount || 0,
        couponDisc: order.pricing?.couponDiscount || 0,
        gst: order.pricing?.gstTotal || 0,
        delivery: order.pricing?.deliveryCharge || 0,
        total: order.pricing?.finalAmount || 0,
      });
      row.eachCell(cell => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        cell.font = { color: { argb: fg } };
      });
      row.getCell("total").font = { bold: true, color: { argb: fg } };
    });

    // ── Accounting totals section ─────────────────────────────────────────────
    ws.addRow({}); // spacer

    const addTotalRow = (label, values, bgArgb, fgArgb) => {
      const row = ws.addRow({ orderNumber: label, ...values });
      row.eachCell(cell => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } };
        cell.font = { bold: true, color: { argb: fgArgb } };
        cell.alignment = { horizontal: "right" };
      });
      // Label cell left-aligned
      row.getCell("orderNumber").alignment = { horizontal: "left" };
    };

    addTotalRow("GROSS SALES  (paid orders)", {
      subtotal: summary.grossRevenue,
      productDisc: summary.totalProductDisc,
      couponDisc: summary.totalCouponDisc,
      gst: summary.totalGST,
      delivery: summary.totalDelivery,
      total: summary.grossRevenue,
    }, "FFDBEAFE", "FF1D4ED8");

    addTotalRow("REFUND AMOUNT  (refunded orders)", {
      total: summary.refundAmount,
    }, "FFFCE7F3", "FF9D174D");

    addTotalRow("CANCELLED VALUE  (cancelled orders)", {
      total: summary.cancelledValue,
    }, "FFFEF2F2", "FFB91C1C");

    addTotalRow(`NET SALES  (Gross − Refund = ${summary.grossRevenue.toLocaleString("en-IN")} − ${summary.refundAmount.toLocaleString("en-IN")})`, {
      total: summary.netRevenue,
    }, "FFF0FDF4", "FF15803D");

    // Counts summary row
    ws.addRow({});
    const countRow = ws.addRow({
      orderNumber: `Total Orders: ${summary.totalOrders}   |   Successful (paid+delivered): ${summary.successOrders}   |   Refunded: ${summary.refundOrders}   |   Cancelled: ${summary.cancelledOrders}`,
    });
    countRow.getCell("orderNumber").font = { bold: true, color: { argb: "FF475569" }, size: 9 };
    countRow.getCell("orderNumber").alignment = { horizontal: "left" };

    // Number format
    ["subtotal", "productDisc", "couponDisc", "gst", "delivery", "total"].forEach(k => {
      ws.getColumn(k).numFmt = "#,##0.00";
    });

    const fname = `${filters.reportType}-report-${filters.preset}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    if (!res.headersSent) next(err);
  }
};

// ── CSV export ────────────────────────────────────────────────────────────────
export const downloadReportCSV = async (req, res, next) => {
  try {
    const filters = extractFilters(req.query);
    const { orders, summary } = await getReportAllService(filters);

    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const headers = ["Order #", "Date", "Customer", "Email", "Payment Method", "Payment Status", "Order Status", "Subtotal", "Product Disc", "Coupon Disc", "GST", "Delivery", "Grand Total"];

    const rows = orders.map(o => [
      o.orderNumber,
      new Date(o.createdAt).toLocaleDateString("en-IN"),
      o.userId?.name || "",
      o.userId?.email || "",
      o.payment?.method?.toUpperCase() || "",
      o.payment?.status?.toUpperCase() || "",
      o.orderStatus?.replace(/_/g, " ").toUpperCase() || "",
      o.pricing?.subtotal || 0,
      o.pricing?.productDiscount || 0,
      o.pricing?.couponDiscount || 0,
      o.pricing?.gstTotal || 0,
      o.pricing?.deliveryCharge || 0,
      o.pricing?.finalAmount || 0,
    ].map(esc).join(","));

    const totals = [
      ["", "", "", "", "", "", "", "", "", "", "", "", ""].map(esc).join(","),
      [esc("GROSS SALES"), "", "", "", "", "", "", "", "", "", "", "", esc(summary.grossRevenue)].join(","),
      [esc("REFUND AMOUNT"), "", "", "", "", "", "", "", "", "", "", "", esc(summary.refundAmount)].join(","),
      [esc("CANCELLED VALUE"), "", "", "", "", "", "", "", "", "", "", "", esc(summary.cancelledValue)].join(","),
      [esc("NET SALES"), "", "", "", "", "", "", "", "", "", "", "", esc(summary.netRevenue)].join(","),
      [esc(`Total Orders: ${summary.totalOrders} | Successful: ${summary.successOrders} | Refunded: ${summary.refundOrders} | Cancelled: ${summary.cancelledOrders}`)].join(","),
    ];

    const csv = [headers.map(esc).join(","), ...rows, ...totals].join("\n");

    const fname = `${filters.reportType}-report-${filters.preset}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
    res.send("\uFEFF" + csv); // BOM for Excel UTF-8
  } catch (err) {
    next(err);
  }
};

// ── PDF export ────────────────────────────────────────────────────────────────
export const downloadReportPDF = async (req, res, next) => {
  try {
    const filters = extractFilters(req.query);
    const { orders, summary } = await getReportAllService(filters);

    const PDFDocument = (await import("pdfkit")).default;
    const doc = new PDFDocument({ margin: 40, size: "A4" });

    const fname = `${filters.reportType}-report-${filters.preset}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
    doc.pipe(res);

    const PW = 595, ML = 40, CW = 515;
    const C_DARK = "#0F172A", C_GRAY = "#64748B";
    const C_HEAD = "#1E293B", C_WHITE = "#FFFFFF", C_LIGHT = "#F8FAFC";
    const C_GREEN = "#15803D", C_RED = "#B91C1C", C_BLUE = "#1D4ED8";

    // Header band
    doc.rect(0, 0, PW, 70).fill(C_HEAD);
    doc.fontSize(20).font("Helvetica-Bold").fillColor(C_WHITE).text("ELECTRO", ML, 18);
    doc.fontSize(9).font("Helvetica").fillColor("#94A3B8")
      .text(REPORT_TITLES[filters.reportType] || "Report", ML, 42);
    doc.fontSize(8).fillColor("#CBD5E1")
      .text(`Period: ${filters.preset.toUpperCase()}${filters.from ? ` | ${filters.from} → ${filters.to}` : ""}`, 300, 28, { align: "right", width: 255 })
      .text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 300, 42, { align: "right", width: 255 });

    let y = 85;

    // Summary boxes
    const summaryItems = [
      { label: "Gross Sales", val: `Rs.${summary.grossRevenue.toLocaleString("en-IN")}`, color: C_BLUE },
      { label: "Refund Amount", val: `Rs.${summary.refundAmount.toLocaleString("en-IN")}`, color: C_RED },
      { label: "Net Sales", val: `Rs.${summary.netRevenue.toLocaleString("en-IN")}`, color: C_GREEN },
      { label: "Total Orders", val: String(summary.totalOrders), color: C_DARK },
    ];

    const boxW = (CW - 9) / 4;
    summaryItems.forEach(({ label, val, color }, i) => {
      const bx = ML + i * (boxW + 3);
      doc.rect(bx, y, boxW, 50).fill(C_LIGHT).stroke("#E2E8F0");
      doc.fontSize(7).font("Helvetica").fillColor(C_GRAY).text(label.toUpperCase(), bx + 8, y + 8, { width: boxW - 16 });
      doc.fontSize(11).font("Helvetica-Bold").fillColor(color).text(val, bx + 8, y + 24, { width: boxW - 16 });
    });

    y += 64;

    // Table header
    const cols = [
      { label: "ORDER #", x: ML, w: 100 },
      { label: "DATE", x: ML + 105, w: 72 },
      { label: "CUSTOMER", x: ML + 182, w: 100 },
      { label: "STATUS", x: ML + 287, w: 80 },
      { label: "DISCOUNT", x: ML + 372, w: 68 },
      { label: "TOTAL", x: ML + 445, w: 70 },
    ];

    doc.rect(ML, y, CW, 20).fill(C_HEAD);
    cols.forEach(col => {
      doc.fontSize(7).font("Helvetica-Bold").fillColor(C_WHITE)
        .text(col.label, col.x + 4, y + 6, { width: col.w - 8 });
    });
    y += 20;

    orders.forEach((order, idx) => {
      if (y > 755) { doc.addPage(); y = 40; }

      const isRefunded = order.payment?.status === "refunded";
      const isCancelled = order.orderStatus === "cancelled";
      const isDelivered = order.orderStatus === "delivered";

      const bg = isRefunded ? "#FFF0F5" : isCancelled ? "#FFF5F5" : isDelivered ? "#F0FDF4" : idx % 2 === 0 ? C_WHITE : C_LIGHT;
      doc.rect(ML, y, CW, 18).fill(bg);

      const discount = (order.pricing?.productDiscount || 0) + (order.pricing?.couponDiscount || 0);
      const statusLabel = order.orderStatus?.replace(/_/g, " ").toUpperCase() || "—";
      const totalColor = isRefunded ? C_RED : isCancelled ? "#94A3B8" : C_GREEN;

      const rowData = [
        order.orderNumber,
        new Date(order.createdAt).toLocaleDateString("en-IN"),
        order.userId?.name || "—",
        statusLabel,
        `Rs.${discount.toLocaleString("en-IN")}`,
        `Rs.${(order.pricing?.finalAmount || 0).toLocaleString("en-IN")}`,
      ];

      cols.forEach((col, ci) => {
        const color = ci === 5 ? totalColor : C_DARK;
        doc.fontSize(7.5).font("Helvetica").fillColor(color)
          .text(rowData[ci], col.x + 4, y + 5, { width: col.w - 8, ellipsis: true });
      });

      doc.moveTo(ML, y + 18).lineTo(ML + CW, y + 18).strokeColor("#E2E8F0").lineWidth(0.3).stroke();
      y += 18;
    });

    // Accounting totals
    y += 10;
    if (y > 720) { doc.addPage(); y = 40; }

    const totalsData = [
      { label: "GROSS SALES", val: summary.grossRevenue, color: C_BLUE },
      { label: "REFUND AMOUNT", val: summary.refundAmount, color: C_RED },
      { label: "CANCELLED VALUE", val: summary.cancelledValue, color: "#DC2626" },
      { label: "NET SALES", val: summary.netRevenue, color: C_GREEN },
    ];

    totalsData.forEach(({ label, val, color }) => {
      if (y > 760) { doc.addPage(); y = 40; }
      doc.rect(ML, y, CW, 18).fill(C_LIGHT).stroke("#E2E8F0");
      doc.fontSize(8).font("Helvetica-Bold").fillColor(C_GRAY).text(label, ML + 8, y + 5, { width: 300 });
      doc.fontSize(9).font("Helvetica-Bold").fillColor(color)
        .text(`Rs.${val.toLocaleString("en-IN")}`, ML + 8, y + 5, { align: "right", width: CW - 16 });
      y += 20;
    });

    // Footer
    doc.rect(0, 822, PW, 20).fill(C_HEAD);
    doc.fontSize(7).font("Helvetica").fillColor("#94A3B8")
      .text(`Electro — ${REPORT_TITLES[filters.reportType]} | Confidential`, 0, 828, { align: "center", width: PW });

    doc.end();
  } catch (err) {
    if (!res.headersSent) next(err);
  }
};
