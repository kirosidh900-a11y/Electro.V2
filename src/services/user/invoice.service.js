import PDFDocument from "pdfkit";
import Order from "../../models/orderSchema.model.js";
import OrderItem from "../../models/orderItemSchema.model.js";
import AppError from "../../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";

const INR = (n) => `Rs. ${Number(n || 0).toLocaleString("en-IN")}`;

const EXCLUDED = [
  "cancelled", "return_requested", "return_approved",
  "pickup_scheduled", "returned", "refund_pending",
  "refund_processed", "return_rejected",
];

export const generateInvoiceService = async ({ userId, orderId }, res) => {
  const order = await Order.findOne({ _id: orderId, userId })
    .populate("userId", "name email phone")
    .lean();

  if (!order) throw new AppError("Order not found", HTTP_STATUS.NOT_FOUND);

  if (order.isCancelled || order.orderStatus === "cancelled")
    throw new AppError("Invoice not available for cancelled orders", HTTP_STATUS.BAD_REQUEST);

  if (order.payment.method === "cod" && order.orderStatus !== "delivered")
    throw new AppError("Invoice available after delivery for COD orders", HTTP_STATUS.BAD_REQUEST);

  const allItems = await OrderItem.find({ orderId: order._id }).lean();
  const items = allItems.filter(i => !EXCLUDED.includes(i.itemStatus));

  if (!items.length)
    throw new AppError("No active items to generate invoice", HTTP_STATUS.BAD_REQUEST);

  // ── PDF setup ─────────────────────────────────────────────────────────────
  const doc = new PDFDocument({ margin: 0, size: "A4" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="invoice-${order.orderNumber}.pdf"`);
  doc.pipe(res);

  const PW = 595, PH = 842;
  const ML = 40, MR = 40, MT = 0;
  const CW = PW - ML - MR;   // content width = 515

  // colours
  const C_BG_HEADER = "#1E293B";   // dark navy
  const C_ACCENT    = "#3B82F6";   // blue
  const C_LIGHT     = "#F8FAFC";   // near-white
  const C_BORDER    = "#E2E8F0";
  const C_GRAY      = "#64748B";
  const C_DARK      = "#0F172A";
  const C_GREEN     = "#16A34A";
  const C_RED       = "#DC2626";
  const C_WHITE     = "#FFFFFF";

  // ── HEADER BAND ───────────────────────────────────────────────────────────
  doc.rect(0, 0, PW, 90).fill(C_BG_HEADER);

  // Brand
  doc.fontSize(26).font("Helvetica-Bold").fillColor(C_WHITE)
    .text("ELECTRO", ML, 28);
  doc.fontSize(8).font("Helvetica").fillColor("#94A3B8")
    .text("Tax Invoice / Receipt", ML, 58);

  // Invoice meta (right side)
  const metaX = 360;
  doc.fontSize(8).font("Helvetica").fillColor("#CBD5E1")
    .text("INVOICE", metaX, 22, { width: 195, align: "right" });
  doc.fontSize(9).font("Helvetica-Bold").fillColor(C_WHITE)
    .text(`#${order.orderNumber}`, metaX, 34, { width: 195, align: "right" });
  doc.fontSize(8).font("Helvetica").fillColor("#94A3B8")
    .text(new Date(order.createdAt).toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric"
    }), metaX, 50, { width: 195, align: "right" })
    .text(`Payment: ${order.payment.method.toUpperCase()}`, metaX, 63, { width: 195, align: "right" });

  let y = 105;

  // ── BILL TO / SHIP TO ─────────────────────────────────────────────────────
  const addr = order.shippingAddress;
  const user = order.userId;

  // two-column info cards
  const cardH = 110;
  // left card
  doc.rect(ML, y, 240, cardH).fill(C_LIGHT).stroke(C_BORDER);
  doc.fontSize(7).font("Helvetica-Bold").fillColor(C_ACCENT)
    .text("BILL TO / SHIP TO", ML + 12, y + 12);
  doc.fontSize(9).font("Helvetica-Bold").fillColor(C_DARK)
    .text(addr.name, ML + 12, y + 26, { width: 216 });
  doc.fontSize(8).font("Helvetica").fillColor(C_GRAY)
    .text(addr.address, ML + 12, y + 40, { width: 216 })
    .text(`${addr.city}, ${addr.state} - ${addr.pincode}`, ML + 12, y + 53, { width: 216 })
    .text(`Ph: ${addr.phone}`, ML + 12, y + 66, { width: 216 });
  if (user?.email) {
    doc.text(user.email, ML + 12, y + 79, { width: 216 });
  }

  // right card
  const rc = ML + 260;
  doc.rect(rc, y, 255, cardH).fill(C_LIGHT).stroke(C_BORDER);
  doc.fontSize(7).font("Helvetica-Bold").fillColor(C_ACCENT)
    .text("ORDER DETAILS", rc + 12, y + 12);

  const detailRows = [
    ["Order Number", order.orderNumber],
    ["Order Date",   new Date(order.createdAt).toLocaleDateString("en-IN")],
    ["Order Status", order.orderStatus.replace(/_/g, " ").toUpperCase()],
    ["Payment",      order.payment.method.toUpperCase()],
    ["Pay Status",   order.payment.status.toUpperCase()],
  ];
  detailRows.forEach(([label, val], i) => {
    const ry = y + 26 + i * 14;
    doc.fontSize(8).font("Helvetica").fillColor(C_GRAY).text(label, rc + 12, ry, { width: 90 });
    doc.fontSize(8).font("Helvetica-Bold").fillColor(C_DARK).text(val, rc + 110, ry, { width: 133 });
  });

  y += cardH + 20;

  // ── ITEMS TABLE ───────────────────────────────────────────────────────────
  // Column x positions & widths
  const COL = {
    item:  { x: ML,       w: 210 },
    qty:   { x: ML + 215, w: 35  },
    base:  { x: ML + 255, w: 75  },
    gst:   { x: ML + 335, w: 65  },
    total: { x: ML + 405, w: 110 },
  };

  // Table header
  const TH = 22;
  doc.rect(ML, y, CW, TH).fill(C_BG_HEADER);
  const headers = [
    ["ITEM DESCRIPTION", COL.item],
    ["QTY",  COL.qty],
    ["UNIT PRICE", COL.base],
    ["GST AMT", COL.gst],
    ["TOTAL", COL.total],
  ];
  headers.forEach(([label, col]) => {
    doc.fontSize(7).font("Helvetica-Bold").fillColor(C_WHITE)
      .text(label, col.x + 6, y + 7, { width: col.w - 6 });
  });
  y += TH;

  // Rows
  let recalcBase = 0;
  let recalcGst  = 0;

  items.forEach((item, idx) => {
    const attrs   = item.attributes ? Object.values(item.attributes).join(" / ") : "";
    const label   = attrs ? `${item.name}\n(${attrs})` : item.name;
    const rowH    = Math.max(doc.heightOfString(label, { width: COL.item.w - 12, fontSize: 8 }) + 14, 28);
    const rowBg   = idx % 2 === 0 ? C_WHITE : C_LIGHT;

    const unitPrice = item.pricing?.finalPrice ?? 0;
    const gstAmt    = (item.pricing?.gstAmount ?? 0) * item.quantity;
    const lineTotal = item.pricing?.total ?? 0;
    const baseAmt   = lineTotal - gstAmt;

    recalcBase += baseAmt;
    recalcGst  += gstAmt;

    doc.rect(ML, y, CW, rowH).fill(rowBg);

    // vertical dividers
    [COL.qty.x, COL.base.x, COL.gst.x, COL.total.x].forEach(cx => {
      doc.moveTo(cx, y).lineTo(cx, y + rowH).strokeColor(C_BORDER).lineWidth(0.5).stroke();
    });

    const cy = y + 8;
    doc.fontSize(8).font("Helvetica").fillColor(C_DARK)
      .text(label, COL.item.x + 6, cy, { width: COL.item.w - 12 });
    doc.fontSize(8).font("Helvetica").fillColor(C_DARK)
      .text(String(item.quantity), COL.qty.x + 6, cy, { width: COL.qty.w - 6, align: "center" })
      .text(INR(unitPrice), COL.base.x + 6, cy, { width: COL.base.w - 6, align: "right" })
      .text(INR(gstAmt),    COL.gst.x + 6,  cy, { width: COL.gst.w - 6,  align: "right" })
      .text(INR(lineTotal), COL.total.x + 6, cy, { width: COL.total.w - 12, align: "right" });

    // bottom border
    doc.moveTo(ML, y + rowH).lineTo(ML + CW, y + rowH).strokeColor(C_BORDER).lineWidth(0.5).stroke();
    y += rowH;

    if (y > PH - 160) { doc.addPage(); y = 40; }
  });

  // outer table border
  doc.rect(ML, y - (items.reduce((s, item) => {
    const attrs = item.attributes ? Object.values(item.attributes).join(" / ") : "";
    const label = attrs ? `${item.name}\n(${attrs})` : item.name;
    return s + Math.max(doc.heightOfString(label, { width: COL.item.w - 12, fontSize: 8 }) + 14, 28);
  }, 0)) - TH, CW, TH + items.reduce((s, item) => {
    const attrs = item.attributes ? Object.values(item.attributes).join(" / ") : "";
    const label = attrs ? `${item.name}\n(${attrs})` : item.name;
    return s + Math.max(doc.heightOfString(label, { width: COL.item.w - 12, fontSize: 8 }) + 14, 28);
  }, 0)).stroke(C_BORDER).lineWidth(0.5);

  y += 20;

  // ── TOTALS BLOCK ──────────────────────────────────────────────────────────
  const totW = 220;
  const totX = PW - MR - totW;

  const coupon   = order.pricing?.couponDiscount ?? 0;
  const prodDisc = order.pricing?.productDiscount ?? 0;
  const delivery = order.pricing?.deliveryCharge ?? 0;
  const grandTotal = recalcBase + recalcGst + delivery - coupon;

  const totRows = [
    { label: "Subtotal (excl. GST)", val: INR(recalcBase),  color: C_DARK,  bold: false },
    { label: "GST",                  val: INR(recalcGst),   color: C_DARK,  bold: false },
    ...(prodDisc > 0 ? [{ label: "Product Discount", val: `- ${INR(prodDisc)}`, color: C_GREEN, bold: false }] : []),
    ...(coupon   > 0 ? [{ label: "Coupon Discount",  val: `- ${INR(coupon)}`,   color: C_GREEN, bold: false }] : []),
    { label: "Delivery", val: delivery > 0 ? INR(delivery) : "FREE", color: delivery > 0 ? C_DARK : C_GREEN, bold: false },
  ];

  // draw rows
  totRows.forEach(row => {
    doc.fontSize(8.5).font(row.bold ? "Helvetica-Bold" : "Helvetica")
      .fillColor(C_GRAY).text(row.label, totX, y, { width: 120 })
      .fillColor(row.color).text(row.val, totX + 120, y, { width: totW - 120, align: "right" });
    y += 16;
  });

  // grand total band
  y += 4;
  doc.rect(totX - 8, y - 4, totW + 8, 26).fill(C_BG_HEADER);
  doc.fontSize(10).font("Helvetica-Bold").fillColor(C_WHITE)
    .text("Grand Total", totX, y + 4, { width: 120 })
    .text(INR(grandTotal), totX + 120, y + 4, { width: totW - 120, align: "right" });
  y += 36;

  // ── PAYMENT STATUS PILL ───────────────────────────────────────────────────
  const pillColor = order.payment.status === "paid" ? C_GREEN
    : order.payment.status === "refunded" ? C_RED : C_GRAY;
  doc.roundedRect(ML, y, 130, 22, 4).fill(pillColor);
  doc.fontSize(8).font("Helvetica-Bold").fillColor(C_WHITE)
    .text(`Payment: ${order.payment.status.toUpperCase()}`, ML + 8, y + 7, { width: 114 });

  // ── FOOTER ────────────────────────────────────────────────────────────────
  doc.rect(0, PH - 36, PW, 36).fill(C_BG_HEADER);
  doc.fontSize(8).font("Helvetica").fillColor("#94A3B8")
    .text("Thank you for shopping with Electro  |  This is a computer-generated invoice",
      0, PH - 22, { align: "center", width: PW });

  doc.end();
};
