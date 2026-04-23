import { Router } from "express";
import { isAuth } from "../../middlewares/admin/authAdmin.middleware.js";
import {
  getReportPage,
  getChartData,
  downloadReportExcel,
  downloadReportCSV,
  downloadReportPDF,
} from "../../controllers/admin/report.controller.js";

const router = Router();

router.get("/",            isAuth, getReportPage);
router.get("/chart-data",  isAuth, getChartData);
router.get("/excel",       isAuth, downloadReportExcel);
router.get("/csv",         isAuth, downloadReportCSV);
router.get("/pdf",         isAuth, downloadReportPDF);

// Legacy aliases so old bookmarks still work
router.get("/sales",       isAuth, (req, res) => res.redirect("/admin/reports?" + new URLSearchParams({ ...req.query, reportType: "sales" })));
router.get("/sales/pdf",   isAuth, (req, res) => res.redirect("/admin/reports/pdf?"   + new URLSearchParams({ ...req.query, reportType: "sales" })));
router.get("/sales/excel", isAuth, (req, res) => res.redirect("/admin/reports/excel?" + new URLSearchParams({ ...req.query, reportType: "sales" })));

export default router;
