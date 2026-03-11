import AppError from "../AppError.utils.js";
import HTTP_STATUS from "../../../constant/statusCode.js";

export const checkIfAdmin = (admin) => {
  if (!admin) {
    throw new AppError("User not found", HTTP_STATUS.NOT_FOUND);
  } else if (!admin?.isAdmin) {
    throw new AppError("Unauthorized Access", HTTP_STATUS.UNAUTHORIZED);
  }
  return admin;
};

export const checkIfBlocked = (user) => {
  if (!user) {
    throw new AppError("User not found", HTTP_STATUS.NOT_FOUND);
  }

  if (user.isBlock) {
    throw new AppError("User is blocked", HTTP_STATUS.FORBIDDEN);
  }

  return user;
};

export const checkGoogleAuth = (admin) => {
  if (admin?.googleId && !admin?.password) {
    throw new AppError(
      "This account was created using Google login. Please sign in with Google.",
      HTTP_STATUS.NOT_FOUND
    );
  }
};
