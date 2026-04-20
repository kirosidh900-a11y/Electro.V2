import { Router } from "express";
import { isAuth } from "../../middlewares/admin/authAdmin.middleware.js";
import {
  dashboard,
  getDashboardChartData,
  getLedgerPage,
  downloadLedgerPDF,
} from "../../controllers/admin/admin.controller.js";

const router = Router();

router.get("/",          isAuth, dashboard);
router.get("/chart",     isAuth, getDashboardChartData);
router.get("/ledger",    isAuth, getLedgerPage);
router.get("/ledger/pdf",isAuth, downloadLedgerPDF);

export default router;
