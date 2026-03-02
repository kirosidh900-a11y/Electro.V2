const authMiddleware = (req, res, next) => {
  const token = req.cookies.token;

  if (token) {
    return res.redirect('/'); //  token → Home page only view
  }

  return next(); // always continue
};

export default authMiddleware; 