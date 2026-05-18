import { errorResponse } from "../utils/partials/response.util.js";

const errorMiddleware = (err, req, res, _next) => {
  console.error(err);

  const statusCode = err.statusCode || 500;

  // JSON API requests — always return JSON
  if (
    req.headers.accept?.includes("application/json") ||
    req.headers["content-type"]?.includes("application/json") ||
    req.originalUrl.startsWith("/api") ||
    req.originalUrl.startsWith("/auth") ||
    req.originalUrl.startsWith("/name") ||
    req.originalUrl.startsWith("/cart") ||
    req.originalUrl.startsWith("/product")
  ) {
    return errorResponse(res, err.message || "Internal Server Error", statusCode);
  }

  // Admin page errors — render admin-styled error page
  if (req.originalUrl.startsWith("/admin")) {
    return res.status(statusCode).render("admin/404", {
      title: statusCode === 404 ? "Page Not Found" : "Something Went Wrong",
    });
  }

  // User page errors
  return res.status(statusCode).render("error", {
    message: err.message || "Something went wrong",
  });
};

export default errorMiddleware;
