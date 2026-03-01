import HTTP_STATUS from "../../constant/statusCode.js";
import { getUserData ,verifyEmail } from "../../services/user/user.service.js";
import Otp from "../../models/otp.model.js";


export const showHomePage = async (req, res) => {
  let userData = null;

  if (req.user) {
    userData = await getUserData(req.user.userId);
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
