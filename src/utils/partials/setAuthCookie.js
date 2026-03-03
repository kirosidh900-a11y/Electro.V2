export const setAuthCookie = (res, token, role, days = 1) => {
  const cookieName = role === "admin" ? "adminToken" : "token";

  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: days * 24 * 60 * 60 * 1000,
  });
};