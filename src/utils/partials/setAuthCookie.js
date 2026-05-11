const setAuthCookie = (res, token, role, days = 1) => {
  const cookieName = role === "admin" ? "adminToken" : "token";

  const isProduction = process.env.NODE_ENV === "production";

  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: days * 24 * 60 * 60 * 1000,
  });
};

export default setAuthCookie;
