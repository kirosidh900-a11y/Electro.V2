const errorMiddleware = (err, req, res) => {
  console.error(err);

  const statusCode = err.statusCode || 500;

  // API routes return JSON
  if (
    req.originalUrl.startsWith("/auth") ||
    req.originalUrl.startsWith("/admin")
  ) {
    return res.status(statusCode).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }

  // Normal pages render EJS
  return res.status(statusCode).render("error", {
    message: err.message,
  });
};

export default errorMiddleware;