import rateLimit from "express-rate-limit";

// ── Shared response format ────────────────────────────────────────────────────
const jsonHandler = (req, res) => {
  res.status(429).json({
    success: false,
    message: "Too many requests. Please try again later.",
  });
};

// ── 1. Global API limiter — 200 req / 15 min per IP ──────────────────────────
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 200,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please slow down." },
  skip: (req) =>
    req.path.startsWith("/socket.io") ||
    req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$/),
});

// ── 2. Login — 5 attempts / 15 min per IP ────────────────────────────────────
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many login attempts. Please try again after 15 minutes.",
    });
  },
});

// ── 3. Signup — 5 attempts / 15 min per IP ───────────────────────────────────
export const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many signup attempts. Please try again after 15 minutes.",
    });
  },
});

// ── 4. OTP send — 5 OTPs / 15 min per IP ─────────────────────────────────────
export const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "OTP limit reached. You can request a new OTP after 15 minutes.",
    });
  },
});

// ── 5. OTP verify — 10 attempts / 15 min per IP ──────────────────────────────
export const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many OTP attempts. Please try again after 15 minutes.",
    });
  },
});

// ── 6. Password reset — 5 attempts / 15 min per IP ───────────────────────────
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many password reset attempts. Please try again after 15 minutes.",
    });
  },
});

// ── 7. Cart / Wishlist / Order mutations — 60 req / min per IP ───────────────
export const mutationLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: jsonHandler,
});

// ── 8. Payment endpoints — 20 req / 15 min per IP ────────────────────────────
export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many payment requests. Please try again after 15 minutes.",
    });
  },
});
