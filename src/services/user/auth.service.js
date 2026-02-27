const showLoginPage = (req, res) => {
   res.render("user/auth/login");
}

const showSignUpPage = (req, res) => {
  res.render("user/auth/signup");
}

export { showLoginPage, showSignUpPage };