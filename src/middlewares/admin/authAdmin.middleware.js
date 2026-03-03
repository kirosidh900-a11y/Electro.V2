export const authAdmin = (req, res, next) => {
  const token = req.cookies.adminToken;

  if (token) {
    return res.redirect("/admin/dashboard"); //  token → Admin Dashboard page only view
  }

  return next(); // always continue
};

export const isAuth = (req, res, next) => {
  const token = req.cookies.adminToken;
  if (!token) {
    return res.redirect("/admin");
  }
  
   return next();
};
