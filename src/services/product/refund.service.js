/**
 * Central Refund Service
 *
 * Refund rules:
 * - item.pricing.total = finalPrice × qty (offer discount already excluded)
 * - Coupon discount is deducted proportionally across all items
 * - Delivery charge is refunded proportionally; fully refunded on last item cancel
 * - Razorpay / Wallet orders → wallet credit (source: "refund")
 * - COD orders → wallet credit only after delivery + return
 */

import Order     from "../../models/orderSchema.model.js";
import OrderItem from "../../models/orderItemSchema.model.js";
import { creditWallet } from "../user/wallet.service.js";
import AppError  from "../../utils/partials/AppError.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";

/**
 * Calculate the refund amount for a single item.
 *
 * Formula:
 *   paidBase      = sum of ALL order items' pricing.total (status-agnostic, original totals)
 *   itemShare     = item.pricing.total / paidBase
 *   couponShare   = order.pricing.couponDiscount  * itemShare   (deduct — user didn't pay this)
 *   deliveryShare = order.pricing.deliveryCharge  * itemShare   (add back — user paid this)
 *   refundAmount  = item.pricing.total - couponShare + deliveryShare
 *
 * Using ALL items (regardless of status) keeps the base fixed so that
 * already-cancelled items don't inflate the share of remaining items.
 */
export const calculateItemRefund = async (item, order) => {
  const itemTotal      = item.pricing?.total        ?? 0;
  // Use originalCouponDiscount (immutable) so refunds are always correct
  // even after partial cancellations reduce order.pricing.couponDiscount
  const couponDiscount = order.pricing?.originalCouponDiscount ?? order.pricing?.couponDiscount ?? 0;
  const deliveryCharge = order.pricing?.deliveryCharge ?? 0;

  // Fast path — no order-level adjustments
  if (couponDiscount <= 0 && deliveryCharge <= 0) return itemTotal;

  // Use ALL items so the base never shrinks as items get cancelled
  const allItems = await OrderItem.find({ orderId: order._id })
    .select("pricing.total")
    .lean();

  const paidBase = allItems.reduce((sum, i) => sum + (i.pricing?.total ?? 0), 0);

  if (paidBase <= 0) return itemTotal;

  const itemShare = itemTotal / paidBase;

  // Coupon share — user didn't pay this portion, so deduct it from refund
  const couponShare = Math.round(couponDiscount * itemShare);

  // Delivery share — user paid this, so add it back to refund
  const deliveryShare = Math.round(deliveryCharge * itemShare);

  return Math.max(0, itemTotal - couponShare + deliveryShare);
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
