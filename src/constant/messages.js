const MESSAGES = Object.freeze({

  // ── Generic ──────────────────────────────────────────────────────
  SUCCESS:               "Success",
  CREATED:               "Created successfully",
  UPDATED:               "Updated successfully",
  DELETED:               "Deleted successfully",
  NOT_FOUND:             "Resource not found",
  INVALID_ID:            "Invalid ID format",
  SERVER_ERROR:          "Internal server error",
  UNAUTHORIZED:          "Please log in to continue",
  FORBIDDEN:             "You do not have permission to perform this action",
  VALIDATION_ERROR:      "Validation failed",
  RATE_LIMITED:          "Too many requests. Please try again later",

  // ── Auth ─────────────────────────────────────────────────────────
  AUTH: Object.freeze({
    LOGIN_SUCCESS:        "Logged in successfully",
    LOGOUT_SUCCESS:       "Logged out successfully",
    REGISTER_SUCCESS:     "Account created successfully",
    INVALID_CREDENTIALS:  "Invalid email or password",
    EMAIL_IN_USE:         "Email is already registered",
    ACCOUNT_BLOCKED:      "Your account has been blocked",
    SESSION_EXPIRED:      "Session expired. Please log in again",
    OTP_SENT:             "OTP sent successfully",
    OTP_INVALID:          "Invalid or expired OTP",
    OTP_VERIFIED:         "OTP verified successfully",
    PASSWORD_UPDATED:     "Password updated successfully",
    EMAIL_UPDATED:        "Email updated successfully",
    PHONE_UPDATED:        "Phone number updated successfully",
    NAME_UPDATED:         "Name updated successfully",
    PHOTO_UPDATED:        "Profile photo updated successfully",
    PHOTO_REMOVED:        "Profile photo removed",
  }),

  // ── Product ──────────────────────────────────────────────────────
  PRODUCT: Object.freeze({
    NOT_FOUND:            "Product not found",
    CREATED:              "Product created successfully",
    UPDATED:              "Product updated successfully",
    DELETED:              "Product deleted successfully",
    ALREADY_EXISTS:       "A product with this name already exists",
    VARIANT_NOT_FOUND:    "Variant not found",
    VARIANT_ADDED:        "Variant added successfully",
    VARIANT_UPDATED:      "Variant updated successfully",
    VARIANT_DELETED:      "Variant deleted successfully",
    SKU_EXISTS:           "SKU already exists",
    MIN_IMAGES:           "At least 3 product images are required",
    OUT_OF_STOCK:         "Product is out of stock",
    STOCK_CONFLICT:       "Stock conflict, please try again",
  }),

  // ── Category ─────────────────────────────────────────────────────
  CATEGORY: Object.freeze({
    NOT_FOUND:            "Category not found",
    CREATED:              "Category created successfully",
    UPDATED:              "Category updated successfully",
    DELETED:              "Category deleted successfully",
    ALREADY_EXISTS:       "Category with this name already exists",
    ATTRIBUTE_REMOVED:    "Attribute removed successfully",
  }),

  // ── Brand ────────────────────────────────────────────────────────
  BRAND: Object.freeze({
    NOT_FOUND:            "Brand not found",
    CREATED:              "Brand created successfully",
    UPDATED:              "Brand updated successfully",
    DELETED:              "Brand deleted successfully",
    ALREADY_EXISTS:       "Brand with this name already exists",
  }),

  // ── Offer ────────────────────────────────────────────────────────
  OFFER: Object.freeze({
    NOT_FOUND:            "Offer not found",
    CREATED:              "Offer created successfully",
    UPDATED:              "Offer updated successfully",
    DELETED:              "Offer deleted successfully",
    ENABLED:              "Offer enabled successfully",
    DISABLED:             "Offer disabled successfully",
  }),

  // ── Coupon ───────────────────────────────────────────────────────
  COUPON: Object.freeze({
    NOT_FOUND:            "Coupon not found",
    CREATED:              "Coupon created successfully",
    UPDATED:              "Coupon updated successfully",
    DELETED:              "Coupon deleted successfully",
    ACTIVATED:            "Coupon activated successfully",
    DEACTIVATED:          "Coupon deactivated successfully",
    CODE_EXISTS:          "Coupon code already exists",
    CODE_AVAILABLE:       "Coupon code is available",
    INVALID:              "Invalid coupon code",
    EXPIRED:              "This coupon has expired",
    NOT_ACTIVE:           "This coupon is no longer active",
    NOT_YET_VALID:        "This coupon is not yet valid",
    USAGE_LIMIT_REACHED:  "This coupon has reached its usage limit",
    USER_LIMIT_REACHED:   "You have already used this coupon the maximum number of times",
    MIN_ORDER_REQUIRED:   (amount) => `Minimum order amount of ₹${amount} required for this coupon`,
    APPLIED:              (code, amount) => `Coupon "${code}" applied! You save ₹${amount}`,
    REMOVED:              "Coupon removed successfully",
    GENERATE_LIMIT:       (mins) => `Auto-generate limit reached (10/hr). Try again in ${mins} minute(s).`,
    GENERATE_FAILED:      "Could not generate a unique code. Please enter one manually.",
  }),

  // ── Cart ─────────────────────────────────────────────────────────
  CART: Object.freeze({
    NOT_FOUND:            "Cart not found",
    EMPTY:                "Your cart is empty",
    ITEM_ADDED:           "Product added to cart",
    ITEM_UPDATED:         "Cart quantity updated",
    ITEM_REMOVED:         "Item removed from cart",
    MAX_ITEMS:            "Maximum 5 different products allowed in cart",
    MAX_QTY:              (n) => `Maximum ${n} items allowed per product`,
    STOCK_EXCEEDED:       (n) => `Only ${n} items available in stock`,
  }),

  // ── Wishlist ─────────────────────────────────────────────────────
  WISHLIST: Object.freeze({
    ADDED:                "Added to wishlist",
    REMOVED:              "Removed from wishlist",
    NOT_FOUND:            "Wishlist not found",
  }),

  // ── Order ────────────────────────────────────────────────────────
  ORDER: Object.freeze({
    NOT_FOUND:            "Order not found",
    PLACED:               "Order placed successfully",
    CANCELLED:            "Order cancelled successfully",
    ITEM_CANCELLED:       "Item cancelled successfully",
    RETURN_REQUESTED:     "Return request submitted successfully",
    INVALID_METHOD:       "Invalid payment method",
    ALREADY_DELIVERED:    "Delivered orders cannot be cancelled",
    NO_ELIGIBLE_ITEMS:    "No items eligible for cancellation",
  }),

  // ── Payment ──────────────────────────────────────────────────────
  PAYMENT: Object.freeze({
    VERIFIED:             "Payment verified successfully",
    FAILED:               "Payment verification failed",
    EXPIRED:              "Payment session expired",
    REFUNDED:             "Payment refunded successfully",
    RETRY_EXPIRED:        "Retry window expired. Please place a new order.",
  }),

  // ── Address ──────────────────────────────────────────────────────
  ADDRESS: Object.freeze({
    NOT_FOUND:            "Address not found",
    CREATED:              "Address saved successfully",
    UPDATED:              "Address updated successfully",
    DELETED:              "Address deleted successfully",
  }),

  // ── Wallet ───────────────────────────────────────────────────────
  WALLET: Object.freeze({
    NOT_FOUND:            "Wallet not found",
    CREDITED:             "Amount credited to wallet",
    DEBITED:              "Amount debited from wallet",
    INSUFFICIENT:         "Insufficient wallet balance",
    TOPUP_SUCCESS:        (amount) => `₹${amount} added to your wallet successfully`,
  }),

  // ── Customer (Admin) ─────────────────────────────────────────────
  CUSTOMER: Object.freeze({
    NOT_FOUND:            "Customer not found",
    BLOCKED:              "Customer blocked successfully",
    UNBLOCKED:            "Customer unblocked successfully",
  }),

});

export default MESSAGES;
