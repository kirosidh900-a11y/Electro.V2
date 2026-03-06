const errorMiddleware = (err, req, res) => {
  console.error("Global Error:", err);

  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Something went wrong",
  });
};

export default errorMiddleware;
