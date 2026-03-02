export const setAuthCookie = (res, token, days = 1) => {
  res.cookie("adminToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: days * 24 * 60 * 60 * 1000,
  });
};
