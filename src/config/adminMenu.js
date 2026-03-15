export const adminMenu = [
  { name: "Dashboard", icon: "fas fa-home", path: "/admin/dashboard" },

  { name: "Customers", icon: "fas fa-users", path: "/admin/customers" },

  {
    name: "Catalog",
    icon: "fas fa-box",
    children: [
      { name: "Categories", path: "/admin/category" },
      { name: "Brands", path: "/admin/brand" },
      { name: "Products", path: "/admin/products" }
    ]
  },

  { name: "Orders", icon: "fas fa-receipt", path: "/admin/orders" },
  { name: "Coupons", icon: "fas fa-ticket-alt", path: "/admin/coupons" },
  { name: "Reviews", icon: "fas fa-star", path: "/admin/reviews" },
  { name: "Settings", icon: "fas fa-cog", path: "/admin/settings" },
];