import HTTP_STATUS from "../../constant/statusCode.js";

export const successResponse = (
  res,
  message,
  status = HTTP_STATUS.OK,
  data = {},
) => {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
};

export const errorResponse = (
  res,
  message,
  status = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  error = null,
) => {
  return res.status(status).json({
    success: false,
    message,
    error,
  });
};
