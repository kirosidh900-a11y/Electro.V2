/**
 * Central Refund Service
 *
 * Refund rules:
 * - Refund amount = item.pricing.total (what user actually paid for this item)
 * - If coupon was applied, coupon discount is proportionally excluded
 *   (user only gets back what they actually paid after coupon)
 * - Razorpay orders → wallet credit (source: "refund")
 * - Wallet orders   → wallet credit (source: "refund")
 * - COD orders      → wallet credit only after delivery + return
 * - All transactions stored in WalletTransaction
 */

import Order     from "../../models/orderSchema.model.js";
import OrderItem from "../../models/orderItemSchema.model.js";
import { creditWallet } from "../user/wallet.service.js";
import AppError  from "../../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";

/**
 * Calculate the refund amount for a single item, accounting for coupon.
 *
 * Formula:
 *   itemShare = item.pricing.total / order.pricing.subtotal
 *   couponShare = order.pricing.couponDiscount * itemShare
 *   refundAmount = item.pricing.total - couponShare
 */
export const calculateItemRefund = (item, order) => {
  const itemTotal      = item.pricing?.total ?? 0;
  const orderSubtotal  = order.pricing?.subtotal ?? 0;
  const couponDiscount = order.pricing?.couponDiscount ?? 0;

  if (orderSubtotal <= 0) return itemTotal;

  const itemShare   = itemTotal / orderSubtotal;
  const couponShare = Math.round(couponDiscount * itemShare);

  return Math.max(0, itemTotal - couponShare);
};

/**
 * Process refund for a single order item.
 * Eligible payment methods: razorpay, wallet (always), cod (only after return).
 */
export const processItemRefund = async ({
  orderItemId,
  orderId,
  userId,
  reason,
  isCOD = false,
}) => {
  const [item, order] = await Promise.all([
    OrderItem.findById(orderItemId),
    Order.findById(orderId),
  ]);

  if (!item) throw new AppError("Order item not found", HTTP_STATUS.NOT_FOUND);
  if (!order) throw new AppError("Order not found", HTTP_STATUS.NOT_FOUND);

  // COD refunds only allowed after return (not on cancellation)
  if (isCOD && order.payment.method === "cod") {
    // allowed — credit wallet
  } else if (order.payment.method === "cod" && !isCOD) {
    // COD cancellation before delivery — no refund (nothing was paid)
    return null;
  }

  // Skip if already refunded
  if (item.refund?.status === "processed") return null;

  const refundAmount = calculateItemRefund(item, order);
  if (refundAmount <= 0) return null;

  // Credit wallet
  await creditWallet({
    userId,
    amount:      refundAmount,
    description: `Refund for ${item.name} (Order #${order.orderNumber})`,
    source:      "refund",
    orderId:     order._id,
  });

  // Update item refund status
  item.refund = {
    status:      "processed",
    amount:      refundAmount,
    processedAt: new Date(),
  };
  item.itemStatus = "refund_processed";
  await item.save();

  // Update order payment status to refunded if all paid items are refunded
  const allItems = await OrderItem.find({ orderId });
  const allRefunded = allItems.every(i =>
    ["cancelled", "returned", "refund_processed"].includes(i.itemStatus)
  );
  if (allRefunded && order.payment.status === "paid") {
    order.payment.status    = "refunded";
    order.payment.refundedAt = new Date();
    await order.save();
  }

  return refundAmount;
};
