import User from "../../models/userSchema.model.js";


import {
  isUserExist,
  isValidName,
  isConformPassword,
  isValidEmail,
  isValidPassword,
  isValidPhone,
  createRef,
  isValidReferral,
} from "../../utils/auth.utils.js";

// Validate data
export const isValidate = async (data) => {
  const { name, email, phone, password, confirmPassword ,referral_by} = data;
  
  //Basic validation
  isValidEmail(email);
  isConformPassword(password, confirmPassword);
  isValidName(name);
  isValidPhone(phone);
  isValidPassword(password);

  //Database validation
  await isUserExist(email);
  await isValidReferral(referral_by,email);
};

// Create user
export const addUser = async ({ name, email, phone, password }) => {
  const referral = await createRef();

  const newUser = await User.create({
    name,
    email,
    phone,
    password,
    referral,
  });
};







