import { Router } from "express";
const router = Router();

import { validate } from "../../middlewares/validate.middleware.js";
import { offerSchema ,updateofferSchema } from "../../validations/products.validator.js";

import {
  getOffers,
  createOffer,
  getTargets,
  updateOffer,
  deleteOffer,
  toggleOfferStatus,
  getOfferById,
} from "../../controllers/product/offer.controller.js";

router.route("/").get(getOffers).post(validate(offerSchema), createOffer);

router.get("/targets", getTargets);

router
  .route("/:id")
  .get(getOfferById)
  .patch(validate(updateofferSchema), updateOffer)
  .delete(deleteOffer);

router.patch("/:id/status", toggleOfferStatus);

export default router;
