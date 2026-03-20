import { Router } from "express";
import {
  createAddress,
  getUserAddresses,
  getSingleAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../../controllers/user/address.controller.js";

import { addressSchema } from "../../validations/address.validator.js";
import { validate } from "../../middlewares/validate.middleware.js";
import authMiddleware from "../../middlewares/user/userAuth.middleware.js";

const router = Router();

// Protect all routes
router.use(authMiddleware);

router
  .route("/")
  .post(validate(addressSchema), createAddress)
  .get(getUserAddresses);

// Update + Delete
router
  .route("/:id")
  .get(getSingleAddress)
  .put(validate(addressSchema), updateAddress)
  .delete(deleteAddress);

// Set default address
router.route("/default/:id").patch(setDefaultAddress);

export default router;
