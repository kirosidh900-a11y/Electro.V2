import AppError from "./AppError.utils.js";
import HTTP_STATUS from "../../constant/statusCode.js";

//Validate Email
export const isValidEmail = (email) => {
  email = email?.trim().toLowerCase();

  if (!email) {
    throw new AppError("Email is required", HTTP_STATUS.BAD_REQUEST);
  }

  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

  if (!emailRegex.test(email)) {
    throw new AppError("Invalid email format", HTTP_STATUS.BAD_REQUEST);
  }
  return true;
};

// Validate phone number
export const isValidPhone = (phone) => {
  phone = phone?.trim();
  const phoneRegex = /^\d{10}$/;

  if (!phone) {
    throw new AppError("Phone number is required", HTTP_STATUS.BAD_REQUEST);
  }
  if (!phoneRegex.test(phone)) {
    throw new AppError("Invalid phone number format", HTTP_STATUS.BAD_REQUEST);
  }

  return true;
};

// Validate name
export const isValidName = (name) => {
  name = name?.trim();

  if (!name) {
    throw new AppError("Name is required", HTTP_STATUS.BAD_REQUEST);
  }

  const nameRegex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;

  if (!nameRegex.test(name)) {
    throw new AppError(
      "Name must contain only letters and single spaces between words",
      HTTP_STATUS.BAD_REQUEST,
    );
  }
  return true;
};

// Validate password and confirm password
export const isConfirmPassword  = (password, confirmPassword) => {
  if (!password || !confirmPassword) {
    throw new AppError("Password and confirm password are required", HTTP_STATUS.BAD_REQUEST);
  }
  if (password !== confirmPassword) {
    throw new AppError("Passwords do not match", HTTP_STATUS.BAD_REQUEST);
  }
  return true;
};

// Validate password strength
export const isValidPassword = (password) => {
  password = password?.trim();

  if (!password) {
    throw new AppError("Password is required", HTTP_STATUS.BAD_REQUEST);
  }

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  if (!passwordRegex.test(password)) {
    throw new AppError(
      "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character",
      HTTP_STATUS.BAD_REQUEST,
    );
  }
};
