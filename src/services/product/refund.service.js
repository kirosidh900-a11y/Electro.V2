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
 *   paidBase     = sum of ALL order items' pricing.total (original totals, status-agnostic)
 *   itemShare    = item.pricing.total / paidBase
 *   couponShare  = order.pricing.couponDiscount * itemShare
 *   refundAmount = item.pricing.total - couponShare
 *
 * We query ALL items regardless of status so that already-cancelled items
 * don't shrink the base and inflate the refund.
 */
export const calculateItemRefund = async (item, order) => {
  const itemTotal      = item.pricing?.total ?? 0;
  const couponDiscount = order.pricing?.couponDiscount ?? 0;

  if (couponDiscount <= 0) return itemTotal;

  // Use ALL items (no status filter) so the base is always the original order total
  const allItems = await OrderItem.find({ orderId: order._id })
    .select("pricing.total")
    .lean();

  const paidBase = allItems.reduce((sum, i) => sum + (i.pricing?.total ?? 0), 0);

  if (paidBase <= 0) return itemTotal;

  const itemShare   = itemTotal / paidBase;
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

  const refundAmount = await calculateItemRefund(item, order);
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
  const allSettled = allItems.every(i =>
    ["cancelled", "returned", "refund_processed"].includes(i.itemStatus)
  );
  if (allSettled && ["paid", "pending"].includes(order.payment.status)) {
    order.payment.status     = "refunded";
    order.payment.refundedAt = new Date();
    await order.save();
  }

  return refundAmount;
};
