import AppError from "../partials/AppError.js";
import HTTP_STATUS from "../../constant/statusCode.js";

export const checkIfBlocked = (user) => {
  if (!user) {
    throw new AppError("User not found", HTTP_STATUS.NOT_FOUND);
  }

  if (user.isBlock) {
    throw new AppError("User is blocked", HTTP_STATUS.FORBIDDEN);
  }

  return user;
};
