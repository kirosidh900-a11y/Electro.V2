import { getUserData } from "../../services/user/user.service.js";

export const showHomePage = async (req, res) => {
  let userData = null;

  if (req.user) {
    userData = await getUserData(req.user.userId);
  }

  res.render("user/home/index", {
    user: userData,
  });
};
