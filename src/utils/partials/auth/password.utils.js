import argon2 from "argon2";

// Hash password
export const hashPassword = async (password) => {
  return argon2.hash(password);
};

// Verify password
export const verifyPassword = async (plainPassword, hashedPassword) => {
  return argon2.verify(hashedPassword, plainPassword);
};
