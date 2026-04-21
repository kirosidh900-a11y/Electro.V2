import { Router } from "express";
import { getMaintenancePage, fixCODPayments } from "../../controllers/admin/maintenance.controller.js";

const router = Router();

// Maintenance page
router.get("/", getMaintenancePage);

// Fix COD payments
router.post("/fix-cod-payments", fixCODPayments);

export default router;