export const adminMenu = [
  { name: "Dashboard", icon: "fas fa-home", path: "/admin/dashboard" },

  { name: "Customers", icon: "fas fa-users", path: "/admin/customers" },

  {
    name: "Catalog",
    icon: "fas fa-box",
    children: [
      { name: "Categories", path: "/admin/category" },
      { name: "Brands", path: "/admin/brand" },
      { name: "Products", path: "/admin/products" },
    ],
  },

  {
    name: "Marketing",
    icon: "fas fa-bullhorn",
    children: [
      { name: "Offers", path: "/admin/offers" },
      { name: "Coupons", path: "/admin/coupons" },
      // { name: "Banners", path: "/admin/banners" },
    ],
  },

  { name: "Orders", icon: "fas fa-clipboard-list", path: "/admin/orders" },
  { name: "Reports", icon: "fas fa-chart-bar", path: "/admin/reports" },
  // { name: "Maintenance", icon: "fas fa-tools", path: "/admin/maintenance" },
  // { name: "Reviews", icon: "fas fa-star", path: "/admin/reviews" },
  // { name: "Settings", icon: "fas fa-cog", path: "/admin/settings" },
];
