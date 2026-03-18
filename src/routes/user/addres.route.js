import { Router } from "express";
import {
  createAddress,
  getUserAddresses,
  getSingleAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../../controllers/user/address.controller.js";

import attachUser from "../../middlewares/attachUser.middleware.js";
import { addressSchema } from "../../validations/address.validator.js";
import { validate } from "../../middlewares/validate.middleware.js";

const router = Router();



import { State, City } from "country-state-city";

// India states
const states = State.getStatesOfCountry("IN");

// Districts (cities used as districts)
const districts = City.getCitiesOfState("IN", "KL");

console.log("total states:",states);
// console.log(districts);

// Protect all routes
router.use(attachUser);

router
  .route("/")
  .post(validate(addressSchema), createAddress)
  .get(getUserAddresses);

// Update + Delete
router
  .route("/:id")
  .get(getSingleAddress)
  .patch(validate(addressSchema), updateAddress)
  .delete(deleteAddress);

// Set default address
router.route("/default/:id").patch(setDefaultAddress);

export default router;
