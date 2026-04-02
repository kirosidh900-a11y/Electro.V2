import { Router } from "express";
const router = Router();

import { validate } from "../../middlewares/validate.middleware.js";
import { offerSchema } from "../../validations/products.validator.js";

import {
  getOffers,
  createOffer,
  getTargets,
  getOfferById,
  updateOffer,
  deleteOffer,
  toggleOfferStatus,
} from "../../controllers/product/offer.controller.js";

router.route("/").get(getOffers).post(validate(offerSchema), createOffer);
router
  .route("/:id")
  .get(getOfferById)
  .patch(validate(offerSchema), updateOffer)
  .delete(deleteOffer);

router.patch("/:id/status", toggleOfferStatus);

// router.get("/api/admin/offers/targets", getTargets);

router.get("/targets", getTargets);

export default router;
