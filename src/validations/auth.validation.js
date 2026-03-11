import HTTP_STATUS from "../constant/statusCode.js";
import AppError from "../utils/partials/AppError.js";

export const validateAdminLogin = ({ email, password }) => {
  if (!email) throw new AppError("Email is required", HTTP_STATUS.BAD_REQUEST);

  if (!password)
    throw new AppError("Password is required", HTTP_STATUS.BAD_REQUEST);

  const emailRegex = /\S+@\S+\.\S+/;

  if (!emailRegex.test(email)) {
    throw new AppError("Invalid email format", HTTP_STATUS.BAD_REQUEST);
  }

  const passwordRegex =
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{6,}$/;

  if (!passwordRegex.test(password)) {
    throw new AppError(
      "Password must contain letters, numbers, symbols and be at least 6 characters long",
      HTTP_STATUS.BAD_REQUEST,
    );
  }
};
