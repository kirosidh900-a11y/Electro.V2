import { Router } from "express";
import {
  createAddress,
  getUserAddresses,
  getSingleAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../controllers/user/address.controller.js";

import protect from "../middlewares/auth.middleware.js";

const router = Router();

// Protect all routes
router.use(protect);

router
  .route("/")
  .post(createAddress)
  .get(getUserAddresses);
// Update + Delete
router
  .route("/:id")
  .get(getSingleAddress)
  .patch(updateAddress)
  .delete(deleteAddress);

// Set default address
router
  .route("/default/:id")
  .patch(setDefaultAddress);

export default router;