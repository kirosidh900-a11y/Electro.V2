import { Router } from "express";
import { isAuth } from "../../middlewares/admin/authAdmin.middleware.js";
import {
  getSalesReportPage,
  downloadSalesReportPDF,
  downloadSalesReportExcel,
} from "../../controllers/admin/report.controller.js";

const router = Router();

router.get("/sales",       isAuth, getSalesReportPage);
router.get("/sales/pdf",   isAuth, downloadSalesReportPDF);
router.get("/sales/excel", isAuth, downloadSalesReportExcel);

export default router;
