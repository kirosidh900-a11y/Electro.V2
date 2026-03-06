import { verifyEmail } from "../../services/user/user.service.js";

export const showHomePage = async (req, res) => {
  let userData = null;

  if (req.user) {
    userData = req.user;
  }

  res.render("user/home/index", {
    user: userData,
  });
};

export const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp, purpose } = req.body;
    // Verify OTP for forgot password
    await verifyEmail(email, otp, purpose);

    res.json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (err) {
    next(err);
  }
};
