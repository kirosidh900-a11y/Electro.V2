import {
  fixCODPaymentsService,
  getMaintenanceStatsService,
} from "../../services/admin/maintenance.service.js";

export const fixCODPayments = async (req, res, next) => {
  try {
    const result = await fixCODPaymentsService();

    return res.json({
      success: true,
      message:
        result.fixed === 0
          ? "No COD orders need fixing"
          : `Fixed ${result.fixed} COD orders`,
      fixed: result.fixed,
      orders: result.orders,
    });
  } catch (error) {
    next(error);
  }
};

export const getMaintenancePage = async (req, res, next) => {
  try {
    const { codOrdersNeedingFix } = await getMaintenanceStatsService();

    return res.render("admin/maintenance/index", {
      title: "Maintenance",
      codOrdersNeedingFix,
    });
  } catch (error) {
    next(error);
  }
};
