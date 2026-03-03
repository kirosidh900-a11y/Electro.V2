import argon2 from "argon2";

//Password hash
export const hashedPassword = async (password) => {
  return await argon2.hash(password);
};

export const verifyPassword = async (p1, p2) => {
  return await argon2.verify(p1, p2);
};
