const setCookieMSG = (res, message, type = "error") => {
  return res.cookie("toast", JSON.stringify({ message, type }), {
    maxAge: 5000,
    httpOnly: false,
    sameSite: "lax",
  });
};

export default setCookieMSG;
