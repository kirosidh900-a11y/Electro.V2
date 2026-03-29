import { errorResponse } from "../utils/partials/response.util.js";

const errorMiddleware = (err, req, res, _next) => {
  console.error(err);

  const statusCode = err.statusCode || 500;

  // API request (JSON)
  if (req.headers.accept?.includes("application/json")) {
    return errorResponse(
      res,
      err.message || "Internal Server Error",
      statusCode,
    );
  }

  // API routes
  if (
    req.originalUrl.startsWith("/auth") ||
    req.originalUrl.startsWith("/admin") ||
    req.originalUrl.startsWith("/name") ||
    req.originalUrl.startsWith("/cart") ||
    req.originalUrl.startsWith('/product')
  ) {
    return errorResponse(
      res,
      err.message || "Internal Server Error",
      statusCode,
    );
  }

  // Normal page errors
  return res.status(statusCode).render("error", {
    message: err.message || "Something went wrong",
  });
};

export default errorMiddleware;
