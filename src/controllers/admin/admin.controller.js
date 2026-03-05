
//Dashboard
export const dashboard = (req, res) => {
  let adminData = null;

  if (req.admin) {
    adminData = req.admin;
  }

  res.render("admin/home/dashboard", {
    admin: adminData,
  });
};



