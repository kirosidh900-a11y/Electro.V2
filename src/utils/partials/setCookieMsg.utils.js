const setCookieMSG = (res, message) => {
  return res.cookie("toastError", message, {
    maxAge: 5000,
    httpOnly: false,
  });
};

export default setCookieMSG;
