// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, _next) => {
  console.error(err);

  const statusCode = err.statusCode || 500;

  // API routes
  if (
    req.originalUrl.startsWith("/auth") ||
    req.originalUrl.startsWith("/admin")
  ) {
    return res.status(statusCode).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }

  // Normal page errors
  return res.status(statusCode).render("error", {
    message: err.message || "Something went wrong",
  });
};

export default errorMiddleware;
