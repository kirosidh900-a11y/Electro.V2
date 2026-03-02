const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  // 🔥 AUTH / BLOCK ERROR
  if (statusCode === 401 || statusCode === 403) {

    // Clear token
    res.clearCookie("token", { path: "/" });

    // Set temporary cookie for Swal
    res.cookie(
      "authResult",
      encodeURIComponent(
        JSON.stringify({
          success: false,
          message: err.message,
        })
      ),
      { maxAge: 5000, path: "/" }
    );

    return res.redirect("/auth/login");
  }

  // 🔥 Other errors (API / system errors)
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};

export default errorMiddleware;