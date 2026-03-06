import renderView from '../../utils/admin/renderView.util.js'
export const brandPage = async (req, res, next) => {
  try {
  

    // Normal page load
    res.render("admin/home/brand", {
      categories:0,
      currentPage:1,
      totalPages:10,
      title: "Brand Management",
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

