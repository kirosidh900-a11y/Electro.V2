import argon2 from "argon2";

//Password hash
const hashedPassword = async (password) => {
  return await argon2.hash(password);
};

export default hashedPassword;
